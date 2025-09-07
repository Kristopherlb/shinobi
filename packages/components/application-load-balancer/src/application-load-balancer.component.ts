/**
 * Application Load Balancer Component implementing Component API Contract v1.0
 * 
 * A managed layer 7 load balancer for distributing HTTP/HTTPS traffic across targets.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '../../../platform/contracts/src';

/**
 * Configuration interface for Application Load Balancer component
 */
export interface ApplicationLoadBalancerConfig {
  /** Load balancer name (optional, defaults to component name) */
  loadBalancerName?: string;
  
  /** Load balancer scheme */
  scheme?: 'internet-facing' | 'internal';
  
  /** IP address type */
  ipAddressType?: 'ipv4' | 'dualstack';
  
  /** VPC configuration */
  vpc?: {
    vpcId?: string;
    subnetIds?: string[];
    subnetType?: 'public' | 'private';
  };
  
  /** Listeners configuration */
  listeners?: Array<{
    port: number;
    protocol: 'HTTP' | 'HTTPS';
    certificateArn?: string;
    sslPolicy?: string;
    redirectToHttps?: boolean;
    defaultAction?: {
      type: 'fixed-response' | 'redirect' | 'forward';
      statusCode?: number;
      contentType?: string;
      messageBody?: string;
      redirectUrl?: string;
    };
  }>;
  
  /** Target groups configuration */
  targetGroups?: Array<{
    name: string;
    port: number;
    protocol: 'HTTP' | 'HTTPS';
    targetType: 'instance' | 'ip' | 'lambda';
    healthCheck?: {
      enabled?: boolean;
      path?: string;
      protocol?: 'HTTP' | 'HTTPS';
      port?: number;
      healthyThresholdCount?: number;
      unhealthyThresholdCount?: number;
      timeout?: number;
      interval?: number;
      matcher?: string;
    };
    stickiness?: {
      enabled?: boolean;
      duration?: number;
    };
  }>;
  
  /** Access logging configuration */
  accessLogs?: {
    enabled?: boolean;
    bucket?: string;
    prefix?: string;
  };
  
  /** Security groups */
  securityGroups?: {
    create?: boolean;
    securityGroupIds?: string[];
    ingress?: Array<{
      port: number;
      protocol: string;
      cidr?: string;
      description?: string;
    }>;
  };
  
  /** Deletion protection */
  deletionProtection?: boolean;
  
  /** Idle timeout */
  idleTimeout?: number;
  
  /** Deployment strategy configuration */
  deploymentStrategy?: {
    type: 'single' | 'blue-green';
    blueGreenConfig?: {
      productionTrafficRoute?: {
        type: 'AllAtOnce' | 'Linear' | 'Canary';
        percentage?: number;
        interval?: number;
      };
      testTrafficRoute?: {
        type: 'AllAtOnce' | 'Linear' | 'Canary';
        percentage?: number;
      };
      terminationWaitTime?: number;
    };
  };
  
  /** CloudWatch monitoring configuration */
  monitoring?: {
    enabled?: boolean;
    alarms?: {
      httpCode5xxThreshold?: number;
      unhealthyHostThreshold?: number;
      connectionErrorThreshold?: number;
      rejectedConnectionThreshold?: number;
    };
  };
  
  /** Tags for the load balancer */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for Application Load Balancer component
 */
export const APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA = {
  type: 'object',
  title: 'Application Load Balancer Configuration',
  description: 'Configuration for creating an Application Load Balancer',
  properties: {
    loadBalancerName: {
      type: 'string',
      description: 'Name of the Application Load Balancer',
      pattern: '^[a-zA-Z0-9-]+$',
      minLength: 1,
      maxLength: 32
    },
    scheme: {
      type: 'string',
      description: 'Load balancer scheme',
      enum: ['internet-facing', 'internal'],
      default: 'internet-facing'
    },
    ipAddressType: {
      type: 'string',
      description: 'IP address type',
      enum: ['ipv4', 'dualstack'],
      default: 'ipv4'
    },
    vpc: {
      type: 'object',
      description: 'VPC configuration',
      properties: {
        vpcId: {
          type: 'string',
          description: 'VPC ID where the load balancer will be created'
        },
        subnetIds: {
          type: 'array',
          description: 'Subnet IDs for the load balancer',
          items: {
            type: 'string',
            pattern: '^subnet-[a-f0-9]+$'
          },
          minItems: 2
        },
        subnetType: {
          type: 'string',
          description: 'Type of subnets to use',
          enum: ['public', 'private'],
          default: 'public'
        }
      }
    },
    listenerConfigs: {
      type: 'array',
      description: 'Listener configurations',
      items: {
        type: 'object',
        required: ['port', 'protocol'],
        properties: {
          port: {
            type: 'number',
            description: 'Port number for the listener',
            minimum: 1,
            maximum: 65535
          },
          protocol: {
            type: 'string',
            description: 'Protocol for the listener',
            enum: ['HTTP', 'HTTPS']
          },
          certificateArn: {
            type: 'string',
            description: 'ARN of the SSL certificate for HTTPS listeners',
            pattern: '^arn:aws:acm:[a-z0-9-]+:[0-9]{12}:certificate/[a-f0-9-]+$'
          },
          sslPolicy: {
            type: 'string',
            description: 'SSL policy for HTTPS listeners',
            default: 'ELBSecurityPolicy-TLS-1-2-2017-01'
          },
          redirectToHttps: {
            type: 'boolean',
            description: 'Whether to redirect HTTP to HTTPS',
            default: false
          }
        }
      },
      default: [
        {
          port: 80,
          protocol: 'HTTP'
        }
      ]
    },
    targetGroups: {
      type: 'array',
      description: 'Target group configurations',
      items: {
        type: 'object',
        required: ['name', 'port', 'protocol', 'targetType'],
        properties: {
          name: {
            type: 'string',
            description: 'Name of the target group',
            pattern: '^[a-zA-Z0-9-]+$',
            minLength: 1,
            maxLength: 32
          },
          port: {
            type: 'number',
            description: 'Port for the target group',
            minimum: 1,
            maximum: 65535
          },
          protocol: {
            type: 'string',
            description: 'Protocol for the target group',
            enum: ['HTTP', 'HTTPS']
          },
          targetType: {
            type: 'string',
            description: 'Type of targets',
            enum: ['instance', 'ip', 'lambda']
          },
          healthCheck: {
            type: 'object',
            description: 'Health check configuration',
            properties: {
              enabled: {
                type: 'boolean',
                description: 'Enable health checks',
                default: true
              },
              path: {
                type: 'string',
                description: 'Health check path',
                default: '/'
              },
              protocol: {
                type: 'string',
                description: 'Health check protocol',
                enum: ['HTTP', 'HTTPS'],
                default: 'HTTP'
              },
              healthyThresholdCount: {
                type: 'number',
                description: 'Healthy threshold count',
                minimum: 2,
                maximum: 10,
                default: 2
              },
              unhealthyThresholdCount: {
                type: 'number',
                description: 'Unhealthy threshold count',
                minimum: 2,
                maximum: 10,
                default: 2
              },
              timeout: {
                type: 'number',
                description: 'Health check timeout in seconds',
                minimum: 2,
                maximum: 120,
                default: 5
              },
              interval: {
                type: 'number',
                description: 'Health check interval in seconds',
                minimum: 5,
                maximum: 300,
                default: 30
              }
            }
          }
        }
      }
    },
    accessLogs: {
      type: 'object',
      description: 'Access logging configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable access logging',
          default: false
        },
        bucket: {
          type: 'string',
          description: 'S3 bucket for access logs'
        },
        prefix: {
          type: 'string',
          description: 'S3 prefix for access logs'
        }
      }
    },
    securityGroups: {
      type: 'object',
      description: 'Security group configuration',
      properties: {
        create: {
          type: 'boolean',
          description: 'Create a new security group',
          default: true
        },
        securityGroupIds: {
          type: 'array',
          description: 'Existing security group IDs',
          items: {
            type: 'string',
            pattern: '^sg-[a-f0-9]+$'
          }
        },
        ingress: {
          type: 'array',
          description: 'Ingress rules for the security group',
          items: {
            type: 'object',
            required: ['port', 'protocol'],
            properties: {
              port: {
                type: 'number',
                description: 'Port number',
                minimum: 1,
                maximum: 65535
              },
              protocol: {
                type: 'string',
                description: 'Protocol',
                enum: ['tcp', 'udp', 'icmp']
              },
              cidr: {
                type: 'string',
                description: 'CIDR block',
                default: '0.0.0.0/0'
              },
              description: {
                type: 'string',
                description: 'Rule description'
              }
            }
          }
        }
      }
    },
    deletionProtection: {
      type: 'boolean',
      description: 'Enable deletion protection',
      default: false
    },
    accessLogs: {
      type: 'array',
      description: 'Target group configurations',
      items: {
        type: 'object',
        required: ['name', 'port', 'protocol'],
        properties: {
          name: {
            type: 'string',
            description: 'Target group name'
          },
          port: {
            type: 'number',
            minimum: 1,
            maximum: 65535,
            description: 'Target group port'
          },
          protocol: {
            type: 'string',
            enum: ['HTTP', 'HTTPS'],
            description: 'Target group protocol'
          },
          healthCheck: {
            type: 'object',
            description: 'Health check configuration',
            properties: {
              enabled: {
                type: 'boolean',
                default: true
              },
              path: {
                type: 'string',
                default: '/'
              },
              protocol: {
                type: 'string',
                enum: ['HTTP', 'HTTPS'],
                default: 'HTTP'
              },
              port: {
                type: 'number',
                description: 'Health check port'
              },
              healthyThresholdCount: {
                type: 'number',
                minimum: 2,
                maximum: 10,
                default: 5
              },
              unhealthyThresholdCount: {
                type: 'number',
                minimum: 2,
                maximum: 10,
                default: 2
              },
              timeout: {
                type: 'number',
                minimum: 2,
                maximum: 120,
                default: 5
              },
              interval: {
                type: 'number',
                minimum: 5,
                maximum: 300,
                default: 30
              },
              matcher: {
                type: 'string',
                description: 'HTTP success codes',
                default: '200'
              }
            }
          },
          targetType: {
            type: 'string',
            enum: ['instance', 'ip', 'lambda'],
            default: 'instance'
          },
          stickiness: {
            type: 'object',
            description: 'Session stickiness configuration',
            properties: {
              enabled: {
                type: 'boolean',
                default: false
              },
              duration: {
                type: 'number',
                description: 'Stickiness duration in seconds',
                minimum: 1,
                maximum: 604800
              }
            }
          }
        }
      }
    },
    idleTimeout: {
      type: 'number',
      description: 'Idle timeout in seconds',
      minimum: 1,
      maximum: 4000,
      default: 60
    },
    deploymentStrategy: {
      type: 'object',
      description: 'Deployment strategy configuration',
      properties: {
        type: {
          type: 'string',
          description: 'Deployment strategy type',
          enum: ['single', 'blue-green'],
          default: 'single'
        },
        blueGreenConfig: {
          type: 'object',
          description: 'Blue-green deployment configuration',
          properties: {
            productionTrafficRoute: {
              type: 'object',
              description: 'Production traffic routing configuration',
              properties: {
                type: {
                  type: 'string',
                  description: 'Traffic routing type',
                  enum: ['AllAtOnce', 'Linear', 'Canary'],
                  default: 'AllAtOnce'
                },
                percentage: {
                  type: 'number',
                  description: 'Traffic percentage for canary/linear deployments',
                  minimum: 1,
                  maximum: 100,
                  default: 10
                },
                interval: {
                  type: 'number',
                  description: 'Interval in minutes between traffic shifts',
                  minimum: 1,
                  maximum: 60,
                  default: 5
                }
              }
            },
            terminationWaitTime: {
              type: 'number',
              description: 'Wait time in minutes before terminating old environment',
              minimum: 0,
              maximum: 2880,
              default: 5
            }
          }
        }
      }
    },
    monitoring: {
      type: 'object',
      description: 'CloudWatch monitoring configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable CloudWatch monitoring and alarms',
          default: false
        },
        alarms: {
          type: 'object',
          description: 'CloudWatch alarm thresholds',
          properties: {
            httpCode5xxThreshold: {
              type: 'number',
              description: 'Threshold for HTTP 5xx errors alarm',
              minimum: 1,
              default: 10
            },
            unhealthyHostThreshold: {
              type: 'number',
              description: 'Threshold for unhealthy hosts alarm',
              minimum: 1,
              default: 1
            },
            connectionErrorThreshold: {
              type: 'number',
              description: 'Threshold for connection errors alarm',
              minimum: 1,
              default: 5
            },
            rejectedConnectionThreshold: {
              type: 'number',
              description: 'Threshold for rejected connections alarm',
              minimum: 1,
              default: 1
            }
          }
        }
      }
    },
    tags: {
      type: 'object',
      description: 'Tags for the load balancer',
      additionalProperties: {
        type: 'string'
      }
    }
  },
  additionalProperties: false
};

/**
 * Configuration builder for Application Load Balancer component
 * Extends the abstract ConfigBuilder to ensure consistent configuration lifecycle
 */
export class ApplicationLoadBalancerConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<ApplicationLoadBalancerConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): ApplicationLoadBalancerConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as ApplicationLoadBalancerConfig;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
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

  /**
   * Get platform-wide defaults for Application Load Balancer
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      scheme: 'internet-facing',
      ipAddressType: 'ipv4',
      deletionProtection: false,
      idleTimeout: 60,
      listeners: [
        {
          port: 80,
          protocol: 'HTTP'
        }
      ],
      securityGroups: {
        create: true,
        ingress: [
          {
            port: 80,
            protocol: 'tcp',
            cidr: '0.0.0.0/0',
            description: 'HTTP access from internet'
          },
          {
            port: 443,
            protocol: 'tcp',
            cidr: '0.0.0.0/0',
            description: 'HTTPS access from internet'
          }
        ]
      },
      accessLogs: {
        enabled: false
      },
      deploymentStrategy: {
        type: 'single'
      },
      monitoring: {
        enabled: false
      }
    };
  }

  /**
   * Get compliance framework specific defaults
   */
  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          deletionProtection: true, // Prevent accidental deletion
          accessLogs: {
            enabled: true, // Required for audit compliance
            prefix: 'alb-access-logs'
          },
          deploymentStrategy: {
            type: 'single' // Blue-green handled by CodeDeploy
          },
          monitoring: {
            enabled: true // Enhanced monitoring for compliance
          },
          listeners: [
            {
              port: 443,
              protocol: 'HTTPS',
              sslPolicy: 'ELBSecurityPolicy-TLS-1-2-2017-01'
            }
          ],
          securityGroups: {
            create: true,
            ingress: [
              {
                port: 443,
                protocol: 'tcp',
                cidr: '0.0.0.0/0',
                description: 'HTTPS access from internet'
              }
            ]
          }
        };
        
      case 'fedramp-high':
        return {
          deletionProtection: true, // Mandatory for high compliance
          accessLogs: {
            enabled: true, // Mandatory audit logging
            prefix: 'alb-access-logs'
          },
          deploymentStrategy: {
            type: 'single' // Blue-green handled by CodeDeploy
          },
          monitoring: {
            enabled: true // Comprehensive monitoring required
          },
          listeners: [
            {
              port: 443,
              protocol: 'HTTPS',
              sslPolicy: 'ELBSecurityPolicy-TLS-1-2-Ext-2018-06' // More secure TLS policy
            }
          ],
          securityGroups: {
            create: true,
            ingress: [
              {
                port: 443,
                protocol: 'tcp',
                cidr: '0.0.0.0/0',
                description: 'HTTPS access from internet'
              }
            ]
          }
        };
        
      default: // commercial
        return {
          deletionProtection: false, // Cost optimization
          accessLogs: {
            enabled: false // Optional for commercial
          },
          deploymentStrategy: {
            type: 'single'
          },
          monitoring: {
            enabled: false
          }
        };
    }
  }
}

/**
 * Application Load Balancer Component implementing Component API Contract v1.0
 */
export class ApplicationLoadBalancerComponent extends Component {
  private loadBalancer?: elbv2.ApplicationLoadBalancer;
  private targetGroups: elbv2.ApplicationTargetGroup[] = [];
  private listeners: elbv2.ApplicationListener[] = [];
  private securityGroup?: ec2.SecurityGroup;
  private vpc?: ec2.IVpc;
  private accessLogsBucket?: s3.IBucket;
  private config?: ApplicationLoadBalancerConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create Application Load Balancer with compliance hardening
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Application Load Balancer synthesis');
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new ApplicationLoadBalancerConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Lookup or create VPC
      this.lookupVpc();
      
      // Create security group if needed
      this.createSecurityGroupIfNeeded();
      
      // Create access logs bucket if needed
      this.createAccessLogsBucketIfNeeded();
      
      // Create Application Load Balancer
      this.createApplicationLoadBalancer();
      
      // Create target groups
      this.createTargetGroups();
      
      // Create listeners
      this.createListeners();
      
      // Configure observability (OpenTelemetry Standard)
      this.configureObservabilityForAlb();
      
      // Apply compliance hardening
      this.applyComplianceHardening();
      
      // Register constructs
      this.registerConstruct('loadBalancer', this.loadBalancer!);
      if (this.securityGroup) {
        this.registerConstruct('securityGroup', this.securityGroup);
      }
      this.targetGroups.forEach((tg, index) => {
        this.registerConstruct(`targetGroup${index}`, tg);
      });
      
      // Register capabilities
      this.registerCapability('net:load-balancer', this.buildLoadBalancerCapability());
      this.registerCapability('net:load-balancer-target', this.buildTargetCapability());
      
      this.logComponentEvent('synthesis_complete', 'Application Load Balancer synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'Application Load Balancer synthesis');
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
    return 'application-load-balancer';
  }

  /**
   * Lookup VPC from configuration or use default
   */
  private lookupVpc(): void {
    const vpcConfig = this.config!.vpc;
    
    if (vpcConfig?.vpcId) {
      this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
        vpcId: vpcConfig.vpcId
      });
    } else {
      // Use default VPC
      this.vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
        isDefault: true
      });
    }
  }

  /**
   * Create security group for the load balancer if needed
   */
  private createSecurityGroupIfNeeded(): void {
    const sgConfig = this.config!.securityGroups;
    
    if (sgConfig?.create) {
      this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
        vpc: this.vpc!,
        description: `Security group for ${this.context.serviceName}-${this.spec.name} ALB`,
        allowAllOutbound: true
      });

      // Add ingress rules
      if (sgConfig.ingress) {
        for (const rule of sgConfig.ingress) {
          this.securityGroup.addIngressRule(
            ec2.Peer.ipv4(rule.cidr || '0.0.0.0/0'),
            ec2.Port.tcp(rule.port),
            rule.description || `Allow ${rule.protocol} on port ${rule.port}`
          );
        }
      }

      // Apply standard tags
      this.applyStandardTags(this.securityGroup, {
        'resource-type': 'security-group',
        'alb-name': this.config!.loadBalancerName || `${this.context.serviceName}-${this.spec.name}`
      });

      this.logResourceCreation('security-group', this.securityGroup.securityGroupId);
    }
  }

  /**
   * Create S3 bucket for access logs if needed
   */
  private createAccessLogsBucketIfNeeded(): void {
    const accessLogsConfig = this.config!.accessLogs;
    
    if (accessLogsConfig?.enabled && !accessLogsConfig.bucket) {
      // Create access logs bucket
      const bucketName = `${this.context.serviceName}-${this.spec.name}-access-logs`;
      
      this.accessLogsBucket = new s3.Bucket(this, 'AccessLogsBucket', {
        bucketName,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        lifecycleRules: [
          {
            id: 'DeleteOldLogs',
            enabled: true,
            expiration: cdk.Duration.days(this.isComplianceFramework() ? 90 : 30)
          }
        ],
        removalPolicy: this.isComplianceFramework() ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
      });

      // Apply standard tags
      this.applyStandardTags(this.accessLogsBucket, {
        'resource-type': 's3-bucket',
        'purpose': 'alb-access-logs'
      });

      this.logResourceCreation('s3-bucket', bucketName);
    }
  }

  /**
   * Create Application Load Balancer
   */
  private createApplicationLoadBalancer(): void {
    const loadBalancerName = this.config!.loadBalancerName || `${this.context.serviceName}-${this.spec.name}`;
    
    // Get subnets
    const subnets = this.getSubnets();
    
    // Get security groups
    const securityGroups = this.getSecurityGroups();
    
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      loadBalancerName,
      vpc: this.vpc!,
      vpcSubnets: { subnets },
      internetFacing: this.config!.scheme === 'internet-facing',
      ipAddressType: this.config!.ipAddressType === 'dualstack' 
        ? elbv2.IpAddressType.DUAL_STACK 
        : elbv2.IpAddressType.IPV4,
      securityGroup: this.securityGroup,
      deletionProtection: this.config!.deletionProtection,
      idleTimeout: cdk.Duration.seconds(this.config!.idleTimeout || 60)
    });

    // Enable access logs if configured
    if (this.config!.accessLogs?.enabled) {
      const bucket = this.accessLogsBucket || s3.Bucket.fromBucketName(this, 'ExistingAccessLogsBucket', this.config!.accessLogs.bucket!);
      this.loadBalancer.logAccessLogs(bucket, this.config!.accessLogs.prefix);
    }

    // Apply standard tags
    this.applyStandardTags(this.loadBalancer, {
      'resource-type': 'application-load-balancer',
      'scheme': this.config!.scheme || 'internet-facing',
      ...this.config!.tags
    });

    this.logResourceCreation('application-load-balancer', this.loadBalancer.loadBalancerName);
  }

  /**
   * Get subnets for the load balancer
   */
  private getSubnets(): ec2.ISubnet[] {
    const vpcConfig = this.config!.vpc;
    
    if (vpcConfig?.subnetIds) {
      return vpcConfig.subnetIds.map((subnetId, index) => 
        ec2.Subnet.fromSubnetId(this, `Subnet${index}`, subnetId)
      );
    }
    
    // Use subnets by type
    const subnetType = vpcConfig?.subnetType || 'public';
    if (subnetType === 'public') {
      return this.vpc!.publicSubnets;
    } else {
      return this.vpc!.privateSubnets;
    }
  }

  /**
   * Get security groups for the load balancer
   */
  private getSecurityGroups(): ec2.ISecurityGroup[] {
    const sgConfig = this.config!.securityGroups;
    
    if (sgConfig?.securityGroupIds) {
      return sgConfig.securityGroupIds.map((sgId, index) => 
        ec2.SecurityGroup.fromSecurityGroupId(this, `ExistingSG${index}`, sgId)
      );
    }
    
    if (this.securityGroup) {
      return [this.securityGroup];
    }
    
    return [];
  }

  /**
   * Create target groups from configuration
   */
  private createTargetGroups(): void {
    if (!this.config!.targetGroups) {
      // Handle blue-green deployment strategy
      if (this.config!.deploymentStrategy?.type === 'blue-green') {
        this.createBlueGreenTargetGroups();
        return;
      }
      return;
    }

    for (const tgConfig of this.config!.targetGroups) {
      const targetGroup = new elbv2.ApplicationTargetGroup(this, `TargetGroup${tgConfig.name}`, {
        targetGroupName: `${this.context.serviceName}-${tgConfig.name}`,
        port: tgConfig.port,
        protocol: tgConfig.protocol === 'HTTPS' ? elbv2.ApplicationProtocol.HTTPS : elbv2.ApplicationProtocol.HTTP,
        vpc: this.vpc!,
        targetType: this.mapTargetType(tgConfig.targetType),
        healthCheck: tgConfig.healthCheck ? {
          enabled: tgConfig.healthCheck.enabled,
          path: tgConfig.healthCheck.path,
          protocol: tgConfig.healthCheck.protocol === 'HTTPS' ? elbv2.Protocol.HTTPS : elbv2.Protocol.HTTP,
          port: tgConfig.healthCheck.port?.toString(),
          healthyThresholdCount: tgConfig.healthCheck.healthyThresholdCount,
          unhealthyThresholdCount: tgConfig.healthCheck.unhealthyThresholdCount,
          timeout: tgConfig.healthCheck.timeout ? cdk.Duration.seconds(tgConfig.healthCheck.timeout) : undefined,
          interval: tgConfig.healthCheck.interval ? cdk.Duration.seconds(tgConfig.healthCheck.interval) : undefined,
          healthyHttpCodes: tgConfig.healthCheck.matcher
        } : undefined
      });

      // Configure stickiness if specified
      if (tgConfig.stickiness?.enabled) {
        targetGroup.setAttribute('stickiness.enabled', 'true');
        targetGroup.setAttribute('stickiness.type', 'lb_cookie');
        if (tgConfig.stickiness.duration) {
          targetGroup.setAttribute('stickiness.lb_cookie.duration_seconds', tgConfig.stickiness.duration.toString());
        }
      }

      this.targetGroups.push(targetGroup);

      // Apply standard tags
      this.applyStandardTags(targetGroup, {
        'resource-type': 'target-group',
        'target-type': tgConfig.targetType
      });

      this.logResourceCreation('target-group', targetGroup.targetGroupName);
    }
  }

  /**
   * Map target type string to CDK enum
   */
  private mapTargetType(targetType: string): elbv2.TargetType {
    switch (targetType) {
      case 'instance':
        return elbv2.TargetType.INSTANCE;
      case 'ip':
        return elbv2.TargetType.IP;
      case 'lambda':
        return elbv2.TargetType.LAMBDA;
      default:
        throw new Error(`Unsupported target type: ${targetType}`);
    }
  }

  /**
   * Create listeners from configuration
   */
  private createListeners(): void {
    if (!this.config!.listeners) return;

    for (const listenerConfig of this.config!.listeners) {
      const listener = this.loadBalancer!.addListener(`Listener${listenerConfig.port}`, {
        port: listenerConfig.port,
        protocol: listenerConfig.protocol === 'HTTPS' ? elbv2.ApplicationProtocol.HTTPS : elbv2.ApplicationProtocol.HTTP,
        certificates: listenerConfig.certificateArn ? [
          elbv2.ListenerCertificate.fromArn(listenerConfig.certificateArn)
        ] : undefined,
        sslPolicy: listenerConfig.sslPolicy ? elbv2.SslPolicy.TLS12_EXT : undefined,
        defaultAction: this.buildDefaultAction(listenerConfig)
      });

      this.listeners.push(listener);
      this.logResourceCreation('listener', `port-${listenerConfig.port}`);
    }
  }

  /**
   * Build default action for listener
   */
  private buildDefaultAction(listenerConfig: any): elbv2.ListenerAction {
    if (listenerConfig.redirectToHttps && listenerConfig.protocol === 'HTTP') {
      return elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true
      });
    }

    if (listenerConfig.defaultAction) {
      const action = listenerConfig.defaultAction;
      
      switch (action.type) {
        case 'fixed-response':
          return elbv2.ListenerAction.fixedResponse(action.statusCode || 200, {
            contentType: action.contentType,
            messageBody: action.messageBody
          });
        case 'redirect':
          return elbv2.ListenerAction.redirect({
            host: action.redirectUrl ? new URL(action.redirectUrl).hostname : undefined,
            path: action.redirectUrl ? new URL(action.redirectUrl).pathname : undefined,
            permanent: true
          });
        case 'forward':
          if (this.targetGroups.length > 0) {
            return elbv2.ListenerAction.forward(this.targetGroups);
          }
          break;
      }
    }

    // Default action: return fixed response
    return elbv2.ListenerAction.fixedResponse(200, {
      contentType: 'text/plain',
      messageBody: 'OK'
    });
  }

  /**
   * Apply compliance hardening based on framework
   */
  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }


  /**
   * Create blue-green target groups for deployment strategy
   */
  private createBlueGreenTargetGroups(): void {
    // Create Blue target group
    const blueTargetGroup = new elbv2.ApplicationTargetGroup(this, 'BlueTargetGroup', {
      targetGroupName: `${this.context.serviceName}-${this.spec.name}-blue`,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: this.vpc!,
      targetType: elbv2.TargetType.INSTANCE,
      healthCheck: {
        enabled: true,
        path: '/health',
        protocol: elbv2.Protocol.HTTP,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
        timeout: cdk.Duration.seconds(5),
        interval: cdk.Duration.seconds(30)
      }
    });

    // Create Green target group
    const greenTargetGroup = new elbv2.ApplicationTargetGroup(this, 'GreenTargetGroup', {
      targetGroupName: `${this.context.serviceName}-${this.spec.name}-green`,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: this.vpc!,
      targetType: elbv2.TargetType.INSTANCE,
      healthCheck: {
        enabled: true,
        path: '/health',
        protocol: elbv2.Protocol.HTTP,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
        timeout: cdk.Duration.seconds(5),
        interval: cdk.Duration.seconds(30)
      }
    });

    this.targetGroups.push(blueTargetGroup, greenTargetGroup);

    // Apply standard tags
    this.applyStandardTags(blueTargetGroup, {
      'resource-type': 'target-group',
      'deployment-strategy': 'blue-green',
      'environment-type': 'blue'
    });

    this.applyStandardTags(greenTargetGroup, {
      'resource-type': 'target-group',
      'deployment-strategy': 'blue-green',
      'environment-type': 'green'
    });

    this.logResourceCreation('blue-target-group', blueTargetGroup.targetGroupName);
    this.logResourceCreation('green-target-group', greenTargetGroup.targetGroupName);
  }

  /**
   * Configure OpenTelemetry Observability Standard - CloudWatch Alarms for ALB
   */
  private configureObservabilityForAlb(): void {
    const monitoringConfig = this.config!.monitoring;
    
    if (!monitoringConfig?.enabled) {
      return;
    }

    const alarmThresholds = monitoringConfig.alarms || {};
    const loadBalancerFullName = this.loadBalancer!.loadBalancerFullName;

    // 1. HTTP 5xx Server Errors Alarm
    new cloudwatch.Alarm(this, 'HTTPCode5xxAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-http-5xx-errors`,
      alarmDescription: 'ALB HTTP 5xx server errors alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'HTTPCode_Target_5XX_Count',
        dimensionsMap: {
          LoadBalancer: loadBalancerFullName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: alarmThresholds.httpCode5xxThreshold || 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 2. Unhealthy Host Count Alarm
    new cloudwatch.Alarm(this, 'UnHealthyHostAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-unhealthy-hosts`,
      alarmDescription: 'ALB unhealthy host count alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'UnHealthyHostCount',
        dimensionsMap: {
          LoadBalancer: loadBalancerFullName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: alarmThresholds.unhealthyHostThreshold || 1,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 3. Target Connection Error Count Alarm
    new cloudwatch.Alarm(this, 'TargetConnectionErrorAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-connection-errors`,
      alarmDescription: 'ALB target connection errors alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'TargetConnectionErrorCount',
        dimensionsMap: {
          LoadBalancer: loadBalancerFullName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: alarmThresholds.connectionErrorThreshold || 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 4. Rejected Connection Count Alarm
    new cloudwatch.Alarm(this, 'RejectedConnectionAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-rejected-connections`,
      alarmDescription: 'ALB rejected connections alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'RejectedConnectionCount',
        dimensionsMap: {
          LoadBalancer: loadBalancerFullName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: alarmThresholds.rejectedConnectionThreshold || 1,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to ALB', {
      alarmsCreated: 4,
      monitoringEnabled: true,
      thresholds: alarmThresholds
    });
  }

  /**
   * Build load balancer capability data shape
   */
  private buildLoadBalancerCapability(): any {
    const capability: any = {
      loadBalancerArn: this.loadBalancer!.loadBalancerArn,
      loadBalancerDnsName: this.loadBalancer!.loadBalancerDnsName,
      loadBalancerCanonicalHostedZoneId: this.loadBalancer!.loadBalancerCanonicalHostedZoneId,
      listeners: this.listeners.map(listener => ({
        listenerArn: listener.listenerArn,
        port: listener.port
      }))
    };

    // Add blue-green specific capabilities for CodeDeploy integration
    if (this.config!.deploymentStrategy?.type === 'blue-green') {
      capability.deploymentStrategy = {
        type: 'blue-green',
        blueTargetGroupArn: this.targetGroups[0]?.targetGroupArn,
        greenTargetGroupArn: this.targetGroups[1]?.targetGroupArn,
        listenerArn: this.listeners[0]?.listenerArn
      };
    }

    return capability;
  }

  /**
   * Build target capability data shape
   */
  private buildTargetCapability(): any {
    return {
      targetGroups: this.targetGroups.map(tg => ({
        targetGroupArn: tg.targetGroupArn,
        targetGroupName: tg.targetGroupName
      }))
    };
  }

  /**
   * Apply FedRAMP High compliance hardening
   */
  private applyFedrampHighHardening(): void {
    this.logComplianceEvent('fedramp_high_hardening_applied', 'Applied FedRAMP High hardening to Application Load Balancer', {
      deletionProtection: this.config!.deletionProtection,
      accessLogsEnabled: this.config!.accessLogs?.enabled,
      httpsEnforced: this.config!.listeners?.every(l => l.protocol === 'HTTPS'),
      observabilityEnabled: this.config!.monitoring?.enabled,
      deploymentStrategy: this.config!.deploymentStrategy?.type
    });
  }

  /**
   * Apply FedRAMP Moderate compliance hardening
   */
  private applyFedrampModerateHardening(): void {
    this.logComplianceEvent('fedramp_moderate_hardening_applied', 'Applied FedRAMP Moderate hardening to Application Load Balancer', {
      deletionProtection: this.config!.deletionProtection,
      accessLogsEnabled: this.config!.accessLogs?.enabled,
      observabilityEnabled: this.config!.monitoring?.enabled,
      deploymentStrategy: this.config!.deploymentStrategy?.type
    });
  }

  /**
   * Apply commercial hardening
   */
  private applyCommercialHardening(): void {
    this.logComponentEvent('commercial_hardening_applied', 'Applied commercial security hardening to Application Load Balancer');
  }

  /**
   * Check if this is a compliance framework
   */
  private isComplianceFramework(): boolean {
    return this.context.complianceFramework !== 'commercial';
  }
}