/**
 * Backstage Portal Component - Developer Portal Infrastructure
 * 
 * A production-grade component that provisions a complete Backstage developer portal
 * with integrated database, authentication, and observability capabilities.
 * 
 * Core Philosophy: "Zero-config developer portal that just works."
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
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

// Import the configuration interface and builder from the builder
import { BackstagePortalConfig, BackstagePortalConfigBuilder } from './backstage-portal.builder';

/**
 * Backstage Portal Component - Developer Portal Infrastructure
 * 
 * Provisions a complete Backstage developer portal with:
 * - Containerized Backstage frontend and backend
 * - PostgreSQL database for catalog and user data
 * - GitHub OAuth integration
 * - Service discovery and catalog management
 * - Comprehensive observability and monitoring
 */
export class BackstagePortalComponent extends Component {
  
  /**
   * Main ECS cluster for Backstage services
   */
  private cluster: ecs.Cluster;
  
  /**
   * Application Load Balancer for external access
   */
  private loadBalancer: elbv2.ApplicationLoadBalancer;
  
  /**
   * ECR repository for Backstage container images
   */
  private ecrRepository: ecr.Repository;
  
  /**
   * CloudWatch log groups for structured logging
   */
  private logGroups: { [key: string]: logs.LogGroup } = {};
  
  /**
   * CloudWatch alarms for monitoring
   */
  private alarms: { [key: string]: cloudwatch.Alarm } = {};
  
  /**
   * Component configuration
   */
  private config: BackstagePortalConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
    
    // Build configuration using the component's config builder
    this.config = new BackstagePortalConfigBuilder(context, spec).buildSync();
    
    this.getLogger().info('Initializing Backstage Portal Component', {
      componentType: 'backstage-portal',
      environment: context.environment,
      complianceFramework: context.complianceFramework
    });
  }

  /**
   * Synthesize the component infrastructure
   */
  public synth(): void {
    this.getLogger().info('Synthesizing Backstage Portal infrastructure');
    
    // Step 1: Create helper resources for compliance
    const kmsKey = this._createKmsKeyIfNeeded('backstage-encryption');
    
    // Step 2: Create ECR repository for container images
    this.ecrRepository = new ecr.Repository(this, 'BackstageEcrRepository', {
      repositoryName: `${this.context.serviceName}-backstage`,
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      encryption: ecr.RepositoryEncryption.KMS,
      encryptionKey: kmsKey,
      lifecycleRules: [{
        maxImageCount: this.config.ecr.maxImageCount,
        rulePriority: 1,
        description: 'Keep only recent images'
      }]
    });
    
    // Step 3: Create VPC and networking
    const vpc = this._createVpcIfNeeded();
    
    // Step 4: Create ECS cluster
    this.cluster = new ecs.Cluster(this, 'BackstageCluster', {
      clusterName: `${this.context.serviceName}-backstage-cluster`,
      vpc: vpc,
      containerInsights: true,
      enableLogging: true
    });
    
    // Step 5: Create Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'BackstageALB', {
      vpc: vpc,
      internetFacing: true,
      loadBalancerName: `${this.context.serviceName}-backstage-alb`,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      }
    });
    
    // Step 6: Create CloudWatch log groups
    this._createLogGroups();
    
    // Step 7: Create ECS services for Backstage
    this._createBackstageServices(vpc, kmsKey);
    
    // Step 8: Create monitoring and alarms
    this._createMonitoring();
    
    // Step 9: Apply standard tags to all resources
    this._applyStandardTags(this.ecrRepository);
    this._applyStandardTags(this.cluster);
    this._applyStandardTags(this.loadBalancer);
    
    // Step 10: Register constructs and capabilities
    this._registerConstruct('main', this.cluster);
    this._registerConstruct('ecr', this.ecrRepository);
    this._registerConstruct('alb', this.loadBalancer);
    
    // Register capabilities
    this._registerCapability('portal:url', this.loadBalancer.loadBalancerDnsName);
    this._registerCapability('ecr:repository', this.ecrRepository.repositoryUri);
    this._registerCapability('cluster:name', this.cluster.clusterName);
    
    this.getLogger().info('Backstage Portal infrastructure synthesized successfully');
  }

  /**
   * Get component type identifier
   */
  public getType(): string {
    return 'backstage-portal';
  }

  /**
   * Create CloudWatch log groups for structured logging
   */
  private _createLogGroups(): void {
    const logRetentionDays = this.config.observability.logRetentionDays;
    
    this.logGroups.backend = new logs.LogGroup(this, 'BackstageBackendLogs', {
      logGroupName: `/aws/ecs/${this.context.serviceName}/backstage-backend`,
      retention: logs.RetentionDays.of(logRetentionDays),
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    this.logGroups.frontend = new logs.LogGroup(this, 'BackstageFrontendLogs', {
      logGroupName: `/aws/ecs/${this.context.serviceName}/backstage-frontend`,
      retention: logs.RetentionDays.of(logRetentionDays),
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    this.logGroups.database = new logs.LogGroup(this, 'BackstageDatabaseLogs', {
      logGroupName: `/aws/rds/${this.context.serviceName}/backstage-db`,
      retention: logs.RetentionDays.of(logRetentionDays),
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
  }

  /**
   * Create ECS services for Backstage frontend and backend
   */
  private _createBackstageServices(vpc: ec2.Vpc, kmsKey: cdk.aws_kms.Key): void {
    // Create task execution role
    const taskExecutionRole = new iam.Role(this, 'BackstageTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
      ],
      inlinePolicies: {
        EcrAccess: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'ecr:GetAuthorizationToken',
              'ecr:BatchCheckLayerAvailability',
              'ecr:GetDownloadUrlForLayer',
              'ecr:BatchGetImage'
            ],
            resources: ['*']
          })]
        })
      }
    });

    // Create task role for Backstage services
    const taskRole = new iam.Role(this, 'BackstageTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      inlinePolicies: {
        SecretsManagerAccess: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'secretsmanager:GetSecretValue',
              'secretsmanager:DescribeSecret'
            ],
            resources: [
              `arn:aws:secretsmanager:${this.context.region}:${this.context.account}:secret:${this.context.serviceName}/backstage/*`
            ]
          })]
        })
      }
    });

    // Create Fargate service for Backstage backend
    const backendService = new ecs.FargateService(this, 'BackstageBackendService', {
      cluster: this.cluster,
      taskDefinition: this._createBackendTaskDefinition(taskExecutionRole, taskRole),
      desiredCount: this.config.backend.desiredCount,
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      enableLogging: true
    });

    // Create Fargate service for Backstage frontend
    const frontendService = new ecs.FargateService(this, 'BackstageFrontendService', {
      cluster: this.cluster,
      taskDefinition: this._createFrontendTaskDefinition(taskExecutionRole, taskRole),
      desiredCount: this.config.frontend.desiredCount,
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      healthCheckGracePeriod: cdk.Duration.seconds(30),
      enableLogging: true
    });

    // Create target groups and listeners
    this._createLoadBalancerTargets(backendService, frontendService);
  }

  /**
   * Create backend task definition
   */
  private _createBackendTaskDefinition(taskExecutionRole: iam.Role, taskRole: iam.Role): ecs.FargateTaskDefinition {
    const taskDef = new ecs.FargateTaskDefinition(this, 'BackstageBackendTaskDef', {
      family: `${this.context.serviceName}-backstage-backend`,
      cpu: this.config.backend.cpu,
      memoryLimitMiB: this.config.backend.memory,
      executionRole: taskExecutionRole,
      taskRole: taskRole
    });

    const container = taskDef.addContainer('BackstageBackend', {
      image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
      containerName: 'backstage-backend',
      portMappings: [{
        containerPort: 7007,
        protocol: ecs.Protocol.TCP
      }],
      environment: {
        NODE_ENV: 'production',
        PORT: '7007',
        BACKEND_URL: `http://localhost:7007`,
        FRONTEND_URL: `https://${this.loadBalancer.loadBalancerDnsName}`
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'DatabaseSecret', `${this.context.serviceName}/backstage/database`)
        ),
        GITHUB_CLIENT_ID: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'GitHubClientIdSecret', `${this.context.serviceName}/backstage/github-client-id`)
        ),
        GITHUB_CLIENT_SECRET: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'GitHubClientSecretSecret', `${this.context.serviceName}/backstage/github-client-secret`)
        )
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'backstage-backend',
        logGroup: this.logGroups.backend
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:7007/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60)
      }
    });

    return taskDef;
  }

  /**
   * Create frontend task definition
   */
  private _createFrontendTaskDefinition(taskExecutionRole: iam.Role, taskRole: iam.Role): ecs.FargateTaskDefinition {
    const taskDef = new ecs.FargateTaskDefinition(this, 'BackstageFrontendTaskDef', {
      family: `${this.context.serviceName}-backstage-frontend`,
      cpu: this.config.frontend.cpu,
      memoryLimitMiB: this.config.frontend.memory,
      executionRole: taskExecutionRole,
      taskRole: taskRole
    });

    const container = taskDef.addContainer('BackstageFrontend', {
      image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
      containerName: 'backstage-frontend',
      portMappings: [{
        containerPort: 3000,
        protocol: ecs.Protocol.TCP
      }],
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        BACKEND_URL: `http://localhost:7007`,
        FRONTEND_URL: `https://${this.loadBalancer.loadBalancerDnsName}`
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'backstage-frontend',
        logGroup: this.logGroups.frontend
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000 || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(30)
      }
    });

    return taskDef;
  }

  /**
   * Create load balancer targets and listeners
   */
  private _createLoadBalancerTargets(backendService: ecs.FargateService, frontendService: ecs.FargateService): void {
    // Backend target group
    const backendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'BackstageBackendTargetGroup', {
      targetType: elbv2.TargetType.IP,
      port: 7007,
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: this.cluster.vpc,
      healthCheck: {
        enabled: true,
        healthyHttpCodes: '200',
        path: '/health',
        protocol: elbv2.Protocol.HTTP,
        port: '7007',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3
      }
    });

    backendService.attachToApplicationTargetGroup(backendTargetGroup);

    // Frontend target group
    const frontendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'BackstageFrontendTargetGroup', {
      targetType: elbv2.TargetType.IP,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: this.cluster.vpc,
      healthCheck: {
        enabled: true,
        healthyHttpCodes: '200',
        path: '/',
        protocol: elbv2.Protocol.HTTP,
        port: '3000',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3
      }
    });

    frontendService.attachToApplicationTargetGroup(frontendTargetGroup);

    // Create listeners
    const listener = this.loadBalancer.addListener('BackstageListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [frontendTargetGroup]
    });

    // Add path-based routing for API calls
    listener.addTargetGroups('BackstageBackendRule', {
      targetGroups: [backendTargetGroup],
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*', '/health*'])]
    });
  }

  /**
   * Create monitoring and alarms
   */
  private _createMonitoring(): void {
    // High CPU utilization alarm
    this.alarms.highCpu = new cloudwatch.Alarm(this, 'BackstageHighCpuAlarm', {
      alarmName: `${this.context.serviceName}-backstage-high-cpu`,
      metric: this.cluster.metricCpuUtilization(),
      threshold: this.config.observability.cpuThreshold,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // High memory utilization alarm
    this.alarms.highMemory = new cloudwatch.Alarm(this, 'BackstageHighMemoryAlarm', {
      alarmName: `${this.context.serviceName}-backstage-high-memory`,
      metric: this.cluster.metricMemoryUtilization(),
      threshold: this.config.observability.memoryThreshold,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Task count alarm
    this.alarms.lowTaskCount = new cloudwatch.Alarm(this, 'BackstageLowTaskCountAlarm', {
      alarmName: `${this.context.serviceName}-backstage-low-task-count`,
      metric: this.cluster.metricRunningTaskCount(),
      threshold: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING
    });
  }

  /**
   * Create VPC if needed
   */
  private _createVpcIfNeeded(): ec2.Vpc {
    // REVIEW: This assumes a VPC doesn't exist - may need to reference existing VPC
    return new ec2.Vpc(this, 'BackstageVpc', {
      vpcName: `${this.context.serviceName}-backstage-vpc`,
      maxAzs: 2,
      natGateways: 1,
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
  }

  /**
   * Create KMS key if needed for encryption
   */
  private _createKmsKeyIfNeeded(purpose: string): cdk.aws_kms.Key {
    return new cdk.aws_kms.Key(this, `BackstageKmsKey-${purpose}`, {
      alias: `${this.context.serviceName}-backstage-${purpose}`,
      description: `KMS key for ${purpose} in Backstage portal`,
      enableKeyRotation: true,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*']
          })
        ]
      })
    });
  }
}

// Export the configuration interface and schema for external use
export { BackstagePortalConfig, BACKSTAGE_PORTAL_CONFIG_SCHEMA } from './backstage-portal.builder';
