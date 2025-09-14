/**
 * Comprehensive Binder Registry
 * Registry for all AWS service binder strategies
 */

import { IBinderStrategy } from '../strategies/binder-strategy';

// Compute Services
import { EcsFargateBinderStrategy } from '../strategies/compute/ecs-fargate-binder-strategy';
import { EksBinderStrategy } from '../strategies/compute/eks-binder-strategy';
import { AppRunnerBinderStrategy } from '../strategies/compute/app-runner-binder-strategy';
import { BatchBinderStrategy } from '../strategies/compute/batch-binder-strategy';
import { ElasticBeanstalkBinderStrategy } from '../strategies/compute/elastic-beanstalk-binder-strategy';
import { LightsailBinderStrategy } from '../strategies/compute/lightsail-binder-strategy';

// Database Services
import { DynamoDbBinderStrategy } from '../strategies/database/dynamodb-binder-strategy';
import { NeptuneBinderStrategy } from '../strategies/database/neptune-binder-strategy';

// Networking Services
import { VpcBinderStrategy } from '../strategies/networking/vpc-binder-strategy';

// Analytics Services
import { KinesisBinderStrategy } from '../strategies/analytics/kinesis-binder-strategy';

// Note: Existing strategies would be imported here when they're available
// import { S3BinderStrategy } from '../strategies/storage/s3-binder-strategy';
// import { RdsBinderStrategy } from '../strategies/database/rds-binder-strategy';
// import { SqsBinderStrategy } from '../strategies/messaging/sqs-binder-strategy';
// import { SnsBinderStrategy } from '../strategies/messaging/sns-binder-strategy';
// import { LambdaBinderStrategy } from '../strategies/compute/lambda-binder-strategy';

export class ComprehensiveBinderRegistry {
  private strategies: Map<string, IBinderStrategy> = new Map();

  constructor() {
    this.registerAllStrategies();
  }

  private registerAllStrategies(): void {
    // Compute Services
    this.register('ecs-fargate', new EcsFargateBinderStrategy());
    this.register('eks', new EksBinderStrategy());
    this.register('app-runner', new AppRunnerBinderStrategy());
    this.register('batch', new BatchBinderStrategy());
    this.register('elastic-beanstalk', new ElasticBeanstalkBinderStrategy());
    this.register('lightsail', new LightsailBinderStrategy());

    // Database Services
    this.register('dynamodb', new DynamoDbBinderStrategy());
    this.register('neptune', new NeptuneBinderStrategy());

    // Networking Services
    this.register('vpc', new VpcBinderStrategy());

    // Analytics Services
    this.register('kinesis', new KinesisBinderStrategy());

    // Note: Existing strategies would be registered here when they're available
    // this.register('s3-bucket', new S3BinderStrategy());
    // this.register('rds-postgres', new RdsBinderStrategy());
    // this.register('sqs-queue', new SqsBinderStrategy());
    // this.register('sns-topic', new SnsBinderStrategy());
    // this.register('lambda-api', new LambdaBinderStrategy());
  }

  register(serviceType: string, strategy: IBinderStrategy): void {
    this.strategies.set(serviceType, strategy);
  }

  get(serviceType: string): IBinderStrategy | undefined {
    return this.strategies.get(serviceType);
  }

  getSupportedCapabilities(serviceType: string): string[] {
    const strategy = this.strategies.get(serviceType);
    return strategy ? strategy.supportedCapabilities : [];
  }

  getAllServiceTypes(): string[] {
    return Array.from(this.strategies.keys());
  }

  getServicesByCategory(): Record<string, string[]> {
    return {
      'Compute': [
        'ecs-fargate',
        'eks',
        'app-runner',
        'batch',
        'elastic-beanstalk',
        'lightsail'
      ],
      'Database': [
        'dynamodb',
        'neptune'
      ],
      'Storage': [
        // 's3-bucket' - would be added when available
      ],
      'Messaging': [
        // 'sqs-queue', 'sns-topic' - would be added when available
      ],
      'Networking': [
        'vpc'
      ],
      'Analytics': [
        'kinesis'
      ]
    };
  }

  validateBinding(serviceType: string, capability: string): boolean {
    const strategy = this.strategies.get(serviceType);
    if (!strategy) {
      return false;
    }
    return strategy.supportedCapabilities.includes(capability);
  }

  getBindingRecommendations(serviceType: string): string[] {
    const recommendations: Record<string, string[]> = {
      'ecs-fargate': [
        'Bind to ECS cluster for container orchestration',
        'Configure IAM roles for task execution',
        'Set up service discovery for inter-service communication',
        'Configure load balancer integration for external access'
      ],
      'eks': [
        'Bind to EKS cluster for Kubernetes management',
        'Configure RBAC for pod-level access control',
        'Set up service mesh for secure communication',
        'Configure monitoring and logging'
      ],
      'dynamodb': [
        'Configure appropriate read/write capacity',
        'Set up global secondary indexes for query optimization',
        'Enable point-in-time recovery for compliance',
        'Configure DynamoDB streams for real-time processing'
      ],
      'neptune': [
        'Configure VPC security groups for network isolation',
        'Enable encryption at rest and in transit',
        'Set up backup and recovery procedures',
        'Configure audit logging for compliance'
      ],
      'vpc': [
        'Configure VPC with appropriate CIDR blocks',
        'Set up public and private subnets across AZs',
        'Configure security groups with least privilege access',
        'Enable VPC Flow Logs for network monitoring'
      ],
      'kinesis': [
        'Configure appropriate shard count for throughput',
        'Set up encryption at rest and in transit',
        'Enable monitoring and alerting',
        'Configure data retention policies for compliance'
      ]
    };

    return recommendations[serviceType] || [];
  }
}
