/**
 * ECS Cluster Component
 * 
 * AWS ECS Cluster for container orchestration with enterprise features.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

/**
 * Configuration interface for ECS Cluster component
 */
export interface EcsClusterConfig {
  /** Cluster name (optional, will be auto-generated) */
  clusterName?: string;
  
  /** VPC configuration */
  vpc?: {
    vpcId?: string;
    subnetIds?: string[];
  };
  
  /** Capacity provider configuration */
  capacityProviders?: Array<{
    /** Provider type */
    type: 'FARGATE' | 'FARGATE_SPOT' | 'EC2';
    /** Weight for capacity provider strategy */
    weight?: number;
    /** Base capacity */
    base?: number;
    /** EC2 capacity configuration (only for EC2 type) */
    ec2Configuration?: {
      instanceType?: string;
      minSize?: number;
      maxSize?: number;
      desiredSize?: number;
      /** Auto Scaling Group configuration */
      autoScalingGroup?: {
        enableSpotInstances?: boolean;
        spotInstanceTypes?: string[];
      };
    };
  }>;
  
  /** Container insights configuration */
  containerInsights?: boolean;
  
  /** Execute command configuration */
  executeCommandConfiguration?: {
    /** Enable execute command */
    enabled?: boolean;
    /** CloudWatch log group for execute command logs */
    logGroup?: string;
    /** S3 bucket for execute command logs */
    s3Bucket?: string;
    /** S3 key prefix */
    s3KeyPrefix?: string;
  };
  
  /** Service connect defaults */
  defaultServiceConnect?: {
    /** Enable service connect */
    enabled?: boolean;
    /** Default namespace */
    namespace?: string;
  };
  
  /** Tags for the cluster */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for ECS Cluster component
 */
export const ECS_CLUSTER_CONFIG_SCHEMA = {
  type: 'object',
  title: 'ECS Cluster Configuration',
  description: 'Configuration for creating an ECS cluster',
  properties: {
    clusterName: {
      type: 'string',
      description: 'Name of the cluster (will be auto-generated if not provided)',
      pattern: '^[a-zA-Z0-9_-]+$',
      maxLength: 255
    },
    vpc: {
      type: 'object',
      description: 'VPC configuration',
      properties: {
        vpcId: {
          type: 'string',
          description: 'VPC ID where cluster will be created'
        },
        subnetIds: {
          type: 'array',
          description: 'Subnet IDs for cluster resources',
          items: { type: 'string' }
        }
      },
      additionalProperties: false
    },
    capacityProviders: {
      type: 'array',
      description: 'Capacity provider configuration',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Provider type',
            enum: ['FARGATE', 'FARGATE_SPOT', 'EC2']
          },
          weight: {
            type: 'number',
            description: 'Weight for capacity provider strategy',
            minimum: 0,
            maximum: 1000,
            default: 1
          },
          base: {
            type: 'number',
            description: 'Base capacity',
            minimum: 0,
            maximum: 10000,
            default: 0
          },
          ec2Configuration: {
            type: 'object',
            description: 'EC2 capacity configuration',
            properties: {
              instanceType: {
                type: 'string',
                description: 'EC2 instance type',
                default: 'm5.large'
              },
              minSize: {
                type: 'number',
                description: 'Minimum cluster size',
                minimum: 0,
                default: 0
              },
              maxSize: {
                type: 'number',
                description: 'Maximum cluster size',
                minimum: 1,
                default: 100
              },
              desiredSize: {
                type: 'number',
                description: 'Desired cluster size',
                minimum: 0,
                default: 2
              },
              autoScalingGroup: {
                type: 'object',
                properties: {
                  enableSpotInstances: {
                    type: 'boolean',
                    description: 'Enable spot instances',
                    default: false
                  },
                  spotInstanceTypes: {
                    type: 'array',
                    description: 'Spot instance types',
                    items: { type: 'string' }
                  }
                },
                additionalProperties: false
              }
            },
            additionalProperties: false
          }
        },
        required: ['type'],
        additionalProperties: false
      },
      default: [{ type: 'FARGATE', weight: 1 }]
    },
    containerInsights: {
      type: 'boolean',
      description: 'Enable container insights',
      default: false
    },
    executeCommandConfiguration: {
      type: 'object',
      description: 'Execute command configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable execute command',
          default: false
        },
        logGroup: {
          type: 'string',
          description: 'CloudWatch log group for execute command logs'
        },
        s3Bucket: {
          type: 'string',
          description: 'S3 bucket for execute command logs'
        },
        s3KeyPrefix: {
          type: 'string',
          description: 'S3 key prefix for execute command logs'
        }
      },
      additionalProperties: false,
      default: { enabled: false }
    },
    defaultServiceConnect: {
      type: 'object',
      description: 'Default service connect configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable service connect',
          default: false
        },
        namespace: {
          type: 'string',
          description: 'Service connect namespace'
        }
      },
      additionalProperties: false,
      default: { enabled: false }
    },
    tags: {
      type: 'object',
      description: 'Tags for the cluster',
      additionalProperties: { type: 'string' },
      default: {}
    }
  },
  additionalProperties: false,
  defaults: {
    capacityProviders: [{ type: 'FARGATE', weight: 1 }],
    containerInsights: false,
    executeCommandConfiguration: { enabled: false },
    defaultServiceConnect: { enabled: false },
    tags: {}
  }
};

/**
 * Configuration builder for ECS Cluster component
 */
export class EcsClusterConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  public async build(): Promise<EcsClusterConfig> {
    return this.buildSync();
  }

  public buildSync(): EcsClusterConfig {
    const platformDefaults = this.getPlatformDefaults();
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    const userConfig = this.spec.config || {};
    
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as EcsClusterConfig;
  }

  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private getPlatformDefaults(): Record<string, any> {
    return {
      capacityProviders: [
        { type: 'FARGATE', weight: 1, base: 1 }
      ],
      containerInsights: this.getDefaultContainerInsights(),
      executeCommandConfiguration: {
        enabled: this.getDefaultExecuteCommand()
      },
      tags: {
        'service': this.context.serviceName,
        'environment': this.context.environment
      }
    };
  }

  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          containerInsights: true, // Required for compliance monitoring
          executeCommandConfiguration: {
            enabled: true, // Enabled with logging for compliance
            logGroup: this.getComplianceLogGroup()
          },
          // Prefer EC2 for more control in compliance environments
          capacityProviders: [
            { type: 'EC2', weight: 2, base: 1 },
            { type: 'FARGATE', weight: 1, base: 0 }
          ],
          tags: {
            'compliance-framework': 'fedramp-moderate',
            'container-insights': 'enabled',
            'execute-command-logging': 'enabled'
          }
        };
        
      case 'fedramp-high':
        return {
          containerInsights: true, // Mandatory monitoring
          executeCommandConfiguration: {
            enabled: true, // Mandatory with comprehensive logging
            logGroup: this.getComplianceLogGroup(),
            s3Bucket: this.getComplianceS3Bucket()
          },
          // EC2 only for maximum control in high security
          capacityProviders: [
            { type: 'EC2', weight: 1, base: 2 }
          ],
          tags: {
            'compliance-framework': 'fedramp-high',
            'container-insights': 'enabled',
            'execute-command-logging': 'comprehensive',
            'security-level': 'high'
          }
        };
        
      default: // commercial
        return {
          containerInsights: false,
          executeCommandConfiguration: {
            enabled: false
          }
        };
    }
  }

  private getDefaultContainerInsights(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getDefaultExecuteCommand(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getComplianceLogGroup(): string {
    return `/aws/ecs/${this.context.serviceName}/execute-command`;
  }

  private getComplianceS3Bucket(): string {
    return `${this.context.serviceName}-ecs-execute-command-logs`;
  }
}

/**
 * ECS Cluster Component implementing Component API Contract v1.0
 */
export class EcsClusterComponent extends Component {
  private cluster?: ecs.Cluster;
  private vpc?: ec2.IVpc;
  private capacityProvider?: ecs.AsgCapacityProvider;
  private autoScalingGroup?: autoscaling.AutoScalingGroup;
  private executeCommandLogGroup?: logs.LogGroup;
  private config?: EcsClusterConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting ECS Cluster component synthesis', {
      clusterName: this.spec.config?.clusterName,
      capacityProviders: this.spec.config?.capacityProviders?.length
    });
    
    const startTime = Date.now();
    
    try {
      const configBuilder = new EcsClusterConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      this.logComponentEvent('config_built', 'ECS Cluster configuration built successfully', {
        clusterName: this.config.clusterName,
        capacityProvidersCount: this.config.capacityProviders?.length || 0,
        containerInsights: this.config.containerInsights
      });
      
      this.lookupVpcIfNeeded();
      this.createExecuteCommandLogGroupIfNeeded();
      this.createAutoScalingGroupIfNeeded();
      this.createCluster();
      this.applyComplianceHardening();
      this.configureObservabilityForCluster();
    
      this.registerConstruct('cluster', this.cluster!);
      if (this.vpc) {
        this.registerConstruct('vpc', this.vpc);
      }
      if (this.capacityProvider) {
        this.registerConstruct('capacityProvider', this.capacityProvider);
      }
      if (this.executeCommandLogGroup) {
        this.registerConstruct('executeCommandLogGroup', this.executeCommandLogGroup);
      }
    
      this.registerCapability('container:ecs-cluster', this.buildClusterCapability());
    
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'ECS Cluster component synthesis completed successfully', {
        clusterCreated: 1,
        capacityProvidersConfigured: this.config.capacityProviders?.length || 0,
        containerInsights: this.config.containerInsights
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'ecs-cluster',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'ecs-cluster';
  }

  private lookupVpcIfNeeded(): void {
    if (this.config!.vpc?.vpcId) {
      this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
        vpcId: this.config!.vpc.vpcId
      });
    }
  }

  private createExecuteCommandLogGroupIfNeeded(): void {
    if (this.config!.executeCommandConfiguration?.enabled) {
      const logGroupName = this.config!.executeCommandConfiguration.logGroup || 
        `/aws/ecs/${this.buildClusterName()}/execute-command`;

      this.executeCommandLogGroup = new logs.LogGroup(this, 'ExecuteCommandLogGroup', {
        logGroupName: logGroupName,
        retention: this.getLogRetention(),
        removalPolicy: this.getLogRemovalPolicy()
      });

      this.applyStandardTags(this.executeCommandLogGroup, {
        'log-type': 'ecs-execute-command',
        'cluster': this.buildClusterName()!,
        'retention': this.getLogRetention().toString()
      });
    }
  }

  private createAutoScalingGroupIfNeeded(): void {
    const ec2Providers = this.config!.capacityProviders?.filter(cp => cp.type === 'EC2');
    
    if (ec2Providers && ec2Providers.length > 0 && this.vpc) {
      const ec2Config = ec2Providers[0].ec2Configuration!;
      
      this.autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
        vpc: this.vpc,
        instanceType: new ec2.InstanceType(ec2Config.instanceType || 'm5.large'),
        machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
        minCapacity: ec2Config.minSize || 0,
        maxCapacity: ec2Config.maxSize || 100,
        desiredCapacity: ec2Config.desiredSize || 2,
        userData: ec2.UserData.forLinux(),
        spotPrice: ec2Config.autoScalingGroup?.enableSpotInstances ? '0.10' : undefined
      });

      // Configure user data for ECS
      this.autoScalingGroup.addUserData(
        `#!/bin/bash`,
        `echo ECS_CLUSTER=${this.buildClusterName()} >> /etc/ecs/ecs.config`
      );

      this.applyStandardTags(this.autoScalingGroup, {
        'cluster-name': this.buildClusterName()!,
        'instance-type': ec2Config.instanceType || 'm5.large',
        'capacity-type': 'ec2',
        'spot-enabled': (ec2Config.autoScalingGroup?.enableSpotInstances || false).toString()
      });
    }
  }

  private createCluster(): void {
    const clusterProps: ecs.ClusterProps = {
      clusterName: this.buildClusterName(),
      vpc: this.vpc,
      containerInsights: this.config!.containerInsights,
      executeCommandConfiguration: this.buildExecuteCommandConfiguration()
    };

    this.cluster = new ecs.Cluster(this, 'Cluster', clusterProps);

    // Configure capacity providers
    this.configureCapacityProviders();

    this.applyStandardTags(this.cluster, {
      'cluster-name': this.buildClusterName()!,
      'container-insights': (this.config!.containerInsights || false).toString(),
      'execute-command': (this.config!.executeCommandConfiguration?.enabled || false).toString(),
      'capacity-providers': this.config!.capacityProviders?.map(cp => cp.type).join(',') || 'FARGATE'
    });

    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.cluster!).add(key, value);
      });
    }
    
    this.logResourceCreation('ecs-cluster', this.buildClusterName()!, {
      clusterName: this.buildClusterName(),
      containerInsights: this.config!.containerInsights,
      capacityProvidersCount: this.config!.capacityProviders?.length || 0
    });
  }

  private buildExecuteCommandConfiguration(): ecs.ExecuteCommandConfiguration | undefined {
    if (!this.config!.executeCommandConfiguration?.enabled) {
      return undefined;
    }

    return {
      logConfiguration: {
        cloudWatchLogGroup: this.executeCommandLogGroup,
        s3Bucket: this.config!.executeCommandConfiguration.s3Bucket ? 
          s3.Bucket.fromBucketName(this, 'ExecuteCommandBucket', this.config!.executeCommandConfiguration.s3Bucket) : 
          undefined,
        s3KeyPrefix: this.config!.executeCommandConfiguration.s3KeyPrefix
      }
    };
  }

  private configureCapacityProviders(): void {
    if (!this.config!.capacityProviders) {
      return;
    }

    this.config!.capacityProviders.forEach((providerConfig, index) => {
      switch (providerConfig.type) {
        case 'FARGATE':
          this.cluster!.addCapacity('FargateCapacity', {
            capacityProviders: [ecs.CapacityProvider.FARGATE]
          });
          break;

        case 'FARGATE_SPOT':
          this.cluster!.addCapacity('FargateSpotCapacity', {
            capacityProviders: [ecs.CapacityProvider.FARGATE_SPOT]
          });
          break;

        case 'EC2':
          if (this.autoScalingGroup) {
            this.capacityProvider = new ecs.AsgCapacityProvider(this, `CapacityProvider${index}`, {
              autoScalingGroup: this.autoScalingGroup,
              enableManagedScaling: true,
              enableManagedTerminationProtection: this.context.complianceFramework !== 'commercial'
            });

            this.cluster!.addAsgCapacityProvider(this.capacityProvider);

            this.applyStandardTags(this.capacityProvider, {
              'capacity-provider-type': 'ec2',
              'cluster': this.buildClusterName()!,
              'managed-scaling': 'enabled'
            });
          }
          break;
      }
    });
  }

  private buildClusterName(): string | undefined {
    if (this.config!.clusterName) {
      return this.config!.clusterName;
    }
    return `${this.context.serviceName}-${this.spec.name}`;
  }

  private getLogRetention(): logs.RetentionDays {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return logs.RetentionDays.TEN_YEARS;
      case 'fedramp-moderate':
        return logs.RetentionDays.ONE_YEAR;
      default:
        return logs.RetentionDays.THREE_MONTHS;
    }
  }

  private getLogRemovalPolicy(): cdk.RemovalPolicy {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) 
      ? cdk.RemovalPolicy.RETAIN 
      : cdk.RemovalPolicy.DESTROY;
  }

  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }

  private applyCommercialHardening(): void {
    // Basic security logging
    if (this.cluster) {
      const securityLogGroup = new logs.LogGroup(this, 'SecurityLogGroup', {
        logGroupName: `/aws/ecs/${this.buildClusterName()}/security`,
        retention: logs.RetentionDays.THREE_MONTHS,
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });

      this.applyStandardTags(securityLogGroup, {
        'log-type': 'security',
        'retention': '3-months'
      });
    }
  }

  private applyFedrampModerateHardening(): void {
    this.applyCommercialHardening();

    if (this.cluster) {
      const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
        logGroupName: `/aws/ecs/${this.buildClusterName()}/compliance`,
        retention: logs.RetentionDays.ONE_YEAR,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      this.applyStandardTags(complianceLogGroup, {
        'log-type': 'compliance',
        'retention': '1-year',
        'compliance': 'fedramp-moderate'
      });
    }
  }

  private applyFedrampHighHardening(): void {
    this.applyFedrampModerateHardening();

    if (this.cluster) {
      const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
        logGroupName: `/aws/ecs/${this.buildClusterName()}/audit`,
        retention: logs.RetentionDays.TEN_YEARS,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      this.applyStandardTags(auditLogGroup, {
        'log-type': 'audit',
        'retention': '10-years',
        'compliance': 'fedramp-high'
      });
    }
  }

  private buildClusterCapability(): any {
    return {
      clusterArn: this.cluster!.clusterArn,
      clusterName: this.buildClusterName()
    };
  }

  private configureObservabilityForCluster(): void {
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const clusterName = this.buildClusterName()!;

    // 1. Cluster Utilization Alarm
    const cpuUtilizationAlarm = new cloudwatch.Alarm(this, 'ClusterCpuUtilizationAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-high-cpu-utilization`,
      alarmDescription: 'ECS Cluster high CPU utilization alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          ClusterName: clusterName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 80,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(cpuUtilizationAlarm, {
      'alarm-type': 'high-cpu-utilization',
      'metric-type': 'performance',
      'threshold': '80'
    });

    // 2. Service Count Alarm
    const serviceCountAlarm = new cloudwatch.Alarm(this, 'ServiceCountAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-service-count`,
      alarmDescription: 'ECS Cluster service count monitoring alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'ServiceCount',
        dimensionsMap: {
          ClusterName: clusterName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(15)
      }),
      threshold: 50, // High service count threshold
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(serviceCountAlarm, {
      'alarm-type': 'service-count',
      'metric-type': 'capacity',
      'threshold': '50'
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to ECS Cluster', {
      alarmsCreated: 2,
      clusterName: clusterName,
      monitoringEnabled: true
    });
  }
}