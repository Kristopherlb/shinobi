import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct, IConstruct } from 'constructs';
import {
  BaseComponent,
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';
import {
  ContainerApplicationComponentConfigBuilder,
  ContainerApplicationConfig,
  ApplicationConfig,
  NetworkConfig
} from './container-application.builder.js';

export class ContainerApplicationComponent extends BaseComponent {
  private config!: ContainerApplicationConfig;

  private cluster?: ecs.Cluster;
  private loadBalancer?: elbv2.ApplicationLoadBalancer;
  private targetGroup?: elbv2.ApplicationTargetGroup;
  private service?: ecs.FargateService;
  private taskDefinition?: ecs.FargateTaskDefinition;
  private container?: ecs.ContainerDefinition;
  private securityGroups: ec2.ISecurityGroup[] = [];
  private loadBalancerSecurityGroup?: ec2.ISecurityGroup;
  private logGroup?: logs.LogGroup;
  private ecrRepository?: ecr.IRepository;
  private otelEnvironment: Record<string, string> = {};
  private managedServiceSecurityGroup = false;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting container application synthesis');

    try {
      const builder = new ContainerApplicationComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      const { vpc, createdVpc } = this.resolveVpc(this.config.network);
      if (createdVpc && this.config.security.enableVpcFlowLogs) {
        this.enableVpcFlowLogs(vpc);
      }

      this.securityGroups = this.resolveSecurityGroups(vpc, this.config.application);
      this.ecrRepository = this.resolveEcrRepository();

      this.cluster = this.createCluster(vpc);
      this.taskDefinition = this.createTaskDefinition();
      this.container = this.addApplicationContainer();

      this.service = this.createFargateService(vpc);
      this.configureServiceSecurity();
      this.configureServiceAutoScaling();

      this.loadBalancer = this.createLoadBalancer(vpc);
      this.targetGroup = this.createTargetGroup(vpc);
      this.attachServiceToLoadBalancer();
      this.allowAlbToServiceTraffic();
      this.configureWafAssociation();

      this.otelEnvironment = this.configureObservabilityEnvironment();
      this.createMonitoringAlarms();

      this.registerConstructs();
      this.registerComponentCapabilities(vpc);

      this.logComponentEvent('synthesis_complete', 'Container application synthesized successfully', {
        loadBalancerDnsName: this.loadBalancer?.loadBalancerDnsName
      });
    } catch (error) {
      this.logError(error as Error, 'container-application-synth');
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'container-application';
  }

  private resolveVpc(network: NetworkConfig): { vpc: ec2.IVpc; createdVpc: boolean } {
    if (this.context.vpc) {
      return { vpc: this.context.vpc, createdVpc: false };
    }

    if (network.vpcId) {
      const importedVpc = ec2.Vpc.fromLookup(this, 'ImportedVpc', {
        isDefault: false,
        vpcId: network.vpcId
      });
      return { vpc: importedVpc, createdVpc: false };
    }

    const vpc = new ec2.Vpc(this, 'ContainerVpc', {
      maxAzs: 2,
      natGateways: network.natGateways,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        }
      ]
    });

    this.tagResource(vpc, {
      'component': this.getType(),
      'subsystem': 'network'
    });

    return { vpc, createdVpc: true };
  }

  private enableVpcFlowLogs(vpc: ec2.IVpc): void {
    if (!(vpc instanceof ec2.Vpc)) {
      return;
    }

    const logGroup = new logs.LogGroup(this, 'VpcFlowLogs', {
      retention: this.mapLogRetentionDays(this.config.observability.logRetentionDays),
      removalPolicy: RemovalPolicy.RETAIN
    });

    vpc.addFlowLog('ContainerVpcFlowLogs', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup)
    });

    this.tagResource(logGroup, {
      'component': this.getType(),
      'observability': 'vpc-flow-logs'
    });
  }

  private resolveSecurityGroups(vpc: ec2.IVpc, application: ApplicationConfig): ec2.ISecurityGroup[] {
    if (this.config.network.securityGroupIds && this.config.network.securityGroupIds.length > 0) {
      this.managedServiceSecurityGroup = false;
      return this.config.network.securityGroupIds.map((sgId, index) =>
        ec2.SecurityGroup.fromSecurityGroupId(this, `ImportedSecurityGroup${index}`, sgId, {
          mutable: false
        })
      );
    }

    const securityGroup = new ec2.SecurityGroup(this, 'ContainerSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: `${application.name} container application security group`
    });

    this.tagResource(securityGroup, {
      'component': this.getType(),
      'purpose': 'service'
    });

    this.managedServiceSecurityGroup = true;
    return [securityGroup];
  }

  private resolveEcrRepository(): ecr.IRepository {
    if (!this.config.ecr.createRepository) {
      if (!this.config.ecr.repositoryArn) {
        throw new Error('ecr.repositoryArn must be provided when createRepository is false');
      }

      return ecr.Repository.fromRepositoryArn(this, 'ImportedRepository', this.config.ecr.repositoryArn);
    }

    const repository = new ecr.Repository(this, 'ContainerRepository', {
      repositoryName: `${this.context.serviceName}-${this.config.application.name}`,
      imageScanOnPush: this.config.ecr.imageScanOnPush,
      encryption: this.config.security.enableEncryption ? ecr.RepositoryEncryption.KMS : ecr.RepositoryEncryption.AES_256,
      lifecycleRules: [
        {
          description: 'Retain recent images only',
          maxImageCount: this.config.ecr.maxImageCount
        }
      ]
    });

    this.tagResource(repository, {
      'component': this.getType(),
      'resource-type': 'ecr-repository'
    });

    return repository;
  }

  private createCluster(vpc: ec2.IVpc): ecs.Cluster {
    const cluster = new ecs.Cluster(this, 'ContainerCluster', {
      vpc,
      containerInsights: true,
      clusterName: `${this.context.serviceName}-${this.spec.name}-cluster`
    });

    this.tagResource(cluster, {
      'component': this.getType(),
      'resource-type': 'ecs-cluster'
    });

    return cluster;
  }

  private createTaskDefinition(): ecs.FargateTaskDefinition {
    if (!this.ecrRepository) {
      throw new Error('ECR repository must be resolved before creating the task definition');
    }

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'ContainerTaskDefinition', {
      family: `${this.context.serviceName}-${this.spec.name}`,
      cpu: this.config.service.cpu,
      memoryLimitMiB: this.config.service.memory
    });

    this.tagResource(taskDefinition, {
      'component': this.getType(),
      'resource-type': 'ecs-task-definition'
    });

    return taskDefinition;
  }

  private addApplicationContainer(): ecs.ContainerDefinition {
    if (!this.taskDefinition || !this.ecrRepository) {
      throw new Error('Task definition and repository must be initialised before adding the container');
    }

    const container = this.taskDefinition.addContainer('ApplicationContainer', {
      image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository),
      containerName: this.config.application.name,
      portMappings: [
        {
          containerPort: this.config.application.port,
          protocol: ecs.Protocol.TCP
        }
      ],
      environment: {
        PORT: this.config.application.port.toString(),
        ...this.config.application.environment
      },
      secrets: this.createContainerSecrets(),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: this.createApplicationLogGroup(),
        streamPrefix: this.config.application.name
      }),
      healthCheck: {
        command: this.config.service.healthCheck.command,
        interval: Duration.seconds(this.config.service.healthCheck.interval),
        timeout: Duration.seconds(this.config.service.healthCheck.timeout),
        retries: this.config.service.healthCheck.retries,
        startPeriod: Duration.seconds(this.config.service.healthCheck.startPeriod)
      }
    });

    return container;
  }

  private createApplicationLogGroup(): logs.LogGroup {
    if (this.logGroup) {
      return this.logGroup;
    }

    const logGroup = new logs.LogGroup(this, 'ApplicationLogGroup', {
      logGroupName: `/aws/ecs/${this.context.serviceName}/${this.config.application.name}`,
      retention: this.mapLogRetentionDays(this.config.observability.logRetentionDays),
      removalPolicy: RemovalPolicy.RETAIN
    });

    this.tagResource(logGroup, {
      'component': this.getType(),
      'resource-type': 'log-group',
      'log-purpose': 'application'
    });

    this.logGroup = logGroup;
    return logGroup;
  }

  private createContainerSecrets(): Record<string, ecs.Secret> {
    const secrets: Record<string, ecs.Secret> = {};

    Object.entries(this.config.application.secrets).forEach(([envName, secretId]) => {
      secrets[envName] = ecs.Secret.fromSecretsManager(
        secretsmanager.Secret.fromSecretNameV2(this, `Secret-${envName}`, secretId)
      );
    });

    return secrets;
  }

  private createFargateService(vpc: ec2.IVpc): ecs.FargateService {
    if (!this.cluster || !this.taskDefinition) {
      throw new Error('Cluster and task definition must be ready before creating the service');
    }

    const subnetSelection = this.buildServiceSubnetSelection(vpc, this.config.network);

    const service = new ecs.FargateService(this, 'ContainerService', {
      serviceName: `${this.context.serviceName}-${this.spec.name}`,
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: this.config.service.desiredCount,
      assignPublicIp: this.config.network.assignPublicIp,
      securityGroups: this.securityGroups,
      vpcSubnets: subnetSelection,
      enableExecuteCommand: true,
      healthCheckGracePeriod: Duration.seconds(60)
    });

    this.tagResource(service, {
      'component': this.getType(),
      'resource-type': 'ecs-service'
    });

    return service;
  }

  private buildServiceSubnetSelection(vpc: ec2.IVpc, network: NetworkConfig): ec2.SubnetSelection {
    if (network.subnetIds && network.subnetIds.length > 0) {
      const subnets = network.subnetIds.map((id, index) =>
        ec2.Subnet.fromSubnetId(this, `ContainerSubnet${index}`, id)
      );
      return { subnets };
    }

    return { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS };
  }

  private configureServiceSecurity(): void {
    if (!this.service) {
      return;
    }

    this.securityGroups.forEach((group) => {
      this.service?.connections.addSecurityGroup(group);
    });
  }

  private createLoadBalancer(vpc: ec2.IVpc): elbv2.ApplicationLoadBalancer {
    const loadBalancerSecurityGroup = new ec2.SecurityGroup(this, 'ContainerAlbSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: `${this.spec.name} load balancer security group`
    });

    if (this.config.network.loadBalancerScheme === 'internet-facing') {
      loadBalancerSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(this.config.loadBalancer.port), 'Allow inbound HTTP');
      if (this.config.loadBalancer.sslCertificateArn) {
        loadBalancerSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow inbound HTTPS');
      }
    }

    this.loadBalancerSecurityGroup = loadBalancerSecurityGroup;

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ContainerAlb', {
      vpc,
      internetFacing: this.config.network.loadBalancerScheme === 'internet-facing',
      loadBalancerName: `${this.context.serviceName}-${this.spec.name}-alb`,
      vpcSubnets: this.buildAlbSubnetSelection(vpc, this.config.network),
      securityGroup: loadBalancerSecurityGroup
    });

    this.tagResource(loadBalancer, {
      'component': this.getType(),
      'resource-type': 'application-load-balancer'
    });

    return loadBalancer;
  }

  private buildAlbSubnetSelection(vpc: ec2.IVpc, network: NetworkConfig): ec2.SubnetSelection {
    if (network.subnetIds && network.subnetIds.length > 0) {
      const subnets = network.subnetIds.map((id, index) =>
        ec2.Subnet.fromSubnetId(this, `AlbSubnet${index}`, id)
      );
      return { subnets };
    }

    return {
      subnetType: network.loadBalancerScheme === 'internet-facing'
        ? ec2.SubnetType.PUBLIC
        : ec2.SubnetType.PRIVATE_WITH_EGRESS
    };
  }

  private createTargetGroup(vpc: ec2.IVpc): elbv2.ApplicationTargetGroup {
    if (!this.service) {
      throw new Error('Service must be created before attaching target group');
    }

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'ContainerTargetGroup', {
      vpc,
      targetType: elbv2.TargetType.IP,
      port: this.config.application.port,
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: {
        enabled: true,
        path: this.config.service.healthCheck.path,
        protocol: elbv2.Protocol.HTTP,
        healthyThresholdCount: this.config.service.healthCheck.healthyThresholdCount,
        unhealthyThresholdCount: this.config.service.healthCheck.unhealthyThresholdCount,
        interval: Duration.seconds(this.config.service.healthCheck.interval),
        timeout: Duration.seconds(this.config.service.healthCheck.timeout)
      }
    });

    this.tagResource(targetGroup, {
      'component': this.getType(),
      'resource-type': 'target-group'
    });

    return targetGroup;
  }

  private attachServiceToLoadBalancer(): void {
    if (!this.service || !this.loadBalancer || !this.targetGroup) {
      return;
    }

    this.service.attachToApplicationTargetGroup(this.targetGroup);

    const httpListener = this.loadBalancer.addListener('HttpListener', {
      port: this.config.loadBalancer.port,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [this.targetGroup]
    });

    this.tagResource(httpListener, {
      'component': this.getType(),
      'listener-protocol': 'HTTP'
    });

    if (this.config.loadBalancer.sslCertificateArn) {
      const httpsListener = this.loadBalancer.addListener('HttpsListener', {
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [elbv2.ListenerCertificate.fromArn(this.config.loadBalancer.sslCertificateArn)],
        defaultTargetGroups: [this.targetGroup]
      });

      this.tagResource(httpsListener, {
        'component': this.getType(),
        'listener-protocol': 'HTTPS'
      });
    }
  }

  private configureServiceAutoScaling(): void {
    if (!this.service || !this.config.service.autoScaling.enabled) {
      return;
    }

    const scaling = this.service.autoScaleTaskCount({
      minCapacity: this.config.service.desiredCount,
      maxCapacity: this.config.service.autoScaling.maxCapacity
    });

    scaling.scaleOnCpuUtilization('CpuTargetTracking', {
      targetUtilizationPercent: this.config.service.autoScaling.cpuTarget,
      scaleInCooldown: Duration.minutes(5),
      scaleOutCooldown: Duration.minutes(2)
    });

    scaling.scaleOnMemoryUtilization('MemoryTargetTracking', {
      targetUtilizationPercent: this.config.service.autoScaling.memoryTarget,
      scaleInCooldown: Duration.minutes(5),
      scaleOutCooldown: Duration.minutes(2)
    });
  }

  private configureObservabilityEnvironment(): Record<string, string> {
    if (!this.service || !this.container || !this.config.observability.enabled) {
      return {};
    }

    const otelEnv = this.configureObservability(this.service, {
      serviceName: `${this.context.serviceName}-${this.spec.name}`,
      customAttributes: {
        'component.type': this.getType(),
        'load-balancer.dns': this.loadBalancer?.loadBalancerDnsName ?? 'unknown',
        'ecs.cluster': this.cluster?.clusterName ?? 'unknown'
      }
    });

    Object.entries(otelEnv).forEach(([key, value]) => {
      this.container?.addEnvironment(key, value);
    });

    return otelEnv;
  }

  private createMonitoringAlarms(): void {
    if (!this.service || !this.config.observability.enabled) {
      return;
    }

    const cpuAlarm = new cloudwatch.Alarm(this, 'CpuHighAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-cpu-high`,
      metric: this.service.metricCpuUtilization(),
      threshold: this.config.observability.cpuThreshold,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.tagResource(cpuAlarm, {
      'component': this.getType(),
      'alarm-type': 'cpu-utilization'
    });

    const memoryAlarm = new cloudwatch.Alarm(this, 'MemoryHighAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-memory-high`,
      metric: this.service.metricMemoryUtilization(),
      threshold: this.config.observability.memoryThreshold,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.tagResource(memoryAlarm, {
      'component': this.getType(),
      'alarm-type': 'memory-utilization'
    });
  }

  private registerConstructs(): void {
    if (this.cluster) {
      this.registerConstruct('cluster', this.cluster);
    }

    if (this.service) {
      this.registerConstruct('service', this.service);
    }

    if (this.taskDefinition) {
      this.registerConstruct('taskDefinition', this.taskDefinition);
    }

    if (this.loadBalancer) {
      this.registerConstruct('loadBalancer', this.loadBalancer);
    }

    if (this.targetGroup) {
      this.registerConstruct('targetGroup', this.targetGroup);
    }

    if (this.logGroup) {
      this.registerConstruct('applicationLogs', this.logGroup);
    }

    if (this.ecrRepository && (this.ecrRepository as any).node) {
      const repositoryNode = (this.ecrRepository as any).node as Construct;
      const child = (repositoryNode as any).defaultChild as Construct | undefined;
      this.registerConstruct('repository', child ?? repositoryNode);
    }
  }

  private registerComponentCapabilities(vpc: ec2.IVpc): void {
    if (this.loadBalancer) {
      this.registerCapability('service:connect', {
        dnsName: this.loadBalancer.loadBalancerDnsName,
        port: this.config.loadBalancer.port,
        sgId: this.getPrimarySecurityGroupId()
      });
    }

    if (vpc instanceof ec2.Vpc) {
      this.registerCapability('net:vpc', {
        vpcId: vpc.vpcId,
        publicSubnetIds: vpc.publicSubnets.map((subnet) => subnet.subnetId),
        privateSubnetIds: vpc.privateSubnets.map((subnet) => subnet.subnetId),
        isolatedSubnetIds: vpc.isolatedSubnets.map((subnet) => subnet.subnetId)
      });
    }

    if (Object.keys(this.otelEnvironment).length > 0) {
      this.registerCapability('otel:environment', this.otelEnvironment);
    }
  }

  private getPrimarySecurityGroupId(): string {
    const primary = this.securityGroups[0];
    return primary ? primary.securityGroupId : 'unknown';
  }

  private tagResource(resource: IConstruct, tags: Record<string, string>): void {
    this.applyStandardTags(resource, {
      ...this.config.tags,
      ...tags
    });
  }

  private allowAlbToServiceTraffic(): void {
    if (!this.service || !this.loadBalancerSecurityGroup) {
      return;
    }

    if (!this.managedServiceSecurityGroup) {
      return;
    }

    this.securityGroups.forEach((serviceSg) => {
      serviceSg.addIngressRule(
        this.loadBalancerSecurityGroup!,
        ec2.Port.tcp(this.config.application.port),
        'Allow load balancer traffic'
      );
    });
  }

  private configureWafAssociation(): void {
    if (!this.loadBalancer || !this.config.security.enableWaf) {
      return;
    }

    if (!this.config.security.webAclArn) {
      throw new Error('security.webAclArn must be provided when security.enableWaf is true');
    }

    new wafv2.CfnWebACLAssociation(this, 'ContainerAlbWafAssociation', {
      resourceArn: this.loadBalancer.loadBalancerArn,
      webAclArn: this.config.security.webAclArn
    });
  }
}
