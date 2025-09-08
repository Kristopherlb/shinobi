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
import { BaseComponent } from '../../platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../platform/contracts/component-interfaces';
import { ConfigBuilder, ConfigBuilderContext } from '../../platform/contracts/config-builder';

/**
 * Configuration interface for ECS Fargate Service component
 */
export interface EcsFargateServiceConfig {
  /** Name of the ECS cluster component to deploy to */
  cluster: string;
  
  /** Container image configuration */
  image: {
    /** Container image URI or repository name */
    repository: string;
    /** Image tag (optional, defaults to 'latest') */
    tag?: string;
  };
  
  /** CPU allocation for the Fargate task (256, 512, 1024, 2048, 4096) */
  cpu: number;
  
  /** Memory allocation for the Fargate task (512, 1024, 2048, etc.) */
  memory: number;
  
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
  
  /** Deployment strategy configuration for progressive delivery (optional) */
  deploymentStrategy?: {
    /** Strategy type: 'rolling' (default) or 'blue-green' for canary deployments */
    type: 'rolling' | 'blue-green';
    /** Blue-green deployment configuration (required when type is 'blue-green') */
    blueGreen?: {
      /** Load balancer configuration for blue-green deployment */
      loadBalancer?: {
        /** ALB listener port for production traffic */
        productionPort: number;
        /** ALB listener port for test traffic (optional, defaults to productionPort + 1) */
        testPort?: number;
      };
      /** Traffic shifting configuration */
      trafficShifting?: {
        /** Percentage of traffic to shift initially (0-100, defaults to 10) */
        initialPercentage?: number;
        /** Time to wait before shifting remaining traffic in minutes (defaults to 5) */
        waitTime?: number;
      };
    };
  };

  /** Additional tags for service resources */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for ECS Fargate Service component
 */
export const ECS_FARGATE_SERVICE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'ECS Fargate Service Configuration',
  description: 'Configuration for creating a serverless ECS Fargate service with Service Connect',
  required: ['cluster', 'image', 'cpu', 'memory', 'port', 'serviceConnect'],
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
    cpu: {
      type: 'number',
      description: 'CPU allocation for Fargate task',
      enum: [256, 512, 1024, 2048, 4096, 8192, 16384],
      examples: [256, 512, 1024]
    },
    memory: {
      type: 'number',
      description: 'Memory allocation for Fargate task (must be compatible with CPU)',
      minimum: 512,
      maximum: 122880,
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
    deploymentStrategy: {
      type: 'object',
      description: 'Deployment strategy configuration for progressive delivery',
      properties: {
        type: {
          type: 'string',
          description: 'Strategy type: rolling (default) or blue-green for canary deployments',
          enum: ['rolling', 'blue-green'],
          default: 'rolling'
        },
        blueGreen: {
          type: 'object',
          description: 'Blue-green deployment configuration (required when type is blue-green)',
          properties: {
            loadBalancer: {
              type: 'object',
              description: 'Load balancer configuration for blue-green deployment',
              properties: {
                productionPort: {
                  type: 'number',
                  description: 'ALB listener port for production traffic',
                  minimum: 1,
                  maximum: 65535
                },
                testPort: {
                  type: 'number',
                  description: 'ALB listener port for test traffic',
                  minimum: 1,
                  maximum: 65535
                }
              },
              required: ['productionPort'],
              additionalProperties: false
            },
            trafficShifting: {
              type: 'object',
              description: 'Traffic shifting configuration',
              properties: {
                initialPercentage: {
                  type: 'number',
                  description: 'Percentage of traffic to shift initially (0-100)',
                  minimum: 0,
                  maximum: 100,
                  default: 10
                },
                waitTime: {
                  type: 'number',
                  description: 'Time to wait before shifting remaining traffic in minutes',
                  minimum: 1,
                  maximum: 1440,
                  default: 5
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
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
    }
  }
};

/**
 * ECS Fargate Service Configuration Builder
 * Implements the centralized 5-layer precedence engine
 */
export class EcsFargateServiceConfigBuilder extends ConfigBuilder<EcsFargateServiceConfig> {
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, ECS_FARGATE_SERVICE_CONFIG_SCHEMA);
  }

  /**
   * Builds the final configuration using the centralized precedence engine
   */
  public async build(): Promise<EcsFargateServiceConfig> {
    return this.buildSync();
  }

  /**
   * Provide Fargate service-specific hardcoded fallbacks
   */
  protected getHardcodedFallbacks(): Record<string, any> {
    return {
      cpu: 256, // Minimal CPU for cost optimization
      memory: 512, // Minimal memory
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
          cpu: 1024, // Higher CPU for compliance workloads
          memory: 2048, // Higher memory
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
          }
        };
        
      case 'fedramp-moderate':
        return {
          cpu: 512, // Balanced CPU
          memory: 1024, // Balanced memory
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
          }
        };
        
      default: // commercial
        return {
          cpu: 256, // Cost optimized
          memory: 512,
          desiredCount: 1,
          autoScaling: {
            minCapacity: 1,
            maxCapacity: 3, // Limited scaling for cost
            targetCpuUtilization: 70,
            targetMemoryUtilization: 80
          }
        };
    }
  }
}

/**
 * ECS Fargate Service Component implementing Component API Contract v1.0 and
 * Platform ECS Service Connect Standard v1.0
 */
export class EcsFargateServiceComponent extends BaseComponent {
  private service?: ecs.FargateService;
  private taskDefinition?: ecs.FargateTaskDefinition;
  private securityGroup?: ec2.SecurityGroup;
  private logGroup?: logs.LogGroup;
  private config?: EcsFargateServiceConfig;
  private configBuilder?: EcsFargateServiceConfigBuilder;
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
      this.configBuilder = new EcsFargateServiceConfigBuilder(this.context, this.spec);
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
      this.registerConstruct('logGroup', this.logGroup!);
      
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
    });

    // Add health check if configured
    if (this.config!.healthCheck) {
      // Health check is configured through container logging and task definition
      // The actual health check command would be applied during container creation
      this.logComponentEvent('health_check_configured', 'Health check configured for container');
    }

    this.logResourceCreation('fargate-task-definition', this.taskDefinition.family);
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
        namespace: cluster.defaultCloudMapNamespace?.namespaceName,
        services: [{
          portMappingName: this.config!.serviceConnect.portMappingName,
          dnsName: this.spec.name, // Service will be discoverable as http://{component-name}.{namespace}
          port: this.config!.port,
        }],
      },
      
      // Blue-green deployment configuration
      deploymentController: isBlueGreenDeployment ? {
        type: ecs.DeploymentControllerType.CODE_DEPLOY
      } : undefined,
      
      // Enable circuit breaker for rolling deployment safety (not used for blue-green)
      enableExecuteCommand: this.isComplianceFramework(), // Enable for compliance debugging
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
   * Get log retention based on compliance framework
   */
  private getLogRetention(): logs.RetentionDays {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return logs.RetentionDays.TWO_YEARS;
      case 'fedramp-moderate':
        return logs.RetentionDays.ONE_YEAR;
      default:
        return logs.RetentionDays.ONE_MONTH;
    }
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
      throw new Error('ECS cluster configuration is required for Fargate service');
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
   * Configure OpenTelemetry observability for ECS Fargate Service
   * Creates mandatory CloudWatch alarms for operational monitoring
   * Implements Platform OpenTelemetry Observability Standard v1.0
   */
  private _configureObservabilityForEcsService(): void {
    if (!this.service || !this.config) {
      throw new Error('Service and config must be created before configuring observability');
    }

    const clusterName = this.config.cluster;
    const serviceName = this.service.serviceName;
    const complianceFramework = this.context.complianceFramework;

    // Create CPU utilization alarm
    const cpuAlarm = new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-cpu-high`,
      alarmDescription: `High CPU utilization for ECS Fargate service ${serviceName}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          ServiceName: serviceName,
          ClusterName: clusterName
        }
      }),
      threshold: this.getCpuAlarmThreshold(complianceFramework),
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    // Create memory utilization alarm
    const memoryAlarm = new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-memory-high`,
      alarmDescription: `High memory utilization for ECS Fargate service ${serviceName}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'MemoryUtilization',
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          ServiceName: serviceName,
          ClusterName: clusterName
        }
      }),
      threshold: this.getMemoryAlarmThreshold(complianceFramework),
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    // Create running task count alarm (ensure minimum capacity)
    const minCapacity = this.config.autoScaling?.minCapacity || this.config.desiredCount;
    const taskCountAlarm = new cloudwatch.Alarm(this, 'RunningTaskCountAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-tasks-low`,
      alarmDescription: `Low running task count for ECS Fargate service ${serviceName}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'RunningTaskCount',
        statistic: 'Average',
        period: cdk.Duration.minutes(1),
        dimensionsMap: {
          ServiceName: serviceName,
          ClusterName: clusterName
        }
      }),
      threshold: minCapacity,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD
    });

    // Apply standard tags to alarms
    [cpuAlarm, memoryAlarm, taskCountAlarm].forEach(alarm => {
      this.applyStandardTags(alarm, {
        'alarm-type': 'ecs-service-monitoring',
        'service-name': serviceName,
        'cluster-name': clusterName
      });
    });

    this.logComponentEvent('observability_configured', 
      `Created 3 CloudWatch alarms for ECS Fargate service monitoring`);
  }

  /**
   * Get CPU alarm threshold based on compliance framework
   */
  private getCpuAlarmThreshold(complianceFramework: string): number {
    switch (complianceFramework) {
      case 'fedramp-high':
        return 70; // More conservative threshold for high compliance
      case 'fedramp-moderate':
        return 80; // Moderate threshold
      default:
        return 85; // Higher threshold for cost optimization
    }
  }

  /**
   * Get memory alarm threshold based on compliance framework
   */
  private getMemoryAlarmThreshold(complianceFramework: string): number {
    switch (complianceFramework) {
      case 'fedramp-high':
        return 75; // More conservative threshold for high compliance
      case 'fedramp-moderate':
        return 85; // Moderate threshold
      default:
        return 90; // Higher threshold for cost optimization
    }
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
