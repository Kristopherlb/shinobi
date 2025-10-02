/**
 * Comprehensive Binder Registry
 * Registry for all AWS service binder strategies
 */

import { IBinderStrategy } from '../strategies/binder-strategy.js';

// Compute Services
import { EcsFargateBinderStrategy } from '../strategies/compute/ecs-fargate-binder-strategy.js';
import { EksBinderStrategy } from '../strategies/compute/eks-binder-strategy.js';
import { AppRunnerBinderStrategy } from '../strategies/compute/app-runner-binder-strategy.js';
import { BatchBinderStrategy } from '../strategies/compute/batch-binder-strategy.js';
import { ElasticBeanstalkBinderStrategy } from '../strategies/compute/elastic-beanstalk-binder-strategy.js';
import { LightsailBinderStrategy } from '../strategies/compute/lightsail-binder-strategy.js';

// Database Services
import { DynamoDbBinderStrategy } from '../strategies/database/dynamodb-binder-strategy.js';
import { NeptuneBinderStrategy } from '../strategies/database/neptune-binder-strategy.js';

// Networking Services
import { VpcBinderStrategy } from '../strategies/networking/vpc-binder-strategy.js';

// Analytics Services
import { KinesisBinderStrategy } from '../strategies/analytics/kinesis-binder-strategy.js';
import { EmrBinderStrategy } from '../strategies/analytics/emr-binder-strategy.js';

// Storage Services
import { EfsBinderStrategy } from '../strategies/storage/efs-binder-strategy.js';

// Security Services
import { SecretsManagerBinderStrategy } from '../strategies/security/secrets-manager-binder-strategy.js';
import { KmsBinderStrategy } from '../strategies/security/kms-binder-strategy.js';
import { CertificateBinderStrategy } from '../strategies/security/certificate-binder-strategy.js';

// ML Services
import { SageMakerBinderStrategy } from '../strategies/ml/sagemaker-binder-strategy.js';

// Messaging Services
import { EventBridgeBinderStrategy } from '../strategies/messaging/eventbridge-binder-strategy.js';
import { StepFunctionsBinderStrategy } from '../strategies/messaging/step-functions-binder-strategy.js';

// Mobile Services
import { AmplifyBinderStrategy } from '../strategies/mobile/amplify-binder-strategy.js';

// IoT Services
import { IoTCoreBinderStrategy } from '../strategies/iot/iot-core-binder-strategy.js';

// CDN Services
import { CloudFrontBinderStrategy } from '../strategies/cdn/cloudfront-binder-strategy.js';

// Note: Existing strategies would be imported here when they're available
// import { S3BinderStrategy } from '../strategies/storage/s3-binder-strategy.js';
// import { RdsBinderStrategy } from '../strategies/database/rds-binder-strategy.js';
// import { SqsBinderStrategy } from '../strategies/messaging/sqs-binder-strategy.js';
// import { SnsBinderStrategy } from '../strategies/messaging/sns-binder-strategy.js';
// import { LambdaBinderStrategy } from '../strategies/compute/lambda-binder-strategy.js';

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
    this.register('emr', new EmrBinderStrategy());

    // Storage Services
    this.register('efs', new EfsBinderStrategy());

    // Security Services
    this.register('secrets-manager', new SecretsManagerBinderStrategy());
    this.register('kms', new KmsBinderStrategy());
    this.register('certificate:acm', new CertificateBinderStrategy());

    // ML Services
    this.register('sagemaker', new SageMakerBinderStrategy());

    // Messaging Services
    this.register('eventbridge', new EventBridgeBinderStrategy());
    this.register('step-functions', new StepFunctionsBinderStrategy());

    // Mobile Services
    this.register('amplify', new AmplifyBinderStrategy());

    // IoT Services
    this.register('iot-core', new IoTCoreBinderStrategy());

    // CDN Services
    this.register('cloudfront', new CloudFrontBinderStrategy());

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
        'efs'
        // 's3-bucket' - would be added when available
      ],
      'Security': [
        'secrets-manager',
        'kms'
      ],
      'ML': [
        'sagemaker'
      ],
      'Messaging': [
        'eventbridge',
        'step-functions'
        // 'sqs-queue', 'sns-topic' - would be added when available
      ],
      'Mobile': [
        'amplify'
      ],
      'IoT': [
        'iot-core'
      ],
      'Networking': [
        'vpc'
      ],
      'Analytics': [
        'kinesis',
        'emr'
      ],
      'CDN': [
        'cloudfront'
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
      ],
      'efs': [
        'Configure appropriate performance mode for workload',
        'Set up mount targets across availability zones',
        'Enable encryption at rest with KMS',
        'Configure access points for fine-grained access control'
      ],
      'secrets-manager': [
        'Configure automatic rotation for sensitive secrets',
        'Set up resource-based policies for access control',
        'Enable audit logging for compliance',
        'Use least privilege access principles'
      ],
      'kms': [
        'Configure key policies for access control',
        'Enable automatic key rotation for compliance',
        'Set up multi-region keys for high availability',
        'Configure audit logging for key usage'
      ],
      'sagemaker': [
        'Configure VPC security groups for private access',
        'Enable encryption at rest and in transit',
        'Set up monitoring and alerting for ML workloads',
        'Configure IAM roles with least privilege access'
      ],
      'eventbridge': [
        'Configure event filtering for security',
        'Set up dead letter queues for failed events',
        'Enable audit logging for compliance',
        'Configure retry policies for reliability'
      ],
      'step-functions': [
        'Configure logging and monitoring for workflows',
        'Set up X-Ray tracing for debugging',
        'Enable encryption for sensitive data',
        'Configure dead letter queues for failed executions'
      ],
      'amplify': [
        'Configure custom headers for security',
        'Enable HTTPS redirect for secure access',
        'Set up WAF for additional protection',
        'Configure access logging for monitoring'
      ],
      'iot-core': [
        'Configure device authentication and certificates',
        'Set up device monitoring and alerting',
        'Enable audit logging for compliance',
        'Configure mutual TLS for secure communication'
      ],
      'cloudfront': [
        'Configure HTTPS only for secure access',
        'Set up WAF for additional security',
        'Enable access logging for monitoring',
        'Configure geo restrictions for compliance'
      ],
      'emr': [
        'Configure VPC for private cluster access',
        'Enable encryption at rest and in transit',
        'Set up Kerberos authentication for security',
        'Configure audit logging for compliance'
      ]
    };

    return recommendations[serviceType] || [];
  }
}
