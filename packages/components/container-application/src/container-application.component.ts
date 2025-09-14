/**
 * Container Application Component - Generic Containerized Application Infrastructure
 * 
 * A production-grade component that provisions containerized applications
 * with integrated load balancing, service discovery, and observability.
 * 
 * Core Philosophy: "Deploy any containerized application with zero config."
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
import { ContainerApplicationConfig, ContainerApplicationConfigBuilder } from './container-application.builder';

/**
 * Container Application Component - Generic Containerized Application Infrastructure
 * 
 * Provisions a containerized application with:
 * - ECS Fargate service for scalable deployment
 * - Application Load Balancer for external access
 * - ECR repository for container images
 * - Comprehensive observability and monitoring
 * - Service discovery and health checks
 */
export class ContainerApplicationComponent extends Component {

  /**
   * Main ECS cluster for the application
   */
  private cluster: ecs.Cluster;

  /**
   * Application Load Balancer for external access
   */
  private loadBalancer: elbv2.ApplicationLoadBalancer;

  /**
   * ECR repository for container images
   */
  private ecrRepository: ecr.Repository;

  /**
   * ECS service for the application
   */
  private service: ecs.FargateService;

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
  private config: ContainerApplicationConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);

    // Build configuration using the component's config builder
    this.config = new ContainerApplicationConfigBuilder(context, spec).buildSync();

    this.getLogger().info('Initializing Container Application Component', {
      componentType: 'container-application',
      environment: context.environment,
      complianceFramework: context.complianceFramework
    });
  }

  /**
   * Synthesize the component infrastructure
   */
  public synth(): void {
    this.getLogger().info('Synthesizing Container Application infrastructure');

    // Step 1: Create helper resources for compliance
    const kmsKey = this._createKmsKeyIfNeeded('container-encryption');

    // Step 2: Create ECR repository for container images
    this.ecrRepository = new ecr.Repository(this, 'ContainerEcrRepository', {
      repositoryName: `${this.context.serviceName}-${this.config.application.name}`,
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
    this.cluster = new ecs.Cluster(this, 'ContainerCluster', {
      clusterName: `${this.context.serviceName}-${this.config.application.name}-cluster`,
      vpc: vpc,
      containerInsights: true,
      enableLogging: true
    });

    // Step 5: Create Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ContainerALB', {
      vpc: vpc,
      internetFacing: true,
      loadBalancerName: `${this.context.serviceName}-${this.config.application.name}-alb`,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      }
    });

    // Step 6: Create CloudWatch log groups
    this._createLogGroups();

    // Step 7: Create ECS service for the application
    this._createApplicationService(vpc, kmsKey);

    // Step 8: Create monitoring and alarms
    this._createMonitoring();

    // Step 9: Apply standard tags to all resources
    this._applyStandardTags(this.ecrRepository);
    this._applyStandardTags(this.cluster);
    this._applyStandardTags(this.loadBalancer);
    this._applyStandardTags(this.service);

    // Step 10: Register constructs and capabilities
    this._registerConstruct('main', this.cluster);
    this._registerConstruct('ecr', this.ecrRepository);
    this._registerConstruct('alb', this.loadBalancer);
    this._registerConstruct('service', this.service);

    // Register capabilities
    this._registerCapability('application:url', this.loadBalancer.loadBalancerDnsName);
    this._registerCapability('ecr:repository', this.ecrRepository.repositoryUri);
    this._registerCapability('cluster:name', this.cluster.clusterName);
    this._registerCapability('service:name', this.service.serviceName);

    this.getLogger().info('Container Application infrastructure synthesized successfully');
  }

  /**
   * Get component type identifier
   */
  public getType(): string {
    return 'container-application';
  }

  /**
   * Create CloudWatch log groups for structured logging
   */
  private _createLogGroups(): void {
    const logRetentionDays = this.config.observability.logRetentionDays;

    this.logGroups.application = new logs.LogGroup(this, 'ContainerApplicationLogs', {
      logGroupName: `/aws/ecs/${this.context.serviceName}/${this.config.application.name}`,
      retention: logs.RetentionDays.of(logRetentionDays),
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
  }

  /**
   * Create ECS service for the containerized application
   */
  private _createApplicationService(vpc: ec2.Vpc, kmsKey: cdk.aws_kms.Key): void {
    // Create task execution role
    const taskExecutionRole = new iam.Role(this, 'ContainerTaskExecutionRole', {
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

    // Create task role for the application
    const taskRole = new iam.Role(this, 'ContainerTaskRole', {
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
              `arn:aws:secretsmanager:${this.context.region}:${this.context.account}:secret:${this.context.serviceName}/${this.config.application.name}/*`
            ]
          })]
        })
      }
    });

    // Create Fargate service
    this.service = new ecs.FargateService(this, 'ContainerService', {
      cluster: this.cluster,
      taskDefinition: this._createTaskDefinition(taskExecutionRole, taskRole),
      desiredCount: this.config.service.desiredCount,
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      enableLogging: true
    });

    // Create target group and listener
    this._createLoadBalancerTargets();
  }

  /**
   * Create task definition for the application
   */
  private _createTaskDefinition(taskExecutionRole: iam.Role, taskRole: iam.Role): ecs.FargateTaskDefinition {
    const taskDef = new ecs.FargateTaskDefinition(this, 'ContainerTaskDef', {
      family: `${this.context.serviceName}-${this.config.application.name}`,
      cpu: this.config.service.cpu,
      memoryLimitMiB: this.config.service.memory,
      executionRole: taskExecutionRole,
      taskRole: taskRole
    });

    const container = taskDef.addContainer(this.config.application.name, {
      image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
      containerName: this.config.application.name,
      portMappings: [{
        containerPort: this.config.application.port,
        protocol: ecs.Protocol.TCP
      }],
      environment: {
        NODE_ENV: 'production',
        PORT: this.config.application.port.toString(),
        ...this.config.application.environment
      },
      secrets: this._createSecrets(),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: this.config.application.name,
        logGroup: this.logGroups.application
      }),
      healthCheck: {
        command: this.config.service.healthCheck.command,
        interval: cdk.Duration.seconds(this.config.service.healthCheck.interval),
        timeout: cdk.Duration.seconds(this.config.service.healthCheck.timeout),
        retries: this.config.service.healthCheck.retries,
        startPeriod: cdk.Duration.seconds(this.config.service.healthCheck.startPeriod)
      }
    });

    return taskDef;
  }

  /**
   * Create secrets for the application
   */
  private _createSecrets(): { [key: string]: ecs.Secret } {
    const secrets: { [key: string]: ecs.Secret } = {};

    if (this.config.application.secrets) {
      for (const [key, secretName] of Object.entries(this.config.application.secrets)) {
        secrets[key] = ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, `Secret-${key}`, secretName)
        );
      }
    }

    return secrets;
  }

  /**
   * Create load balancer targets and listeners
   */
  private _createLoadBalancerTargets(): void {
    // Target group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'ContainerTargetGroup', {
      targetType: elbv2.TargetType.IP,
      port: this.config.application.port,
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: this.cluster.vpc,
      healthCheck: {
        enabled: true,
        healthyHttpCodes: this.config.service.healthCheck.healthyHttpCodes,
        path: this.config.service.healthCheck.path,
        protocol: elbv2.Protocol.HTTP,
        port: this.config.application.port.toString(),
        interval: cdk.Duration.seconds(this.config.service.healthCheck.interval),
        timeout: cdk.Duration.seconds(this.config.service.healthCheck.timeout),
        healthyThresholdCount: this.config.service.healthCheck.healthyThresholdCount,
        unhealthyThresholdCount: this.config.service.healthCheck.unhealthyThresholdCount
      }
    });

    this.service.attachToApplicationTargetGroup(targetGroup);

    // Create listener
    const listener = this.loadBalancer.addListener('ContainerListener', {
      port: this.config.loadBalancer.port,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup]
    });

    // Add HTTPS listener if SSL certificate is provided
    if (this.config.loadBalancer.sslCertificateArn) {
      this.loadBalancer.addListener('ContainerHttpsListener', {
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [elbv2.ListenerCertificate.fromArn(this.config.loadBalancer.sslCertificateArn)],
        defaultTargetGroups: [targetGroup]
      });
    }
  }

  /**
   * Create monitoring and alarms
   */
  private _createMonitoring(): void {
    // High CPU utilization alarm
    this.alarms.highCpu = new cloudwatch.Alarm(this, 'ContainerHighCpuAlarm', {
      alarmName: `${this.context.serviceName}-${this.config.application.name}-high-cpu`,
      metric: this.cluster.metricCpuUtilization(),
      threshold: this.config.observability.cpuThreshold,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // High memory utilization alarm
    this.alarms.highMemory = new cloudwatch.Alarm(this, 'ContainerHighMemoryAlarm', {
      alarmName: `${this.context.serviceName}-${this.config.application.name}-high-memory`,
      metric: this.cluster.metricMemoryUtilization(),
      threshold: this.config.observability.memoryThreshold,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Task count alarm
    this.alarms.lowTaskCount = new cloudwatch.Alarm(this, 'ContainerLowTaskCountAlarm', {
      alarmName: `${this.context.serviceName}-${this.config.application.name}-low-task-count`,
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
    return new ec2.Vpc(this, 'ContainerVpc', {
      vpcName: `${this.context.serviceName}-${this.config.application.name}-vpc`,
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
    return new cdk.aws_kms.Key(this, `ContainerKmsKey-${purpose}`, {
      alias: `${this.context.serviceName}-${this.config.application.name}-${purpose}`,
      description: `KMS key for ${purpose} in container application`,
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
export { ContainerApplicationConfig, CONTAINER_APPLICATION_CONFIG_SCHEMA } from './container-application.builder';
