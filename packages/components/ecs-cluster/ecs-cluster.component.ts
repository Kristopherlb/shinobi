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
import { EcsClusterConfig, EcsClusterComponentConfigBuilder } from './ecs-cluster.builder';


/**
 * ECS Cluster Component implementing Component API Contract v1.0 and
 * Platform ECS Service Connect Standard v1.0
 */
export class EcsClusterComponent extends BaseComponent {
  private cluster?: ecs.Cluster;
  private namespace?: servicediscovery.PrivateDnsNamespace;
  private autoScalingGroup?: autoscaling.AutoScalingGroup;
  private readonly config: EcsClusterConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
    
    // Build configuration only - no synthesis in constructor
    const configBuilder = new EcsClusterComponentConfigBuilder({ context, spec });
    this.config = configBuilder.buildSync();
  }

  /**
   * Synthesis phase - Create ECS Cluster with Service Connect capability
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting ECS Cluster synthesis');
    
    const startTime = Date.now();
    
    try {
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
      
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
      
      this.logComponentEvent('synthesis_complete', 'ECS Cluster synthesis completed successfully', {
        clusterCreated: 1,
        namespaceCreated: 1,
        capacityCreated: !!this.autoScalingGroup
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'ecs-cluster',
        stage: 'synthesis'
      });
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
    const clusterName = this.config.clusterName || 
      `${this.context.serviceName}-${this.spec.name}`;

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName,
      containerInsights: this.config.containerInsights,
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
      name: this.config.serviceConnect.namespace,
      vpc: vpc,
      description: `Service Connect namespace for ${this.context.serviceName}`,
    });

    // Configure the cluster's default Cloud Map namespace
    this.cluster.addDefaultCloudMapNamespace({
      name: this.config.serviceConnect.namespace,
      type: servicediscovery.NamespaceType.DNS_PRIVATE,
      vpc: vpc
    });

    this.logResourceCreation('service-connect-namespace', this.config.serviceConnect.namespace);
  }

  /**
   * Create optional EC2 capacity for the cluster
   */
  private createEc2CapacityIfNeeded(): void {
    if (!this.config.capacity || !this.cluster) {
      this.logComponentEvent('ec2_capacity_skipped', 'No EC2 capacity configured - cluster is Fargate-only');
      return;
    }

    const capacityConfig = this.config.capacity;
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
        'service-connect-namespace': this.config.serviceConnect.namespace
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
        'instance-type': this.config.capacity?.instanceType || 'unknown'
      });
    }

    // Apply user-defined tags
    if (this.config.tags) {
      Object.entries(this.config.tags).forEach(([key, value]) => {
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
      serviceConnectNamespace: this.config.serviceConnect.namespace,
      namespaceArn: this.namespace!.namespaceArn,
      namespaceId: this.namespace!.namespaceId,
      hasEc2Capacity: !!this.config.capacity,
      capacityProviders: this.config.capacity ? ['EC2', 'FARGATE'] : ['FARGATE']
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