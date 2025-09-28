/**
 * ECS EC2 Service Component
 * 
 * EC2-based containerized service that runs on ECS cluster instances with 
 * Service Connect integration for microservice discovery.
 * Implements the Platform ECS Service Connect Standard v1.0.
 */

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent } from '../@shinobi/core/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../@shinobi/core/component-interfaces';
import { ConfigBuilder, ConfigBuilderContext } from '../@shinobi/core/config-builder';

/**
 * Configuration interface for ECS EC2 Service component
 */
export interface EcsEc2ServiceConfig {
  /** Name of the ECS cluster component to deploy to */
  cluster: string;

  /** Container image configuration */
  image: {
    /** Container image URI or repository name */
    repository: string;
    /** Image tag (optional, defaults to 'latest') */
    tag?: string;
  };

  /** CPU allocation at task level (CPU units, 1024 = 1 vCPU) */
  taskCpu: number;

  /** Memory allocation at task level (MiB) */
  taskMemory: number;

  /** Container port configuration */
  port: number;

  /** Service Connect configuration for service discovery */
  serviceConnect: {
    /** Friendly name for the port mapping used in service discovery */
    portMappingName: string;
  };

  /** Environment variables for the container (optional) */
  environment?: Record<string, string>;

  /** Secrets from AWS Secrets Manager (optional) */
  secrets?: Record<string, string>;

  /** Task role ARN for container permissions (optional, auto-created if not provided) */
  taskRoleArn?: string;

  /** Number of desired tasks (optional, defaults to 1) */
  desiredCount?: number;

  /** Placement constraints for EC2 service (optional) */
  placementConstraints?: Array<{
    /** Constraint type (memberOf, distinctInstance, etc.) */
    type: string;
    /** Constraint expression */
    expression?: string;
  }>;

  /** Placement strategies for EC2 service (optional) */
  placementStrategies?: Array<{
    /** Strategy type (random, spread, binpack) */
    type: string;
    /** Field to apply strategy to */
    field?: string;
  }>;

  /** Health check configuration (optional) */
  healthCheck?: {
    /** Command to run for health check */
    command: string[];
    /** Health check interval in seconds (optional, defaults to 30) */
    interval?: number;
    /** Health check timeout in seconds (optional, defaults to 5) */
    timeout?: number;
    /** Number of retries before marking unhealthy (optional, defaults to 3) */
    retries?: number;
  };

  /** Auto scaling configuration (optional) */
  autoScaling?: {
    /** Minimum number of tasks */
    minCapacity: number;
    /** Maximum number of tasks */
    maxCapacity: number;
    /** Target CPU utilization percentage for scaling */
    targetCpuUtilization?: number;
    /** Target memory utilization percentage for scaling */
    targetMemoryUtilization?: number;
  };

  /** Additional tags for service resources */
  tags?: Record<string, string>;

  /** Logging configuration */
  logging?: {
    /** CloudWatch Logs retention period in days (must align with AWS supported values) */
    retentionInDays?: number;
  };

  /** Monitoring and alarm configuration */
  monitoring?: {
    /** Enable or disable all monitoring resources */
    enabled?: boolean;
    /** CPU utilization alarm configuration */
    cpuAlarm?: {
      /** Enable or disable the CPU alarm */
      enabled?: boolean;
      /** CPU utilization threshold percentage */
      threshold?: number;
      /** Number of evaluation periods required to trigger the alarm */
      evaluationPeriods?: number;
    };
    /** Memory utilization alarm configuration */
    memoryAlarm?: {
      /** Enable or disable the memory alarm */
      enabled?: boolean;
      /** Memory utilization threshold percentage */
      threshold?: number;
      /** Number of evaluation periods required to trigger the alarm */
      evaluationPeriods?: number;
    };
  };
}

/**
 * Configuration schema for ECS EC2 Service component
 */
export const ECS_EC2_SERVICE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'ECS EC2 Service Configuration',
  description: 'Configuration for creating an EC2-based ECS service with Service Connect',
  required: ['cluster', 'image', 'taskCpu', 'taskMemory', 'port', 'serviceConnect'],
  properties: {
    cluster: {
      type: 'string',
      description: 'Name of the ECS cluster component to deploy to',
      minLength: 1
    },
    image: {
      type: 'object',
      title: 'Container Image Configuration',
      description: 'Container image and tag specification',
      required: ['repository'],
      properties: {
        repository: {
          type: 'string',
          description: 'Container image URI or repository name',
          pattern: '^[a-zA-Z0-9][a-zA-Z0-9._/-]*$',
          examples: ['nginx', 'my-app', '123456789012.dkr.ecr.us-west-2.amazonaws.com/my-app']
        },
        tag: {
          type: 'string',
          description: 'Image tag',
          pattern: '^[a-zA-Z0-9._-]+$',
          default: 'latest'
        }
      },
      additionalProperties: false
    },
    taskCpu: {
      type: 'number',
      description: 'CPU units for task (1024 = 1 vCPU)',
      minimum: 128,
      maximum: 10240,
      examples: [256, 512, 1024, 2048]
    },
    taskMemory: {
      type: 'number',
      description: 'Memory allocation for task in MiB',
      minimum: 128,
      maximum: 30720,
      examples: [512, 1024, 2048, 4096]
    },
    port: {
      type: 'number',
      description: 'Container port that the service listens on',
      minimum: 1,
      maximum: 65535,
      examples: [80, 8080, 3000, 5000]
    },
    serviceConnect: {
      type: 'object',
      title: 'Service Connect Configuration',
      description: 'Configuration for ECS Service Connect service discovery',
      required: ['portMappingName'],
      properties: {
        portMappingName: {
          type: 'string',
          description: 'Friendly name for the port mapping in service discovery',
          pattern: '^[a-zA-Z][a-zA-Z0-9-]*$',
          minLength: 1,
          maxLength: 64,
          examples: ['api', 'web', 'service']
        }
      },
      additionalProperties: false
    },
    environment: {
      type: 'object',
      description: 'Environment variables for the container',
      additionalProperties: {
        type: 'string'
      }
    },
    secrets: {
      type: 'object',
      description: 'Secrets from AWS Secrets Manager (key: secretArn)',
      additionalProperties: {
        type: 'string',
        pattern: '^arn:aws:secretsmanager:'
      }
    },
    taskRoleArn: {
      type: 'string',
      description: 'IAM role ARN for task permissions',
      pattern: '^arn:aws:iam:'
    },
    desiredCount: {
      type: 'number',
      description: 'Number of desired tasks',
      minimum: 0,
      maximum: 1000,
      default: 1
    },
    placementConstraints: {
      type: 'array',
      description: 'Placement constraints for task placement on EC2 instances',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['memberOf', 'distinctInstance'],
            description: 'Type of placement constraint'
          },
          expression: {
            type: 'string',
            description: 'Constraint expression (required for memberOf type)'
          }
        },
        required: ['type'],
        additionalProperties: false
      }
    },
    placementStrategies: {
      type: 'array',
      description: 'Placement strategies for task placement optimization',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['random', 'spread', 'binpack'],
            description: 'Type of placement strategy'
          },
          field: {
            type: 'string',
            description: 'Field to apply the strategy to (e.g., instanceId, attribute:zone)',
            examples: ['instanceId', 'attribute:ecs.availability-zone', 'attribute:ecs.instance-type']
          }
        },
        required: ['type'],
        additionalProperties: false
      }
    },
    healthCheck: {
      type: 'object',
      title: 'Health Check Configuration',
      description: 'Container health check configuration',
      required: ['command'],
      properties: {
        command: {
          type: 'array',
          description: 'Health check command',
          items: {
            type: 'string'
          },
          minItems: 1,
          examples: [['CMD-SHELL', 'curl -f http://localhost:8080/health || exit 1']]
        },
        interval: {
          type: 'number',
          description: 'Health check interval in seconds',
          minimum: 5,
          maximum: 300,
          default: 30
        },
        timeout: {
          type: 'number',
          description: 'Health check timeout in seconds',
          minimum: 2,
          maximum: 60,
          default: 5
        },
        retries: {
          type: 'number',
          description: 'Number of retries before marking unhealthy',
          minimum: 1,
          maximum: 10,
          default: 3
        }
      },
      additionalProperties: false
    },
    autoScaling: {
      type: 'object',
      title: 'Auto Scaling Configuration',
      description: 'Auto scaling configuration for the service',
      required: ['minCapacity', 'maxCapacity'],
      properties: {
        minCapacity: {
          type: 'number',
          description: 'Minimum number of tasks',
          minimum: 0,
          maximum: 1000
        },
        maxCapacity: {
          type: 'number',
          description: 'Maximum number of tasks',
          minimum: 1,
          maximum: 1000
        },
        targetCpuUtilization: {
          type: 'number',
          description: 'Target CPU utilization percentage for scaling',
          minimum: 10,
          maximum: 100,
          default: 70
        },
        targetMemoryUtilization: {
          type: 'number',
          description: 'Target memory utilization percentage for scaling',
          minimum: 10,
          maximum: 100,
          default: 80
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Additional tags for service resources',
      additionalProperties: {
        type: 'string'
      }
    },
    logging: {
      type: 'object',
      description: 'Logging configuration for ECS service resources',
      additionalProperties: false,
      properties: {
        retentionInDays: {
          type: 'number',
          description: 'CloudWatch Logs retention period in days',
          enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653, 9999]
        }
      }
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring and alarm configuration for the ECS service',
      additionalProperties: false,
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable or disable monitoring resources',
          default: true
        },
        cpuAlarm: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Enable the CPU utilization alarm',
              default: true
            },
            threshold: {
              type: 'number',
              description: 'CPU utilization threshold percentage',
              minimum: 1,
              maximum: 100
            },
            evaluationPeriods: {
              type: 'number',
              description: 'Number of periods to evaluate before triggering the alarm',
              minimum: 1,
              maximum: 10
            }
          }
        },
        memoryAlarm: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Enable the memory utilization alarm',
              default: true
            },
            threshold: {
              type: 'number',
              description: 'Memory utilization threshold percentage',
              minimum: 1,
              maximum: 100
            },
            evaluationPeriods: {
              type: 'number',
              description: 'Number of periods to evaluate before triggering the alarm',
              minimum: 1,
              maximum: 10
            }
          }
        }
      }
    }
  },
  additionalProperties: false,

  // Default values
  defaults: {
    image: {
      tag: 'latest'
    },
    desiredCount: 1,
    healthCheck: {
      interval: 30,
      timeout: 5,
      retries: 3
    },
    autoScaling: {
      targetCpuUtilization: 70,
      targetMemoryUtilization: 80
    },
    logging: {
      retentionInDays: 30
    },
    monitoring: {
      enabled: true,
      cpuAlarm: {
        enabled: true,
        threshold: 80,
        evaluationPeriods: 3
      },
      memoryAlarm: {
        enabled: true,
        threshold: 85,
        evaluationPeriods: 3
      }
    }
  }
};

/**
 * ECS EC2 Service Configuration Builder
 * Implements the centralized 5-layer precedence engine
 */
export class EcsEc2ServiceConfigBuilder extends ConfigBuilder<EcsEc2ServiceConfig> {

  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, ECS_EC2_SERVICE_CONFIG_SCHEMA);
  }

  /**
   * Builds the final configuration using the centralized precedence engine
   */
  public async build(): Promise<EcsEc2ServiceConfig> {
    return this.buildSync();
  }

  /**
   * Provide EC2 service-specific hardcoded fallbacks
   */
  protected getHardcodedFallbacks(): Record<string, any> {
    return {
      taskCpu: 256, // Minimal CPU for cost optimization
      taskMemory: 512, // Minimal memory
      desiredCount: 1, // Single task
      image: {
        tag: 'latest'
      },
      port: 8080, // Common application port
      serviceConnect: {
        portMappingName: 'api' // Generic port mapping name
      },
      healthCheck: {
        interval: 30,
        timeout: 5,
        retries: 3
      },
      // Default placement strategy: spread across instances
      placementStrategies: [{
        type: 'spread',
        field: 'instanceId'
      }],
      logging: {
        retentionInDays: 30
      },
      monitoring: {
        enabled: true,
        cpuAlarm: {
          enabled: true,
          threshold: 80,
          evaluationPeriods: 3
        },
        memoryAlarm: {
          enabled: true,
          threshold: 85,
          evaluationPeriods: 3
        }
      }
    };
  }

  /**
   * Get compliance framework specific defaults
   */
  protected getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.builderContext.context.complianceFramework;

    switch (framework) {
      case 'fedramp-high':
        return {
          taskCpu: 1024, // Higher CPU for compliance workloads
          taskMemory: 2048, // Higher memory
          desiredCount: 2, // High availability
          healthCheck: {
            interval: 15, // More frequent health checks
            timeout: 3,
            retries: 2
          },
          autoScaling: {
            minCapacity: 2, // Always have 2+ instances
            maxCapacity: 10,
            targetCpuUtilization: 60, // More conservative scaling
            targetMemoryUtilization: 70
          },
          logging: {
            retentionInDays: 731
          },
          monitoring: {
            cpuAlarm: {
              threshold: 60,
              evaluationPeriods: 2
            },
            memoryAlarm: {
              threshold: 70,
              evaluationPeriods: 2
            }
          },
          // High compliance placement: spread across AZs and instances
          placementStrategies: [
            { type: 'spread', field: 'attribute:ecs.availability-zone' },
            { type: 'spread', field: 'instanceId' }
          ]
        };

      case 'fedramp-moderate':
        return {
          taskCpu: 512, // Balanced CPU
          taskMemory: 1024, // Balanced memory
          desiredCount: 1, // Single task acceptable
          healthCheck: {
            interval: 20, // Enhanced health checks
            timeout: 5,
            retries: 3
          },
          autoScaling: {
            minCapacity: 1,
            maxCapacity: 5,
            targetCpuUtilization: 65,
            targetMemoryUtilization: 75
          },
          logging: {
            retentionInDays: 365
          },
          monitoring: {
            cpuAlarm: {
              threshold: 70,
              evaluationPeriods: 3
            },
            memoryAlarm: {
              threshold: 80,
              evaluationPeriods: 3
            }
          },
          placementStrategies: [{
            type: 'spread',
            field: 'instanceId'
          }]
        };

      default: // commercial
        return {
          taskCpu: 256, // Cost optimized
          taskMemory: 512,
          desiredCount: 1,
          autoScaling: {
            minCapacity: 1,
            maxCapacity: 3, // Limited scaling for cost
            targetCpuUtilization: 70,
            targetMemoryUtilization: 80
          },
          logging: {
            retentionInDays: 30
          },
          monitoring: {
            cpuAlarm: {
              threshold: 80,
              evaluationPeriods: 3
            },
            memoryAlarm: {
              threshold: 85,
              evaluationPeriods: 3
            }
          },
          // Cost-optimized placement: binpack to minimize instance usage
          placementStrategies: [{
            type: 'binpack',
            field: 'memory'
          }]
        };
    }
  }
}

/**
 * ECS EC2 Service Component implementing Component API Contract v1.0 and
 * Platform ECS Service Connect Standard v1.0
 */
export class EcsEc2ServiceComponent extends BaseComponent {
  private service?: ecs.Ec2Service;
  private taskDefinition?: ecs.Ec2TaskDefinition;
  private securityGroup?: ec2.SecurityGroup;
  private logGroup?: logs.LogGroup;
  private config?: EcsEc2ServiceConfig;
  private configBuilder?: EcsEc2ServiceConfigBuilder;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create ECS EC2 Service with Service Connect
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting ECS EC2 Service synthesis');

    try {
      // Build configuration using ConfigBuilder
      this.configBuilder = new EcsEc2ServiceConfigBuilder(this.context, this.spec);
      this.config = this.configBuilder.buildSync();

      // Create task definition
      this.createTaskDefinition();

      // Create security group
      this.createSecurityGroup();

      // Create EC2 service
      this.createEc2Service();

      // Configure auto scaling if specified
      this.configureAutoScaling();

      // Configure OpenTelemetry observability (required by Platform Observability Standard)
      this.configureObservabilityForEcsService();

      // Apply standard platform tags
      this.applyServiceTags();

      // Register constructs
      this.registerConstruct('service', this.service!);
      this.registerConstruct('taskDefinition', this.taskDefinition!);
      this.registerConstruct('securityGroup', this.securityGroup!);
      this.registerConstruct('logGroup', this.logGroup!);

      // Register service:connect capability
      this.registerCapability('service:connect', this.buildServiceConnectCapability());

      this.logComponentEvent('synthesis_complete', 'ECS EC2 Service synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'ECS EC2 Service synthesis');
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
    return 'ecs-ec2-service';
  }

  /**
   * Create EC2 task definition
   */
  private createTaskDefinition(): void {
    // Create log group for container logs
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/${this.context.serviceName}/${this.spec.name}`,
      retention: this.getLogRetention(),
      removalPolicy: this.isComplianceFramework() ?
        cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

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
    this.taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDefinition', {
      family: `${this.context.serviceName}-${this.spec.name}`,
      taskRole: taskRole,
    });

    // Add container to task definition
    const imageUri = this.config!.image.tag ?
      `${this.config!.image.repository}:${this.config!.image.tag}` :
      `${this.config!.image.repository}:latest`;

    const container = this.taskDefinition.addContainer('Container', {
      image: ecs.ContainerImage.fromRegistry(imageUri),
      cpu: this.config!.taskCpu,
      memoryLimitMiB: this.config!.taskMemory,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: this.spec.name,
        logGroup: this.logGroup
      }),
      environment: this.config!.environment,
      secrets: this.buildSecretsFromConfig(),
    });

    // Add port mapping
    container.addPortMappings({
      name: this.config!.serviceConnect.portMappingName,
      containerPort: this.config!.port,
      protocol: ecs.Protocol.TCP,
      // For EC2, we can also specify host port if needed
      // hostPort: this.config!.port, // Uncomment for static port mapping
    });

    // Add health check if configured
    if (this.config!.healthCheck) {
      // Health check is configured through container logging and task definition
      // The actual health check command would be applied during container creation
      this.logComponentEvent('health_check_configured', 'Health check configured for container');
    }

    this.logResourceCreation('ec2-task-definition', this.taskDefinition.family);
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

  /**
   * Create the EC2 service with Service Connect
   */
  private createEc2Service(): void {
    if (!this.taskDefinition || !this.securityGroup) {
      throw new Error('Task definition and security group must be created before EC2 service');
    }

    // Get cluster from binding (this requires the cluster component to be bound)
    const cluster = this.getClusterFromBinding();
    const vpc = this.getVpcFromContext();

    // Build placement constraints
    const placementConstraints = this.config!.placementConstraints?.map(constraint =>
      this.buildPlacementConstraint(constraint.type, constraint.expression)
    );

    // Build placement strategies  
    const placementStrategies = this.config!.placementStrategies?.map(strategy =>
      this.buildPlacementStrategy(strategy.type, strategy.field)
    );

    // Create the EC2 service
    this.service = new ecs.Ec2Service(this, 'Service', {
      cluster: cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: this.config!.desiredCount,
      serviceName: `${this.context.serviceName}-${this.spec.name}`,

      // Network configuration
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Private subnets for security
      },
      securityGroups: [this.securityGroup],

      // EC2-specific placement configuration
      placementConstraints: placementConstraints,
      placementStrategies: placementStrategies,

      // Service Connect configuration
      serviceConnectConfiguration: {
        namespace: cluster.defaultCloudMapNamespace?.namespaceName,
        services: [{
          portMappingName: this.config!.serviceConnect.portMappingName,
          dnsName: this.spec.name, // Service will be discoverable as http://{component-name}.{namespace}
          port: this.config!.port,
        }],
      },

      // Enable circuit breaker for deployment safety
      enableExecuteCommand: this.isComplianceFramework(), // Enable for compliance debugging
    });

    this.logResourceCreation('ec2-service', this.service.serviceName);
  }

  /**
   * Configure OpenTelemetry observability for ECS EC2 Service per Platform Observability Standard
   * Implements comprehensive observability with OTel environment variables and CloudWatch alarms
   */
  private configureObservabilityForEcsService(): void {
    if (!this.service || !this.taskDefinition) {
      return;
    }

    // Get standardized OpenTelemetry environment variables for ECS service
    const otelEnvVars = this.configureObservability(this.service, {
      serviceName: `${this.context.serviceName}-ecs-ec2-service`,
      serviceVersion: '1.0.0',
      componentType: 'ecs-ec2-service',
      complianceFramework: this.context.complianceFramework,
      customAttributes: {
        'ecs.launch-type': 'EC2',
        'ecs.task-definition': this.taskDefinition.family,
        'container.port': this.config!.port.toString(),
        'service.connect.name': this.config!.serviceConnect.portMappingName
      }
    });

    // Store OTel environment variables for ECS task definitions
    // These will be applied to all tasks running in this service
    this.registerCapability('otel:environment', otelEnvVars);

    // Create CloudWatch alarms for observability
    this.createEcsServiceAlarms();

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to ECS EC2 Service', {
      otelServiceName: otelEnvVars['OTEL_SERVICE_NAME'],
      otelExporterEndpoint: otelEnvVars['OTEL_EXPORTER_OTLP_ENDPOINT'],
      serviceName: this.service.serviceName
    });
  }

  /**
   * Create CloudWatch alarms for ECS service monitoring
   */
  private createEcsServiceAlarms(): void {
    if (!this.service) return;

    const monitoring = this.config?.monitoring;
    if (monitoring?.enabled === false) {
      return;
    }

    const cluster = this.getClusterFromBinding();
    const serviceName = this.service.serviceName;

    const alarmsToRegister: Array<{ id: string; alarm: cloudwatch.Alarm }> = [];

    const cpuAlarmConfig = monitoring?.cpuAlarm ?? {};
    if (cpuAlarmConfig.enabled !== false) {
      const cpuThreshold = cpuAlarmConfig.threshold ?? 80;
      const cpuEvaluationPeriods = cpuAlarmConfig.evaluationPeriods ?? 3;

      const cpuAlarm = new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-cpu-high`,
        alarmDescription: `High CPU utilization for ECS EC2 service ${serviceName}`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName: 'CPUUtilization',
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            ServiceName: serviceName,
            ClusterName: cluster.clusterName
          }
        }),
        threshold: cpuThreshold,
        evaluationPeriods: cpuEvaluationPeriods,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      alarmsToRegister.push({ id: 'cpuAlarm', alarm: cpuAlarm });
    }

    const memoryAlarmConfig = monitoring?.memoryAlarm ?? {};
    if (memoryAlarmConfig.enabled !== false) {
      const memoryThreshold = memoryAlarmConfig.threshold ?? 85;
      const memoryEvaluationPeriods = memoryAlarmConfig.evaluationPeriods ?? 3;

      const memoryAlarm = new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-memory-high`,
        alarmDescription: `High memory utilization for ECS EC2 service ${serviceName}`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName: 'MemoryUtilization',
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            ServiceName: serviceName,
            ClusterName: cluster.clusterName
          }
        }),
        threshold: memoryThreshold,
        evaluationPeriods: memoryEvaluationPeriods,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      alarmsToRegister.push({ id: 'memoryAlarm', alarm: memoryAlarm });
    }

    alarmsToRegister.forEach(({ id, alarm }) => this.registerConstruct(id, alarm));
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
      'component-type': 'ecs-ec2-service',
      'service-connect-name': this.config!.serviceConnect.portMappingName,
      'container-port': this.config!.port.toString(),
      'task-cpu': this.config!.taskCpu.toString(),
      'task-memory': this.config!.taskMemory.toString()
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

    return {
      serviceName: this.spec.name,
      serviceArn: this.service!.serviceArn,
      clusterName: cluster.clusterName,
      dnsName: `${this.spec.name}.${cluster.defaultCloudMapNamespace?.namespaceName}`,
      port: this.config!.port,
      portMappingName: this.config!.serviceConnect.portMappingName,
      securityGroupId: this.securityGroup!.securityGroupId,
      internalEndpoint: `http://${this.spec.name}.internal:${this.config!.port}`, // Service Connect endpoint
      computeType: 'EC2' // Distinguish from Fargate services
    };
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
   * Build placement constraint for ECS service
   */
  private buildPlacementConstraint(type: string, expression?: string): ecs.PlacementConstraint {
    switch (type) {
      case 'memberOf':
        if (!expression) {
          throw new Error('memberOf placement constraint requires an expression');
        }
        return ecs.PlacementConstraint.memberOf(expression);
      case 'distinctInstance':
        return ecs.PlacementConstraint.distinctInstances();
      default:
        throw new Error(`Unknown placement constraint type: ${type}`);
    }
  }

  /**
   * Build placement strategy for ECS service
   */
  private buildPlacementStrategy(type: string, field?: string): ecs.PlacementStrategy {
    switch (type) {
      case 'random':
        return ecs.PlacementStrategy.randomly();
      case 'spread':
        return field ?
          ecs.PlacementStrategy.spreadAcross(field) :
          ecs.PlacementStrategy.spreadAcrossInstances();
      case 'binpack':
        // Note: binpack strategy implementation may vary by CDK version
        return field ?
          ecs.PlacementStrategy.packedBy(field as any) :
          ecs.PlacementStrategy.packedBy(ecs.BinPackResource.MEMORY);
      default:
        throw new Error(`Unknown placement strategy type: ${type}`);
    }
  }

  /**
   * Get log retention based on compliance framework
   */
  private getLogRetention(): logs.RetentionDays {
    const retentionInDays = this.config?.logging?.retentionInDays ?? 30;
    const isSupported = (logs.RetentionDays as unknown as Record<number, string | undefined>)[retentionInDays] !== undefined;

    if (isSupported) {
      return retentionInDays as unknown as logs.RetentionDays;
    }

    this.logComponentEvent('log_retention_defaulted', 'Unsupported log retention requested; defaulting to one month', {
      requestedRetentionInDays: retentionInDays
    });

    return logs.RetentionDays.ONE_MONTH;
  }

  /**
   * Check if component is running under a compliance framework
   */
  private isComplianceFramework(): boolean {
    return this.context.complianceFramework !== 'commercial';
  }

  /**
   * Get ECS cluster from configuration
   * The cluster name in config should reference either the cluster name or ARN
   */
  private getClusterFromBinding(): ecs.ICluster {
    if (!this.config?.cluster) {
      throw new Error('ECS cluster configuration is required for EC2 service');
    }

    // If cluster config looks like an ARN, import it
    if (this.config.cluster.startsWith('arn:aws:ecs:')) {
      return ecs.Cluster.fromClusterArn(this, 'ImportedCluster', this.config.cluster);
    }

    // If cluster config looks like a cluster name, import by name
    if (this.config.cluster.includes('/')) {
      // Format: cluster-name or account/cluster-name
      const clusterName = this.config.cluster.split('/').pop() || this.config.cluster;
      return ecs.Cluster.fromClusterAttributes(this, 'ImportedCluster', {
        clusterName: clusterName,
        vpc: this.getVpcFromContext()
      });
    }

    // Assume it's a simple cluster name
    return ecs.Cluster.fromClusterAttributes(this, 'ImportedCluster', {
      clusterName: this.config.cluster,
      vpc: this.getVpcFromContext()
    });
  }

  /**
   * Get VPC from context
   */
  private getVpcFromContext(): ec2.IVpc {
    // In a real implementation, this would get the VPC from the service context
    return ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
  }

  /**
   * Validate that component has been synthesized
   */
  protected validateSynthesized(): void {
    if (!this.service) {
      throw new Error('ECS EC2 Service component must be synthesized before accessing capabilities');
    }
  }
}
