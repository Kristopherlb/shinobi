/**
 * Component Registry and Exports
 * 
 * Central registry for all FedRAMP-Aware CDK Platform components following
 * Component API Contract v1.0 with three-tiered compliance model.
 */

// Component exports
export { LambdaApiComponent, LAMBDA_API_CONFIG_SCHEMA } from './lambda-api/lambda-api.component';
export { LambdaWorkerComponent, LAMBDA_WORKER_CONFIG_SCHEMA } from './lambda-worker/lambda-worker.component';
export { S3BucketComponent, S3_BUCKET_CONFIG_SCHEMA } from './s3-bucket/s3-bucket.component';
export { RdsPostgresComponent, RDS_POSTGRES_CONFIG_SCHEMA } from './rds-postgres/rds-postgres.component';
export { VpcComponent, VPC_CONFIG_SCHEMA } from './vpc/vpc.component';
export { SqsQueueComponent, SQS_QUEUE_CONFIG_SCHEMA } from './sqs-queue/sqs-queue.component';
export { SnsTopicComponent, SNS_TOPIC_CONFIG_SCHEMA } from './sns-topic/sns-topic.component';
export { Ec2InstanceComponent, EC2_INSTANCE_CONFIG_SCHEMA } from './ec2-instance/ec2-instance.component';
export { AutoScalingGroupComponent, AUTO_SCALING_GROUP_CONFIG_SCHEMA } from './auto-scaling-group/auto-scaling-group.component';

// Configuration type exports
export type { LambdaApiConfig } from './lambda-api/lambda-api.component';
export type { LambdaWorkerConfig } from './lambda-worker/lambda-worker.component';
export type { S3BucketConfig } from './s3-bucket/s3-bucket.component';
export type { RdsPostgresConfig } from './rds-postgres/rds-postgres.component';
export type { VpcConfig } from './vpc/vpc.component';
export type { SqsQueueConfig } from './sqs-queue/sqs-queue.component';
export type { SnsTopicConfig } from './sns-topic/sns-topic.component';
export type { Ec2InstanceConfig } from './ec2-instance/ec2-instance.component';
export type { AutoScalingGroupConfig } from './auto-scaling-group/auto-scaling-group.component';

/**
 * Component Registry for programmatic component discovery and instantiation
 */
export interface ComponentRegistryEntry {
  /** Component class constructor */
  componentClass: any;
  /** Configuration schema */
  configSchema: any;
  /** Component type identifier */
  type: string;
  /** Human-readable description */
  description: string;
  /** Capabilities provided by this component */
  provides: string[];
  /** Component category */
  category: 'compute' | 'storage' | 'database' | 'networking' | 'messaging' | 'api';
  /** Compliance frameworks supported */
  complianceSupport: Array<'commercial' | 'fedramp-moderate' | 'fedramp-high'>;
}

/**
 * Central component registry following Platform Capability Naming Standard v1.0
 */
export const COMPONENT_REGISTRY: Record<string, ComponentRegistryEntry> = {
  'lambda-api': {
    componentClass: LambdaApiComponent,
    configSchema: LAMBDA_API_CONFIG_SCHEMA,
    type: 'lambda-api',
    description: 'Lambda function for synchronous API workloads with API Gateway integration',
    provides: ['lambda:function', 'api:rest'],
    category: 'compute',
    complianceSupport: ['commercial', 'fedramp-moderate', 'fedramp-high']
  },
  
  'lambda-worker': {
    componentClass: LambdaWorkerComponent,
    configSchema: LAMBDA_WORKER_CONFIG_SCHEMA,
    type: 'lambda-worker',
    description: 'Lambda function for asynchronous background processing workloads',
    provides: ['lambda:function'],
    category: 'compute',
    complianceSupport: ['commercial', 'fedramp-moderate', 'fedramp-high']
  },
  
  's3-bucket': {
    componentClass: S3BucketComponent,
    configSchema: S3_BUCKET_CONFIG_SCHEMA,
    type: 's3-bucket',
    description: 'S3 bucket for object storage with compliance hardening',
    provides: ['bucket:s3'],
    category: 'storage',
    complianceSupport: ['commercial', 'fedramp-moderate', 'fedramp-high']
  },
  
  'rds-postgres': {
    componentClass: RdsPostgresComponent,
    configSchema: RDS_POSTGRES_CONFIG_SCHEMA,
    type: 'rds-postgres',
    description: 'Managed PostgreSQL relational database with comprehensive compliance hardening',
    provides: ['db:postgres'],
    category: 'database',
    complianceSupport: ['commercial', 'fedramp-moderate', 'fedramp-high']
  },
  
  'vpc': {
    componentClass: VpcComponent,
    configSchema: VPC_CONFIG_SCHEMA,
    type: 'vpc',
    description: 'Virtual Private Cloud with network isolation and compliance-aware networking rules',
    provides: ['net:vpc'],
    category: 'networking',
    complianceSupport: ['commercial', 'fedramp-moderate', 'fedramp-high']
  },
  
  'sqs-queue': {
    componentClass: SqsQueueComponent,
    configSchema: SQS_QUEUE_CONFIG_SCHEMA,
    type: 'sqs-queue',
    description: 'Managed message queue with compliance hardening and DLQ support',
    provides: ['queue:sqs'],
    category: 'messaging',
    complianceSupport: ['commercial', 'fedramp-moderate', 'fedramp-high']
  },
  
  'sns-topic': {
    componentClass: SnsTopicComponent,
    configSchema: SNS_TOPIC_CONFIG_SCHEMA,
    type: 'sns-topic',
    description: 'Pub/sub topic with compliance hardening and subscription management',
    provides: ['topic:sns'],
    category: 'messaging',
    complianceSupport: ['commercial', 'fedramp-moderate', 'fedramp-high']
  },
  
  'ec2-instance': {
    componentClass: Ec2InstanceComponent,
    configSchema: EC2_INSTANCE_CONFIG_SCHEMA,
    type: 'ec2-instance',
    description: 'Managed EC2 compute instance with compliance hardening',
    provides: ['compute:ec2'],
    category: 'compute',
    complianceSupport: ['commercial', 'fedramp-moderate', 'fedramp-high']
  },
  
  'auto-scaling-group': {
    componentClass: AutoScalingGroupComponent,
    configSchema: AUTO_SCALING_GROUP_CONFIG_SCHEMA,
    type: 'auto-scaling-group',
    description: 'Managed auto scaling group with launch template and compliance hardening',
    provides: ['compute:asg'],
    category: 'compute',
    complianceSupport: ['commercial', 'fedramp-moderate', 'fedramp-high']
  }
};

/**
 * Component Registry Helper Functions
 */
export class ComponentRegistry {
  /**
   * Get all registered components
   */
  static getAllComponents(): ComponentRegistryEntry[] {
    return Object.values(COMPONENT_REGISTRY);
  }

  /**
   * Get component by type
   */
  static getComponent(type: string): ComponentRegistryEntry | undefined {
    return COMPONENT_REGISTRY[type];
  }

  /**
   * Get components by category
   */
  static getComponentsByCategory(category: ComponentRegistryEntry['category']): ComponentRegistryEntry[] {
    return Object.values(COMPONENT_REGISTRY).filter(entry => entry.category === category);
  }

  /**
   * Get components that provide a specific capability
   */
  static getComponentsByCapability(capability: string): ComponentRegistryEntry[] {
    return Object.values(COMPONENT_REGISTRY).filter(entry => 
      entry.provides.includes(capability)
    );
  }

  /**
   * Get components that support a specific compliance framework
   */
  static getComponentsByCompliance(framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'): ComponentRegistryEntry[] {
    return Object.values(COMPONENT_REGISTRY).filter(entry => 
      entry.complianceSupport.includes(framework)
    );
  }

  /**
   * Validate component exists and supports compliance framework
   */
  static validateComponent(type: string, complianceFramework: string): boolean {
    const component = COMPONENT_REGISTRY[type];
    if (!component) {
      return false;
    }
    
    return component.complianceSupport.includes(complianceFramework as any);
  }

  /**
   * Get all capabilities provided by registered components
   */
  static getAllCapabilities(): string[] {
    const capabilities = new Set<string>();
    Object.values(COMPONENT_REGISTRY).forEach(entry => {
      entry.provides.forEach(capability => capabilities.add(capability));
    });
    return Array.from(capabilities).sort();
  }
}

/**
 * Component Factory for dynamic component instantiation
 */
export class ComponentFactory {
  /**
   * Create a component instance by type
   */
  static createComponent(
    type: string,
    scope: any,
    id: string,
    context: any,
    spec: any
  ): any {
    const entry = ComponentRegistry.getComponent(type);
    if (!entry) {
      throw new Error(`Unknown component type: ${type}`);
    }

    if (!ComponentRegistry.validateComponent(type, context.complianceFramework)) {
      throw new Error(`Component ${type} does not support compliance framework: ${context.complianceFramework}`);
    }

    return new entry.componentClass(scope, id, context, spec);
  }
}