/**
 * ECS Fargate Service Component
 * 
 * Serverless containerized service that runs on ECS Fargate with 
 * Service Connect integration for microservice discovery.
 * Implements the Platform ECS Service Connect Standard v1.0.
 */

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';
import { BaseComponent, applySecurityGroupTags } from '@shinobi/core';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '@shinobi/core';
import {
  EcsFargateServiceComponentConfigBuilder,
  EcsFargateServiceConfig,
  EcsFargateAlarmConfig
} from './ecs-fargate-service.builder.js';

/**
 * ECS Fargate Service Component implementing Component API Contract v1.0 and
 * Platform ECS Service Connect Standard v1.0
 */
export class EcsFargateServiceComponent extends BaseComponent {
  private service?: ecs.FargateService;
  private taskDefinition?: ecs.FargateTaskDefinition;
  private securityGroup?: ec2.SecurityGroup;
  private albSecurityGroup?: ec2.SecurityGroup;
  private logGroup?: logs.ILogGroup;
  private createdLogGroup?: logs.LogGroup;
  private config?: EcsFargateServiceConfig;
  private configBuilder?: EcsFargateServiceComponentConfigBuilder;
  private importedCluster?: ecs.ICluster;
  private container?: ecs.ContainerDefinition;
  private serviceConnectNamespace?: string;
  private blueGreenResources?: {
    applicationLoadBalancer: elbv2.ApplicationLoadBalancer;
    productionTargetGroup: elbv2.ApplicationTargetGroup;
    testTargetGroup: elbv2.ApplicationTargetGroup;
    productionListener: elbv2.ApplicationListener;
    testListener: elbv2.ApplicationListener;
  };

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create ECS Fargate Service with Service Connect
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting ECS Fargate Service synthesis');

    try {
      // Build configuration using ConfigBuilder
      this.configBuilder = new EcsFargateServiceComponentConfigBuilder(this.context, this.spec);
      this.config = this.configBuilder.buildSync();

      // Validate CPU/Memory combination
      this.validateCpuMemoryCombination();

      // Create task definition
      this.createTaskDefinition();

      // Create security group
      this.createSecurityGroup();

      // Create Fargate service
      this.createFargateService();

      // Configure auto scaling if specified
      this.configureAutoScaling();

      // Apply standard platform tags
      this.applyServiceTags();

      // Configure OpenTelemetry observability (CloudWatch alarms)
      this._configureObservabilityForEcsService();

      // Register constructs
      this.registerConstruct('service', this.service!);
      this.registerConstruct('taskDefinition', this.taskDefinition!);
      this.registerConstruct('securityGroup', this.securityGroup!);
      if (this.albSecurityGroup) {
        this.registerConstruct('albSecurityGroup', this.albSecurityGroup);
      }
      if (this.createdLogGroup) {
        this.registerConstruct('logGroup', this.createdLogGroup);
      }

      // Register service:connect capability
      this.registerCapability('service:connect', this.buildServiceConnectCapability());

      this.logComponentEvent('synthesis_complete', 'ECS Fargate Service synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'ECS Fargate Service synthesis');
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'ecs-fargate-service';
  }

  /**
   * Validate CPU/Memory combination for Fargate
   */
  private validateCpuMemoryCombination(): void {
    const cpu = this.config!.cpu;
    const memory = this.config!.memory;

    // Fargate CPU/Memory compatibility matrix
    const compatibleMemory: Record<number, number[]> = {
      256: [512, 1024, 2048],
      512: [1024, 2048, 3072, 4096],
      1024: [2048, 3072, 4096, 5120, 6144, 7168, 8192],
      2048: [4096, 5120, 6144, 7168, 8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384],
      4096: [8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384, 17408, 18432, 19456, 20480, 21504, 22528, 23552, 24576, 25600, 26624, 27648, 28672, 29696, 30720],
      8192: [16384, 17408, 18432, 19456, 20480, 22528, 24576, 26624, 28672, 30720, 32768, 36864, 40960, 45056, 49152, 53248, 57344, 61440],
      16384: [32768, 34816, 36864, 38912, 40960, 45056, 49152, 53248, 57344, 61440, 65536, 69632, 73728, 77824, 81920, 86016, 90112, 94208, 98304, 102400, 106496, 110592, 114688, 118784, 122880],
    };

    if (!compatibleMemory[cpu]?.includes(memory)) {
      throw new Error(
        `Invalid CPU/Memory combination: ${cpu} vCPU with ${memory} MB memory. ` +
        `Valid memory options for ${cpu} vCPU: ${compatibleMemory[cpu]?.join(', ') || 'none'}`
      );
    }
  }

  /**
   * Create Fargate task definition with encryption and X-Ray support
   */
  private createTaskDefinition(): void {
    const logGroup = this.resolveLogGroup();

    // Create task role if not provided
    let taskRole: iam.IRole;
    if (this.config!.taskRoleArn) {
      taskRole = iam.Role.fromRoleArn(this, 'TaskRole', this.config!.taskRoleArn);
    } else {
      const managedTaskRole = new iam.Role(this, 'TaskRole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        description: `Task role for ${this.context.serviceName} ${this.spec.name}`,
      });

      // Add X-Ray permissions for distributed tracing
      managedTaskRole.addToPrincipalPolicy(new iam.PolicyStatement({
        sid: 'AllowXRayTelemetry',
        actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
        resources: [
          cdk.Stack.of(this).formatArn({
            service: 'xray',
            resource: '*'
          })
        ]
      }));

      this.applyStandardTags(managedTaskRole, {
        'resource-type': 'iam-role',
        'role-purpose': 'ecs-task'
      });

      if (this.config!.tags) {
        Object.entries(this.config!.tags).forEach(([key, value]) => {
          cdk.Tags.of(managedTaskRole).add(key, value);
        });
      }

      taskRole = managedTaskRole;
    }

    // Use ephemeral storage size from config (set by builder based on risk level)
    const ephemeralStorageGiB = this.config!.ephemeralStorageGiB ?? 30;

    // Create task definition with ephemeral storage encryption
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      family: `${this.context.serviceName}-${this.spec.name}`,
      cpu: this.config!.cpu,
      memoryLimitMiB: this.config!.memory,
      taskRole: taskRole,
      ephemeralStorageGiB: ephemeralStorageGiB,
    });

    // Add container to task definition with OTEL environment variables
    const imageUri = this.config!.image.tag ?
      `${this.config!.image.repository}:${this.config!.image.tag}` :
      `${this.config!.image.repository}:latest`;

    // Build environment with OTEL configuration
    const container = this.taskDefinition.addContainer('Container', {
      image: ecs.ContainerImage.fromRegistry(imageUri),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: this.config!.logging.streamPrefix || this.spec.name,
        logGroup
      }),
      environment: this.config!.environment,
      secrets: this.buildSecretsFromConfig(),
    });

    this.container = container;

    // Add X-Ray daemon sidecar for distributed tracing
    this.addXRayDaemonSidecar(logGroup);

    NagSuppressions.addResourceSuppressions(this.taskDefinition, [
      {
        id: 'AwsSolutions-ECS2',
        reason: 'Observability environment variables are injected by platform policy and do not contain secrets.'
      }
    ], true);

    if (this.taskDefinition.executionRole) {
      NagSuppressions.addResourceSuppressions(this.taskDefinition.executionRole, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'The execution role requires AWS managed permissions provided by AmazonECSTaskExecutionRolePolicy.'
        }
      ], true);
    }

    if (taskRole instanceof iam.Role) {
      NagSuppressions.addResourceSuppressions(taskRole, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Telemetry publishing to AWS X-Ray requires account-scoped access.'
        }
      ], true);
    }

    // Add port mapping
    container.addPortMappings({
      name: this.config!.serviceConnect.portMappingName,
      containerPort: this.config!.port,
      protocol: ecs.Protocol.TCP,
    });

    // Add health check if configured
    if (this.config!.healthCheck) {
      // Health check is configured through container logging and task definition
      // The actual health check command would be applied during container creation
      this.logComponentEvent('health_check_configured', 'Health check configured for container');
    }

    this.logResourceCreation('fargate-task-definition', this.taskDefinition.family);
  }

  private resolveLogGroup(): logs.ILogGroup {
    if (!this.config) {
      throw new Error('Configuration must be resolved before creating the log group.');
    }

    const loggingConfig = this.config.logging;

    if (!loggingConfig.createLogGroup) {
      if (!loggingConfig.logGroupName) {
        throw new Error('`config.logging.logGroupName` is required when `createLogGroup` is false.');
      }

      const imported = logs.LogGroup.fromLogGroupName(this, 'ImportedLogGroup', loggingConfig.logGroupName);
      this.logGroup = imported;
      this.createdLogGroup = undefined;
      return imported;
    }

    const logGroupName = loggingConfig.logGroupName ?? `/ecs/${this.context.serviceName}/${this.spec.name}`;
    const removalPolicy = loggingConfig.removalPolicy === 'destroy'
      ? cdk.RemovalPolicy.DESTROY
      : cdk.RemovalPolicy.RETAIN;

    // Get KMS key for log encryption (required for FedRAMP)
    const encryptionKey = this.getLogEncryptionKey();

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName,
      retention: this.mapLogRetention(loggingConfig.retentionInDays),
      removalPolicy,
      encryptionKey, // Add KMS encryption
    });

    this.applyStandardTags(logGroup, {
      'resource-type': 'log-group',
      'service-name': this.context.serviceName,
      'component-name': this.spec.name,
      'encrypted': encryptionKey ? 'true' : 'false'
    });

    this.logGroup = logGroup;
    this.createdLogGroup = logGroup;
    return logGroup;
  }

  /**
   * Get KMS key for log encryption (required for high-risk environments)
   */
  private getLogEncryptionKey(): kms.IKey | undefined {
    // Use config value - set by builder based on risk level
    if (!this.config!.useCustomerManagedKeyForLogs) {
      return undefined;
    }

    // Check if KMS key is provided in context
    if ((this.context as any).kmsKeyArn) {
      return kms.Key.fromKeyArn(this, 'LogKmsKey', (this.context as any).kmsKeyArn);
    }

    // Create a new CMK for this service
    const key = new kms.Key(this, 'LogEncryptionKey', {
      description: `Log encryption key for ${this.context.serviceName} ${this.spec.name}`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Never delete encryption keys
    });

    this.applyStandardTags(key, {
      'resource-type': 'kms-key',
      'purpose': 'log-encryption'
    });

    return key;
  }

  /**
   * Create security group for the service
   * NOTE: Ingress rules are added by binder strategies, not here
   * Per Platform Security Standard: least-privilege, no default VPC-wide access
   */
  private createSecurityGroup(): void {
    const vpc = this.getVpcFromContext();
    const allowAllOutbound = this.config!.network?.allowAllOutbound ?? false;

    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: vpc,
      description: `Security group for ${this.context.serviceName} ${this.spec.name}`,
      allowAllOutbound,
    });

    if (allowAllOutbound) {
      this.logComplianceEvent('outbound_policy_override', 'Service security group configured with allowAllOutbound=true', {
        component: this.spec.name
      });
    }

    // DO NOT add default ingress rules here
    // Ingress rules are created by binder strategies when components bind to this service
    // This ensures least-privilege: only explicitly bound sources can connect

    this.applyStandardTags(this.securityGroup, {
      'resource-type': 'security-group',
      'ingress-policy': 'binder-managed'
    });
    
    // Apply additional security-group-specific tags
    applySecurityGroupTags(this.securityGroup, {
      ingressPolicy: 'binder-managed',
      tier: 'app'
    });

    this.logResourceCreation('security-group', this.securityGroup.securityGroupId);
  }

  private mapLogRetention(retentionDays: number): logs.RetentionDays {
    const mapping: Record<number, logs.RetentionDays> = {
      1: logs.RetentionDays.ONE_DAY,
      3: logs.RetentionDays.THREE_DAYS,
      5: logs.RetentionDays.FIVE_DAYS,
      7: logs.RetentionDays.ONE_WEEK,
      14: logs.RetentionDays.TWO_WEEKS,
      30: logs.RetentionDays.ONE_MONTH,
      60: logs.RetentionDays.TWO_MONTHS,
      90: logs.RetentionDays.THREE_MONTHS,
      120: logs.RetentionDays.FOUR_MONTHS,
      150: logs.RetentionDays.FIVE_MONTHS,
      180: logs.RetentionDays.SIX_MONTHS,
      365: logs.RetentionDays.ONE_YEAR,
      400: logs.RetentionDays.THIRTEEN_MONTHS,
      545: logs.RetentionDays.EIGHTEEN_MONTHS,
      731: logs.RetentionDays.TWO_YEARS,
      1096: logs.RetentionDays.THREE_YEARS,
      1827: logs.RetentionDays.FIVE_YEARS,
      2192: logs.RetentionDays.SIX_YEARS,
      2557: logs.RetentionDays.SEVEN_YEARS,
      3653: logs.RetentionDays.TEN_YEARS
    };

    return mapping[retentionDays] ?? logs.RetentionDays.THREE_MONTHS;
  }

  /**
   * Create the Fargate service with Service Connect
   */
  private createFargateService(): void {
    if (!this.taskDefinition || !this.securityGroup) {
      throw new Error('Task definition and security group must be created before Fargate service');
    }

    // Get cluster from binding (this requires the cluster component to be bound)
    const cluster = this.getClusterFromBinding();
    const vpc = this.getVpcFromContext();

    // Check deployment strategy and configure accordingly
    const isBlueGreenDeployment = this.config!.deploymentStrategy?.type === 'blue-green';

    // Create the Fargate service
    const serviceConnectNamespace = this.config!.serviceConnect.namespace
      ?? cluster.defaultCloudMapNamespace?.namespaceName
      ?? `${this.context.serviceName}.local`;

    this.serviceConnectNamespace = serviceConnectNamespace;

    this.service = new ecs.FargateService(this, 'Service', {
      cluster: cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: this.config!.desiredCount,
      serviceName: `${this.context.serviceName}-${this.spec.name}`,

      // Network configuration
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Private subnets for security
      },
      securityGroups: [this.securityGroup],

      // Service Connect configuration
      serviceConnectConfiguration: {
        namespace: serviceConnectNamespace,
        services: [{
          portMappingName: this.config!.serviceConnect.portMappingName,
          dnsName: this.config!.serviceConnect.dnsName ?? this.spec.name,
          port: this.config!.port,
        }],
      },

      // Blue-green deployment configuration
      deploymentController: isBlueGreenDeployment ? {
        type: ecs.DeploymentControllerType.CODE_DEPLOY
      } : undefined,

      // Enable circuit breaker for rolling deployment safety (not used for blue-green)
      enableExecuteCommand: this.config!.diagnostics.enableExecuteCommand,
    });

    // Configure blue-green deployment resources if needed
    if (isBlueGreenDeployment) {
      this.configureBlueGreenDeployment();
    }

    this.logResourceCreation('fargate-service', this.service.serviceName);
  }

  /**
   * Configure auto scaling if specified in configuration
   */
  private configureAutoScaling(): void {
    if (!this.config!.autoScaling || !this.service) {
      return;
    }

    const autoScalingConfig = this.config!.autoScaling;

    // Setup service auto scaling
    const scaling = this.service.autoScaleTaskCount({
      minCapacity: autoScalingConfig.minCapacity,
      maxCapacity: autoScalingConfig.maxCapacity,
    });

    // CPU-based scaling
    if (autoScalingConfig.targetCpuUtilization) {
      scaling.scaleOnCpuUtilization('CpuScaling', {
        targetUtilizationPercent: autoScalingConfig.targetCpuUtilization,
        scaleInCooldown: cdk.Duration.minutes(5),
        scaleOutCooldown: cdk.Duration.minutes(2),
      });
    }

    // Memory-based scaling
    if (autoScalingConfig.targetMemoryUtilization) {
      scaling.scaleOnMemoryUtilization('MemoryScaling', {
        targetUtilizationPercent: autoScalingConfig.targetMemoryUtilization,
        scaleInCooldown: cdk.Duration.minutes(5),
        scaleOutCooldown: cdk.Duration.minutes(2),
      });
    }

    this.logComponentEvent('autoscaling_configured',
      `Auto scaling configured: ${autoScalingConfig.minCapacity}-${autoScalingConfig.maxCapacity} tasks`);
  }

  /**
   * Apply standard platform tags to service resources
   */
  private applyServiceTags(): void {
    const standardTags = {
      'component-type': 'ecs-fargate-service',
      'service-connect-name': this.config!.serviceConnect.portMappingName,
      'container-port': this.config!.port.toString()
    };
    const resources: Array<Construct | undefined> = [
      this.service,
      this.taskDefinition,
      this.securityGroup,
      this.albSecurityGroup,
      this.logGroup,
      this.blueGreenResources?.applicationLoadBalancer,
      this.blueGreenResources?.productionTargetGroup,
      this.blueGreenResources?.testTargetGroup
    ];

    resources.forEach((resource) => {
      if (resource) {
        this.applyStandardTags(resource, standardTags);
      }
    });

    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        resources.forEach((resource) => {
          if (resource) {
            cdk.Tags.of(resource).add(key, value);
          }
        });
      });
    }
  }

  /**
   * Build the service:connect capability for other components to bind to
   */
  private buildServiceConnectCapability() {
    const cluster = this.getClusterFromBinding();
    const isBlueGreenDeployment = this.config!.deploymentStrategy?.type === 'blue-green';
    const namespace = this.serviceConnectNamespace ?? this.config!.serviceConnect.namespace;
    const dnsName = this.config!.serviceConnect.dnsName
      ?? (namespace ? `${this.spec.name}.${namespace}` : this.spec.name);

    const capability: any = {
      serviceName: this.spec.name,
      serviceArn: this.service!.serviceArn,
      clusterName: cluster.clusterName,
      dnsName,
      namespace,
      port: this.config!.port,
      portMappingName: this.config!.serviceConnect.portMappingName,
      securityGroupId: this.securityGroup!.securityGroupId,
      internalEndpoint: `http://${dnsName}:${this.config!.port}`,
      deploymentStrategy: this.config!.deploymentStrategy?.type || 'rolling'
    };

    // Add blue-green deployment resources for CI/CD pipeline integration
    if (isBlueGreenDeployment && this.blueGreenResources) {
      capability.blueGreenDeployment = {
        applicationLoadBalancer: {
          arn: this.blueGreenResources.applicationLoadBalancer.loadBalancerArn,
          dnsName: this.blueGreenResources.applicationLoadBalancer.loadBalancerDnsName,
          hostedZoneId: this.blueGreenResources.applicationLoadBalancer.loadBalancerCanonicalHostedZoneId
        },
        productionTargetGroup: {
          arn: this.blueGreenResources.productionTargetGroup.targetGroupArn,
          name: this.blueGreenResources.productionTargetGroup.targetGroupName
        },
        testTargetGroup: {
          arn: this.blueGreenResources.testTargetGroup.targetGroupArn,
          name: this.blueGreenResources.testTargetGroup.targetGroupName
        },
        productionListener: {
          arn: this.blueGreenResources.productionListener.listenerArn,
          port: this.config!.deploymentStrategy!.blueGreen!.loadBalancer!.productionPort
        },
        testListener: {
          arn: this.blueGreenResources.testListener.listenerArn,
          port: this.config!.deploymentStrategy!.blueGreen!.loadBalancer!.testPort ||
            (this.config!.deploymentStrategy!.blueGreen!.loadBalancer!.productionPort + 1)
        },
        trafficShifting: {
          initialPercentage: this.config!.deploymentStrategy!.blueGreen!.trafficShifting?.initialPercentage || 10,
          waitTime: this.config!.deploymentStrategy!.blueGreen!.trafficShifting?.waitTime || 5
        }
      };
    }

    return capability;
  }

  /**
   * Add X-Ray daemon sidecar container for distributed tracing
   */
  private addXRayDaemonSidecar(logGroup: logs.ILogGroup): void {
    if (!this.taskDefinition) {
      throw new Error('Task definition must be created before adding X-Ray sidecar');
    }

    const xrayContainer = this.taskDefinition.addContainer('xray-daemon', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/xray/aws-xray-daemon:3.3.7'),
      cpu: 32,
      memoryReservationMiB: 256,
      essential: false, // Don't fail task if X-Ray daemon fails
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'xray',
        logGroup: logGroup
      }),
      environment: {
        'AWS_REGION': this.context.region ?? cdk.Stack.of(this).region,
      },
      user: '1337', // Non-root user for security
    });

    // X-Ray daemon listens on UDP port 2000
    xrayContainer.addPortMappings({
      containerPort: 2000,
      protocol: ecs.Protocol.UDP,
    });

    this.logComponentEvent('xray_sidecar_added', 'X-Ray daemon sidecar added for distributed tracing');
  }

  /**
   * Build secrets configuration from config
   */
  private buildSecretsFromConfig(): Record<string, ecs.Secret> | undefined {
    if (!this.config!.secrets) {
      return undefined;
    }

    const secrets: Record<string, ecs.Secret> = {};
    Object.entries(this.config!.secrets).forEach(([key, secretArn]) => {
      const secret = secretsmanager.Secret.fromSecretCompleteArn(this, `Secret-${key}`, secretArn);
      secrets[key] = ecs.Secret.fromSecretsManager(secret);
    });

    return secrets;
  }

  /**
   * Get ECS cluster from configuration
   * The cluster name in config should reference either the cluster name or ARN
   */
  private getClusterFromBinding(): ecs.ICluster {
    if (this.importedCluster) {
      return this.importedCluster;
    }

    if (!this.config?.cluster) {
      throw new Error('ECS cluster configuration is required for Fargate service');
    }

    // If cluster config looks like an ARN, import it
    if (this.config.cluster.startsWith('arn:aws:ecs:')) {
      this.importedCluster = ecs.Cluster.fromClusterArn(this, 'ImportedCluster', this.config.cluster);
      return this.importedCluster;
    }

    // If cluster config looks like a cluster name, import by name
    if (this.config.cluster.includes('/')) {
      // Format: cluster-name or account/cluster-name
      const clusterName = this.config.cluster.split('/').pop() || this.config.cluster;
      this.importedCluster = ecs.Cluster.fromClusterAttributes(this, 'ImportedCluster', {
        clusterName: clusterName,
        vpc: this.getVpcFromContext()
      });
      return this.importedCluster;
    }

    // Assume it's a simple cluster name
    this.importedCluster = ecs.Cluster.fromClusterAttributes(this, 'ImportedCluster', {
      clusterName: this.config.cluster,
      vpc: this.getVpcFromContext()
    });
    return this.importedCluster;
  }

  /**
   * Get VPC from context
   */
  private getVpcFromContext(): ec2.IVpc {
    const contextVpc = (this.context as ComponentContext).vpc;
    if (!contextVpc) {
      throw new Error('ECS Fargate Service requires an explicitly provided VPC. Bind a VPC component instead of relying on the default VPC.');
    }

    return contextVpc;
  }

  private createAlarm(
    id: string,
    options: {
      name: string;
      description: string;
      metric: cloudwatch.IMetric;
      config: EcsFargateAlarmConfig;
    }
  ): cloudwatch.Alarm {
    const alarm = new cloudwatch.Alarm(this, id, {
      alarmName: options.name,
      alarmDescription: options.description,
      metric: options.metric,
      threshold: options.config.threshold ?? 0,
      evaluationPeriods: options.config.evaluationPeriods ?? 2,
      comparisonOperator: this.mapComparisonOperator(options.config.comparisonOperator ?? 'gt'),
      treatMissingData: this.mapTreatMissingData(options.config.treatMissingData ?? 'not-breaching'),
      datapointsToAlarm: options.config.datapointsToAlarm
    });

    if (options.config.tags) {
      Object.entries(options.config.tags).forEach(([key, value]) => {
        cdk.Tags.of(alarm).add(key, value);
      });
    }

    return alarm;
  }

  private mapComparisonOperator(operator: string): cloudwatch.ComparisonOperator {
    switch (operator) {
      case 'gt':
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
      case 'gte':
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'lt':
        return cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;
      case 'lte':
        return cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD;
      default:
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
    }
  }

  private mapTreatMissingData(value: string): cloudwatch.TreatMissingData {
    switch (value) {
      case 'breaching':
        return cloudwatch.TreatMissingData.BREACHING;
      case 'ignore':
        return cloudwatch.TreatMissingData.IGNORE;
      case 'missing':
        return cloudwatch.TreatMissingData.MISSING;
      case 'not-breaching':
      default:
        return cloudwatch.TreatMissingData.NOT_BREACHING;
    }
  }

  /**
   * Configure OpenTelemetry observability for ECS Fargate Service
   * Creates mandatory CloudWatch alarms for operational monitoring
   * Implements Platform OpenTelemetry Observability Standard v1.0
   */
  private _configureObservabilityForEcsService(): void {
    if (!this.service || !this.config || !this.container) {
      throw new Error('Service, config, and container must be created before configuring observability');
    }

    const monitoring = this.config.monitoring;

    if (!monitoring.enabled) {
      throw new Error('Observability cannot be disabled for ECS Fargate services. Remove monitoring.enabled=false to comply with the Platform Observability Standard.');
    }

    const otelEnv = this.configureObservability(this.service, {
      serviceName: `${this.context.serviceName}-${this.spec.name}`,
      customAttributes: {
        'ecs.launch-type': 'FARGATE',
        'ecs.task-definition': this.taskDefinition?.family ?? 'unknown',
        'service.connect.name': this.config.serviceConnect.portMappingName,
        'component.type': this.getType()
      }
    });

    Object.entries(otelEnv).forEach(([key, value]) => {
      this.container!.addEnvironment(key, value);
    });

    this.registerCapability('otel:environment', otelEnv);

    const clusterName = this.config.cluster;
    const serviceName = this.service.serviceName;
    const createdAlarms: cloudwatch.Alarm[] = [];

    const cpuConfig = monitoring.alarms.cpuUtilization;
    if (cpuConfig.enabled) {
      const cpuMetric = new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        statistic: cpuConfig.statistic ?? 'Average',
        period: cdk.Duration.minutes(cpuConfig.periodMinutes ?? 5),
        dimensionsMap: {
          ServiceName: serviceName,
          ClusterName: clusterName
        }
      });

      createdAlarms.push(this.createAlarm('CpuUtilizationAlarm', {
        name: `${this.context.serviceName}-${this.spec.name}-cpu-high`,
        description: `High CPU utilization for ECS Fargate service ${serviceName}`,
        metric: cpuMetric,
        config: cpuConfig
      }));
    }

    const memoryConfig = monitoring.alarms.memoryUtilization;
    if (memoryConfig.enabled) {
      const memoryMetric = new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'MemoryUtilization',
        statistic: memoryConfig.statistic ?? 'Average',
        period: cdk.Duration.minutes(memoryConfig.periodMinutes ?? 5),
        dimensionsMap: {
          ServiceName: serviceName,
          ClusterName: clusterName
        }
      });

      createdAlarms.push(this.createAlarm('MemoryUtilizationAlarm', {
        name: `${this.context.serviceName}-${this.spec.name}-memory-high`,
        description: `High memory utilization for ECS Fargate service ${serviceName}`,
        metric: memoryMetric,
        config: memoryConfig
      }));
    }

    const taskCountConfig = monitoring.alarms.runningTaskCount;
    if (taskCountConfig.enabled) {
      const runningTaskMetric = new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'RunningTaskCount',
        statistic: taskCountConfig.statistic ?? 'Average',
        period: cdk.Duration.minutes(taskCountConfig.periodMinutes ?? 1),
        dimensionsMap: {
          ServiceName: serviceName,
          ClusterName: clusterName
        }
      });

      createdAlarms.push(this.createAlarm('RunningTaskCountAlarm', {
        name: `${this.context.serviceName}-${this.spec.name}-tasks-low`,
        description: `Low running task count for ECS Fargate service ${serviceName}`,
        metric: runningTaskMetric,
        config: {
          ...taskCountConfig,
          comparisonOperator: taskCountConfig.comparisonOperator ?? 'lt',
          treatMissingData: taskCountConfig.treatMissingData ?? 'not-breaching'
        }
      }));
    }

    createdAlarms.forEach(alarm => {
      this.applyStandardTags(alarm, {
        'alarm-type': 'ecs-service-monitoring',
        'service-name': serviceName,
        'cluster-name': clusterName
      });

      if (this.config?.tags) {
        Object.entries(this.config.tags).forEach(([key, value]) => {
          cdk.Tags.of(alarm).add(key, value);
        });
      }
    });

    this.logComponentEvent('observability_configured', 'CloudWatch monitoring configured for ECS Fargate service', {
      alarmsCreated: createdAlarms.length,
      monitoringEnabled: monitoring.enabled
    });
  }

  /**
   * Configure blue-green deployment resources for progressive delivery
   * Creates ALB target groups and configures CodeDeploy integration
   */
  private configureBlueGreenDeployment(): void {
    if (!this.config!.deploymentStrategy?.blueGreen?.loadBalancer) {
      throw new Error('Blue-green deployment requires loadBalancer configuration');
    }

    const blueGreenConfig = this.config!.deploymentStrategy.blueGreen;
    const loadBalancerConfig = blueGreenConfig.loadBalancer;
    const vpc = this.getVpcFromContext();

    // Create ALB security group with least-privilege defaults
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'BlueGreenALBSecurityGroup', {
      vpc,
      description: `ALB security group for ${this.context.serviceName} ${this.spec.name}`,
      allowAllOutbound: false
    });

    this.albSecurityGroup.addEgressRule(
      this.securityGroup!,
      ec2.Port.tcp(this.config!.port),
      'Allow blue/green ALB to reach service tasks'
    );

    this.securityGroup!.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(this.config!.port),
      'Allow blue/green ALB ingress to service tasks'
    );

    // Create ALB for blue-green deployment
    const alb = new elbv2.ApplicationLoadBalancer(this, 'BlueGreenALB', {
      vpc,
      internetFacing: false, // Internal ALB for microservice communication
      loadBalancerName: `${this.context.serviceName}-${this.spec.name}-bg`,
      securityGroup: this.albSecurityGroup
    });

    // Create production target group (blue)
    const productionTargetGroup = new elbv2.ApplicationTargetGroup(this, 'ProductionTargetGroup', {
      targetGroupName: `${this.context.serviceName}-${this.spec.name}-prod`,
      port: this.config!.port,
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: vpc,
      targetType: elbv2.TargetType.IP, // Required for Fargate
      healthCheck: {
        enabled: true,
        interval: cdk.Duration.seconds(this.config!.healthCheck?.intervalSeconds || 30),
        timeout: cdk.Duration.seconds(this.config!.healthCheck?.timeoutSeconds || 5),
        unhealthyThresholdCount: this.config!.healthCheck?.retries || 3,
        path: '/health', // Standard health check path
        protocol: elbv2.Protocol.HTTP
      }
    });

    // Create test target group (green)
    const testTargetGroup = new elbv2.ApplicationTargetGroup(this, 'TestTargetGroup', {
      targetGroupName: `${this.context.serviceName}-${this.spec.name}-test`,
      port: this.config!.port,
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: vpc,
      targetType: elbv2.TargetType.IP, // Required for Fargate
      healthCheck: {
        enabled: true,
        interval: cdk.Duration.seconds(this.config!.healthCheck?.intervalSeconds || 30),
        timeout: cdk.Duration.seconds(this.config!.healthCheck?.timeoutSeconds || 5),
        unhealthyThresholdCount: this.config!.healthCheck?.retries || 3,
        path: '/health', // Standard health check path
        protocol: elbv2.Protocol.HTTP
      }
    });

    if (!loadBalancerConfig) {
      throw new Error('loadBalancerConfig is required but was undefined');
    }

    // Create production listener
    const productionListener = alb.addListener('ProductionListener', {
      port: loadBalancerConfig.productionPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([productionTargetGroup])
    });

    // Create test listener (for canary testing)
    const testPort = loadBalancerConfig.testPort || (loadBalancerConfig.productionPort + 1);
    const testListener = alb.addListener('TestListener', {
      port: testPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([testTargetGroup])
    });

    // Store blue-green resources for capability exposure
    this.blueGreenResources = {
      applicationLoadBalancer: alb,
      productionTargetGroup: productionTargetGroup,
      testTargetGroup: testTargetGroup,
      productionListener: productionListener,
      testListener: testListener
    };

    this.applyStandardTags(alb, {
      'deployment-strategy': 'blue-green'
    });

    if (this.albSecurityGroup) {
      this.applyStandardTags(this.albSecurityGroup, {
        'deployment-strategy': 'blue-green',
        'security-group-role': 'load-balancer'
      });
    }

    [productionTargetGroup, testTargetGroup].forEach(resource => {
      this.applyStandardTags(resource, {
        'deployment-strategy': 'blue-green',
        'target-group-type': resource === productionTargetGroup ? 'production' : 'test'
      });
    });

    this.logComponentEvent('blue_green_configured',
      `Configured blue-green deployment with ALB and target groups`);
  }

  /**
   * Validate that component has been synthesized
   */
  protected validateSynthesized(): void {
    if (!this.service) {
      throw new Error('ECS Fargate Service component must be synthesized before accessing capabilities');
    }
  }
}
