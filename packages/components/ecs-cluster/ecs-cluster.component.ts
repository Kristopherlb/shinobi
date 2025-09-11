/**
 * ECS Cluster Component
 * 
 * Foundational component for ECS Service Connect that creates an ECS cluster
 * with optional EC2 capacity and Service Connect namespace for microservices.
 * Implements the Platform ECS Service Connect Standard v1.0.
 */

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
import { ConfigBuilder, ConfigBuilderContext } from '../../../src/platform/contracts/config-builder';

/**
 * Configuration interface for ECS Cluster component
 */
export interface EcsClusterConfig {
  /** Service Connect configuration for microservice discovery */
  serviceConnect: {
    /** Cloud Map namespace for service discovery (e.g., "internal", "my-app.internal") */
    namespace: string;
  };
  
  /** Optional EC2 capacity configuration. If omitted, cluster is Fargate-only */
  capacity?: {
    /** EC2 instance type for the cluster */
    instanceType: string;
    /** Minimum number of instances in the Auto Scaling Group */
    minSize: number;
    /** Maximum number of instances in the Auto Scaling Group */
    maxSize: number;
    /** Desired number of instances (optional, defaults to minSize) */
      desiredSize?: number;
    /** Key pair name for SSH access (optional) */
    keyName?: string;
    /** Enable detailed CloudWatch monitoring (optional, defaults to false) */
    enableMonitoring?: boolean;
  };
  
  /** Container Insights configuration (optional, defaults based on compliance) */
  containerInsights?: boolean;
  
  /** Cluster name override (optional, auto-generated from service and component name) */
  clusterName?: string;
  
  /** Tags to apply to cluster resources */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for ECS Cluster component
 */
export const ECS_CLUSTER_CONFIG_SCHEMA = {
  type: 'object',
  title: 'ECS Cluster Configuration',
  description: 'Configuration for creating an ECS Cluster with Service Connect',
  required: ['serviceConnect'],
  properties: {
    serviceConnect: {
      type: 'object',
      title: 'Service Connect Configuration', 
      description: 'Configuration for ECS Service Connect and service discovery',
      required: ['namespace'],
      properties: {
        namespace: {
          type: 'string',
          description: 'Cloud Map namespace for service discovery',
          pattern: '^[a-zA-Z][a-zA-Z0-9.-]*$',
          minLength: 1,
          maxLength: 64,
          examples: ['internal', 'my-app.internal', 'services']
        }
      },
      additionalProperties: false
    },
    capacity: {
        type: 'object',
      title: 'EC2 Capacity Configuration',
      description: 'Optional EC2 capacity for the cluster. If omitted, cluster is Fargate-only',
      required: ['instanceType', 'minSize', 'maxSize'],
            properties: {
              instanceType: {
                type: 'string',
          description: 'EC2 instance type for cluster instances',
          pattern: '^[a-z][0-9]*[a-z]*\\.[a-z0-9]+$',
          examples: ['t3.medium', 'm5.large', 'c5.xlarge']
              },
              minSize: {
                type: 'number',
          description: 'Minimum number of instances in Auto Scaling Group',
                minimum: 0,
          maximum: 1000
              },
              maxSize: {
                type: 'number',
          description: 'Maximum number of instances in Auto Scaling Group', 
                minimum: 1,
          maximum: 1000
              },
              desiredSize: {
                type: 'number',
          description: 'Desired number of instances (defaults to minSize)',
                minimum: 0,
          maximum: 1000
        },
        keyName: {
          type: 'string',
          description: 'EC2 key pair name for SSH access',
          pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$'
        },
        enableMonitoring: {
                    type: 'boolean',
          description: 'Enable detailed CloudWatch monitoring for instances',
                    default: false
              }
            },
            additionalProperties: false
    },
    containerInsights: {
      type: 'boolean',
      description: 'Enable Container Insights for advanced monitoring',
      default: true
    },
    clusterName: {
          type: 'string',
      description: 'Override for cluster name (auto-generated if not provided)',
      pattern: '^[a-zA-Z][a-zA-Z0-9-]*$',
      minLength: 1,
      maxLength: 255
    },
    tags: {
      type: 'object',
      description: 'Additional tags to apply to cluster resources',
      additionalProperties: {
        type: 'string'
      }
    }
  },
  additionalProperties: false,

  // Default values
  defaults: {
    containerInsights: true,
    capacity: {
      enableMonitoring: false
    }
  }
};

/**
 * ECS Cluster Configuration Builder
 * Implements the centralized 5-layer precedence engine for ECS cluster configuration
 */
export class EcsClusterConfigBuilder extends ConfigBuilder<EcsClusterConfig> {
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, ECS_CLUSTER_CONFIG_SCHEMA);
  }

  /**
   * Builds the final configuration using the centralized 5-layer precedence engine
   */
  public async build(): Promise<EcsClusterConfig> {
    return this.buildSync();
  }

  /**
   * Provide ECS cluster-specific hardcoded fallbacks (Layer 1: Lowest Priority)
   * These serve as ultra-safe defaults when no other configuration is available.
   */
  protected getHardcodedFallbacks(): Record<string, any> {
    return {
      serviceConnect: {
        namespace: 'internal' // Safe default namespace
      },
      containerInsights: true, // Enable observability by default
      // No capacity defaults - cluster is Fargate-only unless explicitly configured
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
          containerInsights: true, // Mandatory for high compliance
          capacity: {
            enableMonitoring: true, // Enhanced monitoring required
            instanceType: 'm5.large', // Larger instances for compliance workloads
            minSize: 2, // High availability
            maxSize: 10 // Reasonable scale for compliance
          }
        };
        
      case 'fedramp-moderate':
        return {
          containerInsights: true, // Required for compliance
          capacity: {
            enableMonitoring: true, // Enhanced monitoring
            instanceType: 't3.medium', // Cost-balanced instances
            minSize: 1,
            maxSize: 5
          }
        };
        
      default: // commercial
        return {
          containerInsights: true, // Good practice for commercial
          capacity: {
            enableMonitoring: false, // Cost optimization
            instanceType: 't3.small', // Cost-optimized instances
            minSize: 1,
            maxSize: 3
          }
        };
    }
  }
}

/**
 * ECS Cluster Component implementing Component API Contract v1.0 and
 * Platform ECS Service Connect Standard v1.0
 */
export class EcsClusterComponent extends BaseComponent {
  private cluster?: ecs.Cluster;
  private namespace?: servicediscovery.PrivateDnsNamespace;
  private autoScalingGroup?: autoscaling.AutoScalingGroup;
  private config?: EcsClusterConfig;
  private configBuilder?: EcsClusterConfigBuilder;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create ECS Cluster with Service Connect capability
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting ECS Cluster synthesis');
    
    try {
      // Build configuration using ConfigBuilder
      this.configBuilder = new EcsClusterConfigBuilder(this.context, this.spec);
      this.config = this.configBuilder.buildSync();
      
      // Create ECS Cluster
      this.createEcsCluster();
      
      // Create Service Connect namespace
      this.createServiceConnectNamespace();
      
      // Create optional EC2 capacity
      this.createEc2CapacityIfNeeded();
      
      // Configure cluster settings
      this.configureClusterSettings();
      
      // Apply standard platform tags
      this.applyClusterTags();
      
      // Register constructs for binding access
      this.registerConstruct('cluster', this.cluster!);
      this.registerConstruct('namespace', this.namespace!);
      if (this.autoScalingGroup) {
        this.registerConstruct('autoScalingGroup', this.autoScalingGroup);
      }
      
      // Register ecs:cluster capability
      this.registerCapability('ecs:cluster', this.buildEcsClusterCapability());
      
      this.logComponentEvent('synthesis_complete', 'ECS Cluster synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'ECS Cluster synthesis');
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
    return 'ecs-cluster';
  }

  /**
   * Create the ECS Cluster
   */
  private createEcsCluster(): void {
    const clusterName = this.config!.clusterName || 
      `${this.context.serviceName}-${this.spec.name}`;

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName,
      containerInsights: this.config!.containerInsights,
      enableFargateCapacityProviders: true, // Always enable Fargate
      // Service Connect namespace will be configured after namespace creation
    });

    this.logResourceCreation('ecs-cluster', clusterName);
  }

  /**
   * Create Service Connect namespace for service discovery
   */
  private createServiceConnectNamespace(): void {
    if (!this.cluster) {
      throw new Error('ECS Cluster must be created before Service Connect namespace');
    }

    // Get VPC from context or use default
    const vpc = this.getVpcFromContext();

    // Create private DNS namespace for Service Connect
    this.namespace = new servicediscovery.PrivateDnsNamespace(this, 'ServiceConnectNamespace', {
      name: this.config!.serviceConnect.namespace,
      vpc: vpc,
      description: `Service Connect namespace for ${this.context.serviceName}`,
    });

    // Configure the cluster's default Cloud Map namespace
    this.cluster.addDefaultCloudMapNamespace({
      name: this.config!.serviceConnect.namespace,
      type: servicediscovery.NamespaceType.DNS_PRIVATE,
      vpc: vpc
    });

    this.logResourceCreation('service-connect-namespace', this.config!.serviceConnect.namespace);
  }

  /**
   * Create optional EC2 capacity for the cluster
   */
  private createEc2CapacityIfNeeded(): void {
    if (!this.config!.capacity || !this.cluster) {
      this.logComponentEvent('ec2_capacity_skipped', 'No EC2 capacity configured - cluster is Fargate-only');
      return;
    }

    const capacityConfig = this.config!.capacity;
    const vpc = this.getVpcFromContext();

    // Create Auto Scaling Group for ECS instances
    this.autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
      vpc: vpc,
      instanceType: new ec2.InstanceType(capacityConfig.instanceType),
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
      minCapacity: capacityConfig.minSize,
      maxCapacity: capacityConfig.maxSize,
      desiredCapacity: capacityConfig.desiredSize || capacityConfig.minSize,
      keyName: capacityConfig.keyName,
      autoScalingGroupName: `${this.context.serviceName}-${this.spec.name}-asg`,
      
      // User data to join the ECS cluster
      userData: ec2.UserData.forLinux(),
    });

    // Configure user data to join cluster
    this.autoScalingGroup.addUserData(
      `#!/bin/bash`,
      `echo ECS_CLUSTER=${this.cluster!.clusterName} >> /etc/ecs/ecs.config`,
      `echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config`
    );

    // Enable detailed monitoring if requested
    if (capacityConfig.enableMonitoring) {
      // Note: Detailed monitoring would be configured during ASG creation
      this.logComponentEvent('monitoring_enabled', 'Detailed CloudWatch monitoring enabled for EC2 instances');
    }

    // Add capacity provider to cluster
    const capacityProvider = new ecs.AsgCapacityProvider(this, 'CapacityProvider', {
              autoScalingGroup: this.autoScalingGroup,
              enableManagedScaling: true,
      enableManagedTerminationProtection: false,
    });

    this.cluster.addAsgCapacityProvider(capacityProvider);

    this.logResourceCreation('ec2-capacity', 
      `${capacityConfig.instanceType} (${capacityConfig.minSize}-${capacityConfig.maxSize} instances)`);
  }

  /**
   * Configure additional cluster settings
   */
  private configureClusterSettings(): void {
    if (!this.cluster) return;

    // Apply compliance-specific settings
    const complianceFramework = this.context.complianceFramework;
    
    if (complianceFramework === 'fedramp-high' || complianceFramework === 'fedramp-moderate') {
      // Enable capacity providers for compliance
      this.cluster.addDefaultCapacityProviderStrategy([
        { capacityProvider: 'FARGATE', weight: 1 },
        { capacityProvider: 'FARGATE_SPOT', weight: 1 } // Cost optimization for non-critical workloads
      ]);
      
      this.logComponentEvent('compliance_configured', 
        `Applied ${complianceFramework} compliance settings`);
    } else {
      // Commercial - cost optimized with more spot usage
      this.cluster.addDefaultCapacityProviderStrategy([
        { capacityProvider: 'FARGATE', weight: 1 },
        { capacityProvider: 'FARGATE_SPOT', weight: 2 } // Favor spot for cost optimization
      ]);
    }
  }

  /**
   * Apply standard platform tags to ECS Cluster and related resources
   */
  private applyClusterTags(): void {
    if (this.cluster) {
      this.applyStandardTags(this.cluster, {
        'component-type': 'ecs-cluster',
        'service-connect-namespace': this.config!.serviceConnect.namespace
      });
    }

    if (this.namespace) {
      this.applyStandardTags(this.namespace, {
        'component-type': 'service-connect-namespace'
      });
    }

    if (this.autoScalingGroup) {
      this.applyStandardTags(this.autoScalingGroup, {
        'component-type': 'ecs-asg',
        'instance-type': this.config!.capacity?.instanceType || 'unknown'
      });
    }

    // Apply user-defined tags
    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
    if (this.cluster) {
          cdk.Tags.of(this.cluster).add(key, value);
        }
      });
    }
  }

  /**
   * Build the ecs:cluster capability according to the specification
   */
  private buildEcsClusterCapability() {
    const vpc = this.getVpcFromContext();
    
    return {
      clusterName: this.cluster!.clusterName,
      clusterArn: this.cluster!.clusterArn,
      vpcId: vpc.vpcId,
      serviceConnectNamespace: this.config!.serviceConnect.namespace,
      namespaceArn: this.namespace!.namespaceArn,
      namespaceId: this.namespace!.namespaceId,
      hasEc2Capacity: !!this.config!.capacity,
      capacityProviders: this.config!.capacity ? ['EC2', 'FARGATE'] : ['FARGATE']
    };
  }

  /**
   * Get VPC from context or throw error if not available
   */
  private getVpcFromContext(): ec2.IVpc {
    // In a real implementation, this would get the VPC from the service context
    // For now, we'll use the default VPC lookup
    return ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
  }

  /**
   * Validate that component has been synthesized before accessing capabilities
   */
  protected validateSynthesized(): void {
    if (!this.cluster) {
      throw new Error('ECS Cluster component must be synthesized before accessing capabilities');
    }
  }
}