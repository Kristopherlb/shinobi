/**
 * MCP Server Component
 *
 * Model Context Protocol server that powers the platform intelligence surface.
 * The component consumes the resolved configuration produced by the shared
 * ConfigBuilder and never inspects the compliance framework directly.
 */

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@shinobi/core';
import {
  McpServerConfig,
  McpServerComponentConfigBuilder
} from './mcp-server.builder';

export class McpServerComponent extends BaseComponent {
  private cluster?: ecs.Cluster;
  private service?: ecs.FargateService;
  private taskDefinition?: ecs.FargateTaskDefinition;
  private loadBalancer?: elbv2.ApplicationLoadBalancer;
  private repository?: ecr.Repository;
  private logGroup?: logs.LogGroup;
  private config?: McpServerConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting MCP server synthesis');

    try {
      this.config = new McpServerComponentConfigBuilder({
        context: this.context,
        spec: this.spec
      }).buildSync();

      this.createEcrRepository();
      this.createEcsCluster();
      this.createLogGroup();
      this.createTaskDefinition();
      this.createEcsService();

      const loadBalancerEnabled = this.resolveBoolean(this.config?.loadBalancer?.enabled, true);
      if (loadBalancerEnabled) {
        this.createLoadBalancer();
      }

      this.registerConstruct('main', this.service!);
      this.registerConstruct('cluster', this.cluster!);
      this.registerConstruct('service', this.service!);
      this.registerConstruct('taskDefinition', this.taskDefinition!);
      this.registerConstruct('repository', this.repository!);

      if (this.loadBalancer) {
        this.registerConstruct('loadBalancer', this.loadBalancer);
      }

      if (this.logGroup) {
        this.registerConstruct('logGroup', this.logGroup);
      }

      this.registerCapability('api:rest', this.buildApiCapability());
      this.registerCapability('container:ecs', this.buildContainerCapability());

      this.configureObservability();

      this.logComponentEvent('synthesis_complete', 'MCP server synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'MCP server synthesis');
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'mcp-server';
  }

  private createEcrRepository(): void {
    const repositoryName = this.config?.ecrRepository ?? `${this.context.serviceName}-mcp-server`;

    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      imageScanningConfiguration: { scanOnPush: true },
      lifecycleRules: [
        {
          rulePriority: 1,
          description: 'Retain most recent 10 images',
          maxImageCount: 10
        }
      ]
    });

    this.applyStandardTags(this.repository, {
      'resource-type': 'ecr-repository',
      component: 'mcp-server'
    });

    this.logResourceCreation('ecr-repository', repositoryName);
  }

  private createEcsCluster(): void {
    const vpcConfig = this.config?.vpc;

    let vpc: ec2.IVpc;
    if (vpcConfig?.vpcId) {
      vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
        vpcId: vpcConfig.vpcId
      });
    } else if (this.context.vpc) {
      vpc = this.context.vpc;
    } else {
      vpc = new ec2.Vpc(this, 'Vpc', {
        maxAzs: 3,
        natGateways: 1,
        enableDnsHostnames: true,
        enableDnsSupport: true
      });
    }

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: `${this.context.serviceName}-mcp-cluster`
    });

    this.applyStandardTags(this.cluster, {
      'resource-type': 'ecs-cluster',
      component: 'mcp-server'
    });

    this.logResourceCreation('ecs-cluster', this.cluster.clusterName);
  }

  private createLogGroup(): void {
    const retentionDays = this.resolveNumber(this.config?.logging?.retentionDays, 30);

    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/ecs/${this.context.serviceName}/mcp-server`,
      retention: this.mapLogRetentionDays(retentionDays),
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    this.applyStandardTags(this.logGroup, {
      'resource-type': 'log-group',
      component: 'mcp-server'
    });
  }

  private createTaskDefinition(): void {
    const container = this.config?.container ?? {};
    const cpu = this.resolveNumber(container.cpu, 256);
    const memory = this.resolveNumber(container.memory, 512);
    const containerPort = this.resolveNumber(container.containerPort, 8080);
    const logLevel = this.config?.logging?.logLevel ?? 'INFO';
    const imageTag = container.imageTag ?? 'latest';

    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      cpu,
      memoryLimitMiB: memory,
      family: `${this.context.serviceName}-mcp-server`
    });

    this.taskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'codecommit:GitPull',
        'codecommit:GetRepository',
        'codecommit:ListRepositories',
        'ec2:Describe*',
        'lambda:List*',
        'lambda:Get*',
        'rds:Describe*',
        's3:List*',
        's3:GetBucket*',
        'sns:List*',
        'sns:GetTopic*',
        'sqs:List*',
        'sqs:GetQueue*',
        'ecs:Describe*',
        'ecs:List*',
        'secretsmanager:GetSecretValue',
        'cloudformation:Describe*',
        'cloudformation:List*'
      ],
      resources: ['*']
    }));

    const crossAccountRoles = this.config?.dataSources?.aws?.crossAccountRoles ?? [];
    if (crossAccountRoles.length > 0) {
      this.taskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: crossAccountRoles
      }));
    }

    const containerDefinition = this.taskDefinition.addContainer('McpServerContainer', {
      image: ecs.ContainerImage.fromEcrRepository(this.repository!, imageTag),
      environment: {
        NODE_ENV: 'production',
        PORT: containerPort.toString(),
        SERVICE_NAME: this.context.serviceName,
        ENVIRONMENT: this.context.environment,
        LOG_LEVEL: logLevel,
        TEMPLATES_BRANCH: this.config?.dataSources?.templates?.branch ?? 'main'
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'mcp-server',
        logGroup: this.logGroup!
      }),
      healthCheck: {
        command: ['CMD-SHELL', `curl -f http://localhost:${containerPort}/admin/health || exit 1`],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60)
      }
    });

    if (this.config?.authentication?.jwtSecretArn) {
      containerDefinition.addSecret('JWT_SECRET', ecs.Secret.fromSecretsManager(
        secretsmanager.Secret.fromSecretCompleteArn(
          this,
          'JwtSecret',
          this.config.authentication.jwtSecretArn
        )
      ));
    }

    containerDefinition.addPortMappings({
      containerPort,
      protocol: ecs.Protocol.TCP
    });

    this.applyStandardTags(this.taskDefinition, {
      'resource-type': 'ecs-task-definition',
      component: 'mcp-server'
    });
  }

  private createEcsService(): void {
    const container = this.config?.container ?? {};
    const desiredCount = this.resolveNumber(container.taskCount, 1);
    const enableExec = this.resolveBoolean(this.config?.enableExecuteCommand, true);

    this.service = new ecs.FargateService(this, 'Service', {
      cluster: this.cluster!,
      taskDefinition: this.taskDefinition!,
      serviceName: `${this.context.serviceName}-mcp-server`,
      desiredCount,
      platformVersion: ecs.FargatePlatformVersion.LATEST,
      enableExecuteCommand: enableExec,
      assignPublicIp: false
    });

    const scalableTarget = this.service.autoScaleTaskCount({
      minCapacity: desiredCount,
      maxCapacity: desiredCount * 3
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(1)
    });

    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(1)
    });

    this.applyStandardTags(this.service, {
      'resource-type': 'ecs-service',
      component: 'mcp-server'
    });

    this.logResourceCreation('ecs-service', this.service.serviceName);
  }

  private createLoadBalancer(): void {
    if (!this.cluster) {
      throw new Error('ECS cluster must be available before creating the load balancer');
    }

    const loadBalancerConfig = this.config?.loadBalancer;
    const containerPort = this.resolveNumber(this.config?.container?.containerPort, 8080);
    const internetFacing = this.resolveBoolean(loadBalancerConfig?.internetFacing, false);

    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: this.cluster.vpc,
      internetFacing,
      loadBalancerName: `${this.context.serviceName}-mcp-alb`
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc: this.cluster.vpc,
      port: containerPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        enabled: true,
        path: '/admin/health',
        port: containerPort.toString(),
        protocol: elbv2.Protocol.HTTP,
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3
      }
    });

    this.service!.attachToApplicationTargetGroup(targetGroup);

    const certificateArn = loadBalancerConfig?.certificateArn;
    if (certificateArn) {
      this.loadBalancer.addListener('HttpsListener', {
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [elbv2.ListenerCertificate.fromArn(certificateArn)],
        defaultTargetGroups: [targetGroup]
      });

      this.loadBalancer.addListener('HttpListener', {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        defaultAction: elbv2.ListenerAction.redirect({
          protocol: elbv2.ApplicationProtocol.HTTPS,
          port: '443'
        })
      });
    } else {
      this.loadBalancer.addListener('HttpListener', {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        defaultTargetGroups: [targetGroup]
      });
    }

    this.applyStandardTags(this.loadBalancer, {
      'resource-type': 'application-load-balancer',
      component: 'mcp-server'
    });

    this.logResourceCreation('application-load-balancer', this.loadBalancer.loadBalancerName);
  }

  private buildApiCapability(): Record<string, any> {
    const containerPort = this.resolveNumber(this.config?.container?.containerPort, 8080);

    const endpoint = this.loadBalancer
      ? `https://${this.config?.loadBalancer?.domainName ?? this.loadBalancer.loadBalancerDnsName}`
      : `http://internal:${containerPort}`;

    return {
      endpoint,
      protocol: this.loadBalancer ? 'HTTPS' : 'HTTP',
      apiType: 'REST',
      version: '1.0',
      paths: {
        '/platform/*': 'Platform-level endpoints',
        '/services/*': 'Service intelligence endpoints',
        '/platform/generate/*': 'Generative tooling',
        '/admin/*': 'Administration endpoints'
      }
    };
  }

  private buildContainerCapability(): Record<string, any> {
    const containerPort = this.resolveNumber(this.config?.container?.containerPort, 8080);

    return {
      clusterArn: this.cluster!.clusterArn,
      serviceArn: this.service!.serviceArn,
      taskDefinitionArn: this.taskDefinition!.taskDefinitionArn,
      repositoryUri: this.repository!.repositoryUri,
      imageTag: this.config?.container?.imageTag ?? 'latest',
      containerPort
    };
  }

  private configureObservability(): void {
    const monitoringEnabled = this.resolveBoolean(this.config?.monitoring?.enabled, true);
    if (!monitoringEnabled || !this.service) {
      return;
    }

    const alarms = this.config?.monitoring?.alarms ?? {};
    const cpuThreshold = this.resolveNumber(alarms?.cpuUtilization, 80);
    const memoryThreshold = this.resolveNumber(alarms?.memoryUtilization, 80);
    const responseTimeThreshold = this.resolveNumber(alarms?.responseTime, 2);

    new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
      metric: this.service.metricCpuUtilization(),
      threshold: cpuThreshold,
      evaluationPeriods: 2,
      alarmDescription: 'MCP server CPU utilization is high'
    });

    new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
      metric: this.service.metricMemoryUtilization(),
      threshold: memoryThreshold,
      evaluationPeriods: 2,
      alarmDescription: 'MCP server memory utilization is high'
    });

    const runningTaskMetric = new cloudwatch.Metric({
      namespace: 'AWS/ECS',
      metricName: 'RunningTaskCount',
      statistic: 'Average',
      period: cdk.Duration.minutes(1),
      dimensionsMap: {
        ClusterName: this.cluster!.clusterName,
        ServiceName: this.service.serviceName
      }
    });

    new cloudwatch.Alarm(this, 'TaskCountAlarm', {
      metric: runningTaskMetric,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmDescription: 'MCP server has no running tasks'
    });

    if (this.loadBalancer) {
      const responseTimeMetric = this.loadBalancer.metrics.targetResponseTime({
        period: cdk.Duration.minutes(1)
      });

      new cloudwatch.Alarm(this, 'ResponseTimeAlarm', {
        metric: responseTimeMetric,
        threshold: responseTimeThreshold,
        evaluationPeriods: 2,
        alarmDescription: 'MCP server API response time is high'
      });
    }

    this.logComponentEvent('observability_configured', 'MCP server observability configured');
  }

  private resolveNumber(value: number | string | undefined, fallback: number): number {
    if (value === undefined || value === null) {
      return fallback;
    }

    const numericValue = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  private resolveBoolean(value: boolean | undefined, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }
}
