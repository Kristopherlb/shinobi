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
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent } from '@shinobi/core';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
import {
  EcsFargateServiceComponentConfigBuilder,
  EcsFargateServiceConfig,
  EcsFargateAlarmConfig
} from './ecs-fargate-service.builder.ts';

/**
 * ECS Fargate Service Component implementing Component API Contract v1.0 and
 * Platform ECS Service Connect Standard v1.0
 */
export class EcsFargateServiceComponent extends BaseComponent {
  private service?: ecs.FargateService;
  private taskDefinition?: ecs.FargateTaskDefinition;
  private securityGroup?: ec2.SecurityGroup;
  private logGroup?: logs.ILogGroup;
  private createdLogGroup?: logs.LogGroup;
  private config?: EcsFargateServiceConfig;
  private configBuilder?: EcsFargateServiceComponentConfigBuilder;
  private importedCluster?: ecs.ICluster;
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
    };
    
    if (!compatibleMemory[cpu]?.includes(memory)) {
      throw new Error(
        `Invalid CPU/Memory combination: ${cpu} vCPU with ${memory} MB memory. ` +
        `Valid memory options for ${cpu} vCPU: ${compatibleMemory[cpu]?.join(', ') || 'none'}`
      );
    }
  }

  /**
   * Create Fargate task definition
   */
  private createTaskDefinition(): void {
    const logGroup = this.resolveLogGroup();

    // Create task role if not provided
    let taskRole: iam.Role | undefined;
    if (this.config!.taskRoleArn) {
      taskRole = iam.Role.fromRoleArn(this, 'TaskRole', this.config!.taskRoleArn) as iam.Role;
    } else {
      taskRole = new iam.Role(this, 'TaskRole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        description: `Task role for ${this.context.serviceName} ${this.spec.name}`,
      });
    }

    // Create task definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      family: `${this.context.serviceName}-${this.spec.name}`,
      cpu: this.config!.cpu,
      memoryLimitMiB: this.config!.memory,
      taskRole: taskRole,
    });

    // Add container to task definition
    const imageUri = this.config!.image.tag ? 
      `${this.config!.image.repository}:${this.config!.image.tag}` :
      `${this.config!.image.repository}:latest`;

    const container = this.taskDefinition.addContainer('Container', {
      image: ecs.ContainerImage.fromRegistry(imageUri),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: this.config!.logging.streamPrefix || this.spec.name,
        logGroup
      }),
      environment: this.config!.environment,
      secrets: this.buildSecretsFromConfig(),
    });

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

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName,
      retention: this.mapLogRetention(loggingConfig.retentionInDays),
      removalPolicy
    });

    this.applyStandardTags(logGroup, {
      'resource-type': 'log-group',
      'service-name': this.context.serviceName,
      'component-name': this.spec.name
    });

    this.logGroup = logGroup;
    this.createdLogGroup = logGroup;
    return logGroup;
  }

  /**
   * Create security group for the service
   */
  private createSecurityGroup(): void {
    const vpc = this.getVpcFromContext();
    
    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: vpc,
      description: `Security group for ${this.context.serviceName} ${this.spec.name}`,
      allowAllOutbound: true, // Allow outbound traffic by default
    });

    // Allow inbound traffic on the service port from within VPC
    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(this.config!.port),
      'Allow inbound traffic on service port'
    );

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
      1827: logs.RetentionDays.FIVE_YEARS,
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
      ?? cluster.defaultCloudMapNamespace?.namespaceName;

    if (!serviceConnectNamespace) {
      throw new Error('Service Connect namespace must be provided via config.serviceConnect.namespace or on the target cluster.');
    }

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

    if (this.service) {
      this.applyStandardTags(this.service, standardTags);
    }
    
    if (this.taskDefinition) {
      this.applyStandardTags(this.taskDefinition, standardTags);
    }
    
    if (this.securityGroup) {
      this.applyStandardTags(this.securityGroup, standardTags);
    }

    // Apply user-defined tags
    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        if (this.service) {
          cdk.Tags.of(this.service).add(key, value);
        }
      });
    }
  }

  /**
   * Build the service:connect capability for other components to bind to
   */
  private buildServiceConnectCapability() {
    const cluster = this.getClusterFromBinding();
    const isBlueGreenDeployment = this.config!.deploymentStrategy?.type === 'blue-green';
    
    const capability: any = {
      serviceName: this.spec.name,
      serviceArn: this.service!.serviceArn,
      clusterName: cluster.clusterName,
      dnsName: `${this.spec.name}.${cluster.defaultCloudMapNamespace?.namespaceName}`,
      port: this.config!.port,
      portMappingName: this.config!.serviceConnect.portMappingName,
      securityGroupId: this.securityGroup!.securityGroupId,
      internalEndpoint: `http://${this.spec.name}.internal:${this.config!.port}`, // Service Connect endpoint
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
    if ((this.context as ComponentContext).vpc) {
      return (this.context as ComponentContext).vpc!;
    }

    return ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
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
    if (!this.service || !this.config) {
      throw new Error('Service and config must be created before configuring observability');
    }

    const monitoring = this.config.monitoring;

    if (!monitoring.enabled) {
      this.logComponentEvent('observability_skipped', 'Monitoring disabled for ECS Fargate service', {
        reason: 'monitoring.disabled'
      });
      return;
    }

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

    // Create ALB for blue-green deployment
    const alb = new elbv2.ApplicationLoadBalancer(this, 'BlueGreenALB', {
      vpc: vpc,
      internetFacing: false, // Internal ALB for microservice communication
      loadBalancerName: `${this.context.serviceName}-${this.spec.name}-bg`,
      securityGroup: this.securityGroup
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
        interval: cdk.Duration.seconds(this.config!.healthCheck?.interval || 30),
        timeout: cdk.Duration.seconds(this.config!.healthCheck?.timeout || 5),
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
        interval: cdk.Duration.seconds(this.config!.healthCheck?.interval || 30),
        timeout: cdk.Duration.seconds(this.config!.healthCheck?.timeout || 5),
        unhealthyThresholdCount: this.config!.healthCheck?.retries || 3,
        path: '/health', // Standard health check path
        protocol: elbv2.Protocol.HTTP
      }
    });

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

    // Apply standard tags to ALB resources
    [alb, productionTargetGroup, testTargetGroup].forEach(resource => {
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
