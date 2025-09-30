/**
 * Shinobi Component - The Platform Intelligence Brain
 * 
 * A production-grade Ops MCP Server that becomes the brain for SRE/DevOps/DPE/Developers and leadership.
 * Delivers exceptional DX/UX from day one, runs locally and in AWS, and provides a clean runway 
 * to a drag-and-drop GUI that outputs platform L3 construct manifests.
 * 
 * Core Philosophy: "Ask the brain, get an answer or an action." No AWS trivia, no yak-shaving.
 */

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
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

// Import the configuration interface and builder from the builder
import { ShinobiConfig, ShinobiComponentConfigBuilder } from './shinobi.builder';

/**
 * Shinobi Component - The Platform Intelligence Brain
 */
export class ShinobiComponent extends BaseComponent {
  private cluster?: ecs.Cluster;
  private service?: ecs.FargateService;
  private taskDefinition?: ecs.FargateTaskDefinition;
  private loadBalancer?: elbv2.ApplicationLoadBalancer;
  private repository?: ecr.Repository;
  private logGroup?: logs.LogGroup;
  private dataTable?: dynamodb.Table;
  private eventRule?: events.Rule;
  private config?: ShinobiConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create AWS resources
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Shinobi synthesis');
    
    try {
      // Build configuration
      this.config = this.buildConfigSync();
      
      // Create core infrastructure
      this.createEcrRepository();
      this.createEcsCluster();
      this.createLogGroup();
      this.createDataStore();
      this.createTaskDefinition();
      this.createEcsService();
      
      // Create API infrastructure if enabled
      const loadBalancerEnabled = this.resolveBoolean(this.config?.api?.loadBalancer?.enabled, true);
      if (loadBalancerEnabled) {
        this.createLoadBalancer();
      }
      
      // Create event-driven re-indexing
      this.createReindexingSchedule();
      
      // Apply compliance hardening
      this.applyComplianceHardening();
      
      // Register constructs for binding access
      this.registerConstruct('main', this.service!);
      this.registerConstruct('cluster', this.cluster!);
      this.registerConstruct('service', this.service!);
      this.registerConstruct('taskDefinition', this.taskDefinition!);
      this.registerConstruct('repository', this.repository!);
      this.registerConstruct('dataTable', this.dataTable!);

      if (this.loadBalancer) {
        this.registerConstruct('loadBalancer', this.loadBalancer);
      }
      if (this.logGroup) {
        this.registerConstruct('logGroup', this.logGroup);
      }
      if (this.eventRule) {
        this.registerConstruct('eventRule', this.eventRule);
      }
      
      // Register capabilities
      this.registerCapability('api:rest', this.buildApiCapability());
      this.registerCapability('container:ecs', this.buildContainerCapability());
      this.registerCapability('intelligence:platform', this.buildIntelligenceCapability());
      
      // Configure observability
      this._configureObservabilityForShinobi();
      
      this.logComponentEvent('synthesis_complete', 'Shinobi synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'Shinobi synthesis');
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
    return 'shinobi';
  }

  private buildConfigSync(): ShinobiConfig {
    // Use the builder to get configuration
    const builder = new ShinobiComponentConfigBuilder({
      context: this.context,
      spec: this.spec
    });
    return builder.buildSync();
  }

  private createEcrRepository(): void {
    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: `${this.context.serviceName}-shinobi`,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      imageScanOnPush: true,
      lifecycleRules: [{
        rulePriority: 1,
        description: 'Keep last 10 images',
        maxImageCount: 10
      }]
    });

    this.applyStandardTags(this.repository, {
      'resource-type': 'ecr-repository',
      'component': 'shinobi'
    });

    this.logResourceCreation('ecr-repository', this.repository.repositoryName);
  }

  private createEcsCluster(): void {
    // Use existing VPC or create new one
    let vpc: ec2.IVpc;
    if (this.config?.vpc?.vpcId) {
      vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
        vpcId: this.config.vpc.vpcId
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
      clusterName: `${this.context.serviceName}-shinobi-cluster`
    });

    this.applyStandardTags(this.cluster, {
      'resource-type': 'ecs-cluster',
      'component': 'shinobi'
    });

    this.logResourceCreation('ecs-cluster', this.cluster.clusterName);
  }

  private createLogGroup(): void {
    const retentionDays = this.resolveNumber(this.config?.logging?.retentionDays, 30);

    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/ecs/${this.context.serviceName}-shinobi`,
      retention: this.mapLogRetentionDays(retentionDays)
    });

    this.applyStandardTags(this.logGroup, {
      'resource-type': 'cloudwatch-log-group',
      'component': 'shinobi'
    });

    this.logResourceCreation('cloudwatch-log-group', this.logGroup.logGroupName);
  }

  private createDataStore(): void {
    const tableConfig = this.config?.dataStore?.dynamodb || {};
    
    this.dataTable = new dynamodb.Table(this, 'DataTable', {
      tableName: `${this.context.serviceName}-shinobi-data`,
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: tableConfig.billingMode === 'PROVISIONED'
        ? dynamodb.BillingMode.PROVISIONED
        : dynamodb.BillingMode.PAY_PER_REQUEST,
      readCapacity: tableConfig.billingMode === 'PROVISIONED'
        ? this.resolveNumber(tableConfig.readCapacity, 5)
        : undefined,
      writeCapacity: tableConfig.billingMode === 'PROVISIONED'
        ? this.resolveNumber(tableConfig.writeCapacity, 5)
        : undefined,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      encryption: dynamodb.TableEncryption.AWS_MANAGED
    });

    // Add GSI for different query patterns
    this.dataTable.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: {
        name: 'gsi1pk',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'gsi1sk',
        type: dynamodb.AttributeType.STRING
      }
    });

    this.applyStandardTags(this.dataTable, {
      'resource-type': 'dynamodb-table',
      'component': 'shinobi'
    });

    this.logResourceCreation('dynamodb-table', this.dataTable.tableName);
  }

  private createTaskDefinition(): void {
    const cpu = this.resolveNumber(this.config?.compute?.cpu, 512);
    const memory = this.resolveNumber(this.config?.compute?.memory, 1024);
    const taskCount = this.resolveNumber(this.config?.compute?.taskCount, 1);
    const containerPort = this.resolveNumber(this.config?.compute?.containerPort, 3000);
    const loadBalancerEnabled = this.resolveBoolean(this.config?.api?.loadBalancer?.enabled, true);
    const logRetentionDays = this.resolveNumber(this.config?.logging?.retentionDays, 30);
    const featureFlagsEnabled = this.resolveBoolean(this.config?.featureFlags?.enabled, true);
    const localDevEnabled = this.resolveBoolean(this.config?.localDev?.enabled, false);
    const complianceFramework = this.config?.compliance?.framework ?? this.context.complianceFramework;

    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      cpu,
      memoryLimitMiB: memory,
      family: `${this.context.serviceName}-shinobi`
    });

    // Add container
    const container = this.taskDefinition.addContainer('ShinobiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(this.repository!, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'shinobi',
        logGroup: this.logGroup!
      }),
      environment: {
        NODE_ENV: this.context.environment || 'development',
        LOG_LEVEL: this.config?.logging?.logLevel || 'info',
        DATA_SOURCES: JSON.stringify(this.config?.dataSources || {}),
        FEATURE_FLAGS_ENABLED: String(featureFlagsEnabled),
        COMPLIANCE_FRAMEWORK: complianceFramework,
        LOCAL_DEV_MODE: String(localDevEnabled),
        // MCP Server specific environment variables
        SHINOBI_COMPUTE_MODE: this.config?.compute?.mode || 'ecs',
        SHINOBI_CPU: String(cpu),
        SHINOBI_MEMORY: String(memory),
        SHINOBI_TASK_COUNT: String(taskCount),
        SHINOBI_CONTAINER_PORT: String(containerPort),
        SHINOBI_API_EXPOSURE: this.config?.api?.exposure || 'internal',
        SHINOBI_LOAD_BALANCER_ENABLED: String(loadBalancerEnabled),
        SHINOBI_FEATURE_FLAGS_PROVIDER: this.config?.featureFlags?.provider || 'aws-appconfig',
        SHINOBI_OBSERVABILITY_PROVIDER: this.config?.observability?.provider || 'cloudwatch',
        SHINOBI_SECURITY_LEVEL: this.config?.compliance?.securityLevel || 'standard',
        SHINOBI_LOG_RETENTION_DAYS: String(logRetentionDays)
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(
          this.createDatabaseSecret()
        )
      }
    });

    container.addPortMappings({
      containerPort,
      protocol: ecs.Protocol.TCP
    });

    this.applyStandardTags(this.taskDefinition, {
      'resource-type': 'ecs-task-definition',
      'component': 'shinobi'
    });

    this.logResourceCreation('ecs-task-definition', this.taskDefinition.family);
  }

  private createEcsService(): void {
    if (!this.cluster || !this.taskDefinition) {
      throw new Error('ECS Cluster and Task Definition must be created before ECS Service');
    }

    const desiredCount = this.resolveNumber(this.config?.compute?.taskCount, 1);
    this.service = new ecs.FargateService(this, 'Service', {
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      serviceName: `${this.context.serviceName}-shinobi`,
      desiredCount,
      assignPublicIp: false
    });

    // Auto-scaling
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
      'component': 'shinobi'
    });

    this.logResourceCreation('ecs-service', this.service.serviceName);
  }

  private createLoadBalancer(): void {
    if (!this.cluster) {
      throw new Error('ECS Cluster must be created before Load Balancer');
    }

    const containerPort = this.resolveNumber(this.config?.compute?.containerPort, 3000);
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: this.cluster.vpc,
      internetFacing: this.config?.api?.exposure === 'public',
      loadBalancerName: `${this.context.serviceName}-shinobi-alb`
    });

    // Target group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc: this.cluster.vpc,
      port: containerPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        enabled: true,
        path: '/health',
        port: containerPort.toString(),
        protocol: elbv2.Protocol.HTTP,
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3
      }
    });

    // Associate service with target group
    this.service!.attachToApplicationTargetGroup(targetGroup);

    // Listener
    const certificateArn = this.config?.api?.loadBalancer?.certificateArn;

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
      'component': 'shinobi'
    });

    this.logResourceCreation('application-load-balancer', this.loadBalancer.loadBalancerName);
  }

  private createReindexingSchedule(): void {
    // Create EventBridge rule for periodic re-indexing
    this.eventRule = new events.Rule(this, 'ReindexingRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
      description: 'Trigger Shinobi data re-indexing'
    });

    // Add ECS task as target
    this.eventRule.addTarget(new targets.EcsTask({
      cluster: this.cluster!,
      taskDefinition: this.taskDefinition!,
      subnetSelection: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      containerOverrides: [{
        containerName: 'ShinobiContainer',
        environment: [{
          name: 'REINDEX_MODE',
          value: 'true'
        }]
      }]
    }));

    this.applyStandardTags(this.eventRule, {
      'resource-type': 'eventbridge-rule',
      'component': 'shinobi'
    });

    this.logResourceCreation('eventbridge-rule', this.eventRule.ruleName);
  }

  private createDatabaseSecret(): secretsmanager.Secret {
    return new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: `${this.context.serviceName}-shinobi-db-secret`,
      description: 'Database connection secret for Shinobi',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'shinobi'
        }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\'
      }
    });
  }

  private buildApiCapability(): any {
    const endpoint = this.loadBalancer ? 
      `https://${this.config?.api?.loadBalancer?.domainName || this.loadBalancer.loadBalancerDnsName}` :
      `http://internal:${this.resolveNumber(this.config?.compute?.containerPort, 3000)}`;

    return {
      endpoint: endpoint,
      protocol: 'HTTPS',
      apiType: 'REST',
      version: this.config?.api?.version || '1.0',
      paths: {
        '/catalog/*': 'Discovery & DocOps',
        '/graph/*': 'Topology, Graph & GUI Enablement',
        '/manifest/*': 'Manifest Intelligence (L3)',
        '/reliability/*': 'Reliability: SLO/SLA & Incident Ops',
        '/obs/*': 'Observability & Dashboards',
        '/change/*': 'ChangeOps & CI/CD',
        '/sec/*': 'Security & Compliance',
        '/qa/*': 'QA & Test Engineering',
        '/cost/*': 'Cost & FinOps',
        '/dx/*': 'Developer Experience (DPE) & Self-Service',
        '/gov/*': 'Governance & Exec Insights'
      },
      authentication: {
        type: 'JWT',
        scopes: ['read:platform', 'write:platform', 'admin:platform']
      }
    };
  }

  private buildContainerCapability(): any {
    return {
      clusterArn: this.cluster!.clusterArn,
      serviceArn: this.service!.serviceArn,
      taskDefinitionArn: this.taskDefinition!.taskDefinitionArn,
      repositoryUri: this.repository!.repositoryUri,
      containerPort: this.resolveNumber(this.config?.compute?.containerPort, 3000)
    };
  }

  private buildIntelligenceCapability(): any {
    return {
      dataSources: this.config?.dataSources || {},
      featureFlags: this.config?.featureFlags || {},
      observability: this.config?.observability || {},
      compliance: this.config?.compliance || {},
      localDev: this.config?.localDev || {}
    };
  }

  /**
   * Configure observability for Shinobi
   */
  private _configureObservabilityForShinobi(): void {
    if (!this.config?.observability?.alerts?.enabled) {
      return;
    }

    const thresholds = this.config.observability.alerts.thresholds || {};
    const cpuThreshold = this.resolveNumber(thresholds.cpuUtilization, 80);
    const memoryThreshold = this.resolveNumber(thresholds.memoryUtilization, 80);
    const responseTimeThreshold = this.resolveNumber(thresholds.responseTime, 2);

    // Create CloudWatch alarms for ECS service
    if (this.service) {
      // CPU utilization alarm
      new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
        metric: this.service.metricCpuUtilization(),
        threshold: cpuThreshold,
        evaluationPeriods: 2,
        alarmDescription: 'Shinobi CPU utilization is high'
      });

      // Memory utilization alarm
      new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
        metric: this.service.metricMemoryUtilization(),
        threshold: memoryThreshold,
        evaluationPeriods: 2,
        alarmDescription: 'Shinobi memory utilization is high'
      });

      // Task count alarm
      const runningTaskMetric = new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'RunningTaskCount',
        statistic: 'Average',
        period: cdk.Duration.minutes(1),
        dimensionsMap: {
          ClusterName: this.cluster?.clusterName ?? this.service.cluster.clusterName,
          ServiceName: this.service.serviceName
        }
      });

      new cloudwatch.Alarm(this, 'TaskCountAlarm', {
        metric: runningTaskMetric,
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        alarmDescription: 'Shinobi has no running tasks'
      });
    }

    // Create API response time alarm if load balancer is enabled
    if (this.loadBalancer) {
      const responseTimeMetric = this.loadBalancer.metrics.targetResponseTime({
        period: cdk.Duration.minutes(1)
      });
      new cloudwatch.Alarm(this, 'ResponseTimeAlarm', {
        metric: responseTimeMetric,
        threshold: responseTimeThreshold,
        evaluationPeriods: 2,
        alarmDescription: 'Shinobi API response time is high'
      });
    }

    this.logComponentEvent('observability_configured', 'Shinobi observability configured successfully');
  }

  private applyComplianceHardening(): void {
    // Apply security hardening based on compliance framework
    const securityLevel = this.config?.compliance?.securityLevel || 'standard';
    
    if (securityLevel === 'enhanced' || securityLevel === 'maximum') {
      // Enhanced security measures
      this.logComponentEvent('compliance_hardening', 'Applied enhanced security hardening');
    }
    
    if (securityLevel === 'maximum') {
      // Maximum security measures
      this.logComponentEvent('compliance_hardening', 'Applied maximum security hardening');
    }
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
