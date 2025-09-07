/**
 * Platform Capability Naming Standard v1.0
 * 
 * This file defines the official vocabulary of capability keys and their mandatory
 * data shapes. All capability keys follow the `category:service` format and provide
 * real, tokenized values from underlying CDK constructs for automated binding.
 * 
 * Adherence to this standard is mandatory for all components in the platform library.
 */

// ============================================================================
// Database Capabilities
// ============================================================================

/**
 * PostgreSQL database capability data shape.
 * Provided by components like 'rds-postgres', 'rds-postgres-import'
 * 
 * Capability Key: `db:postgres`
 */
export interface DbPostgresCapability {
  /** Database hostname */
  host: string;
  
  /** Database port */
  port: number;
  
  /** Database name */
  dbName: string;
  
  /** ARN of the secret containing database credentials */
  secretArn: string;
  
  /** Security group ID for network access */
  sgId: string;
  
  /** RDS instance ARN for direct AWS API access */
  instanceArn: string;
}

/**
 * MySQL database capability data shape.
 * Provided by components like 'rds-mysql', 'rds-mysql-import'
 * 
 * Capability Key: `db:mysql`
 */
export interface DbMysqlCapability {
  /** Database hostname */
  host: string;
  
  /** Database port */
  port: number;
  
  /** Database name */
  dbName: string;
  
  /** ARN of the secret containing database credentials */
  secretArn: string;
  
  /** Security group ID for network access */
  sgId: string;
  
  /** RDS instance ARN for direct AWS API access */
  instanceArn: string;
}

/**
 * DynamoDB NoSQL table capability data shape.
 * Provided by components like 'dynamodb-table'
 * 
 * Capability Key: `db:dynamodb`
 */
export interface DbDynamoDbCapability {
  /** DynamoDB table name */
  tableName: string;
  
  /** DynamoDB table ARN */
  tableArn: string;
}

// ============================================================================
// Caching Capabilities
// ============================================================================

/**
 * Redis in-memory cache capability data shape.
 * Provided by components like 'elasticache-redis'
 * 
 * Capability Key: `cache:redis`
 */
export interface CacheRedisCapability {
  /** Redis endpoint hostname */
  host: string;
  
  /** Redis port */
  port: number;
  
  /** Security group ID for network access */
  sgId: string;
}

/**
 * Memcached in-memory cache capability data shape.
 * Provided by components like 'elasticache-memcached'
 * 
 * Capability Key: `cache:memcached`
 */
export interface CacheMemcachedCapability {
  /** Memcached endpoint hostname */
  host: string;
  
  /** Memcached port */
  port: number;
  
  /** Security group ID for network access */
  sgId: string;
}

// ============================================================================
// Storage Capabilities
// ============================================================================

/**
 * S3 object storage bucket capability data shape.
 * Provided by components like 's3-bucket'
 * 
 * Capability Key: `bucket:s3`
 */
export interface BucketS3Capability {
  /** S3 bucket name */
  bucketName: string;
  
  /** S3 bucket ARN */
  bucketArn: string;
}

// ============================================================================
// Messaging & Streaming Capabilities
// ============================================================================

/**
 * SQS message queue capability data shape.
 * Provided by components like 'sqs-queue'
 * 
 * Capability Key: `queue:sqs`
 */
export interface QueueSqsCapability {
  /** SQS queue URL */
  queueUrl: string;
  
  /** SQS queue ARN */
  queueArn: string;
}

/**
 * SNS pub/sub topic capability data shape.
 * Provided by components like 'sns-topic', 'sns-topic-import'
 * 
 * Capability Key: `topic:sns`
 */
export interface TopicSnsCapability {
  /** SNS topic ARN */
  topicArn: string;
}

/**
 * Kinesis data stream capability data shape.
 * Provided by components like 'kinesis-stream'
 * 
 * Capability Key: `stream:kinesis`
 */
export interface StreamKinesisCapability {
  /** Kinesis stream name */
  streamName: string;
  
  /** Kinesis stream ARN */
  streamArn: string;
}

/**
 * EventBridge event bus capability data shape.
 * Provided by components like 'eventbridge-bus'
 * 
 * Capability Key: `bus:eventbridge`
 */
export interface BusEventBridgeCapability {
  /** EventBridge event bus name */
  busName: string;
  
  /** EventBridge event bus ARN */
  busArn: string;
}

// ============================================================================
// API & Compute Capabilities
// ============================================================================

/**
 * REST API endpoint capability data shape.
 * Provided by components like 'lambda-api', 'api-gateway'
 * 
 * Capability Key: `api:rest`
 */
export interface ApiRestCapability {
  /** API endpoint URL */
  endpointUrl: string;
  
  /** API Gateway REST API ID */
  apiId: string;
}

/**
 * Lambda function capability data shape.
 * Provided by components like 'lambda-api', 'lambda-worker'
 * 
 * Capability Key: `lambda:function`
 */
export interface LambdaFunctionCapability {
  /** Lambda function ARN */
  functionArn: string;
  
  /** Lambda function name */
  functionName: string;
  
  /** IAM role ARN used by the Lambda function */
  roleArn: string;
}

/**
 * EC2 compute instance capability data shape.
 * Provided by components like 'ec2-instance'
 * 
 * Capability Key: `compute:ec2`
 */
export interface ComputeEc2Capability {
  /** EC2 instance ID */
  instanceId: string;
  
  /** Private IP address of the instance */
  privateIp: string;
  
  /** IAM role ARN used by the instance */
  roleArn: string;
}

/**
 * Auto Scaling Group capability data shape.
 * Provided by components like 'auto-scaling-group'
 * 
 * Capability Key: `compute:asg`
 */
export interface ComputeAsgCapability {
  /** Auto Scaling Group ARN */
  asgArn: string;
  
  /** Auto Scaling Group name */
  asgName: string;
  
  /** IAM role ARN used by instances in the ASG */
  roleArn: string;
}

// ============================================================================
// Networking Capabilities
// ============================================================================

/**
 * Virtual Private Cloud network capability data shape.
 * Provided by components like 'vpc'
 * 
 * Capability Key: `net:vpc`
 */
export interface NetVpcCapability {
  /** VPC ID */
  vpcId: string;
  
  /** Public subnet IDs */
  publicSubnetIds: string[];
  
  /** Private subnet IDs */
  privateSubnetIds: string[];
}

/**
 * Load balancer target capability data shape.
 * Provided by components like 'auto-scaling-group', 'ecs-fargate-service'
 * 
 * Capability Key: `net:load-balancer-target`
 */
export interface NetLoadBalancerTargetCapability {
  /** Target group ARN for load balancer registration */
  targetGroupArn: string;
  
  /** Security group ID that allows traffic from the load balancer */
  sgId: string;
}

/**
 * SSH access capability data shape.
 * Provided by components like 'ec2-instance'
 * 
 * Capability Key: `net:ssh-access`
 */
export interface NetSshAccessCapability {
  /** Security group ID that allows SSH access */
  sgId: string;
}

// ============================================================================
// Service Integration Capabilities
// ============================================================================

/**
 * ECS Service Connect endpoint capability data shape.
 * Provided by components like 'ecs-fargate-service'
 * 
 * Capability Key: `service:connect`
 */
export interface ServiceConnectCapability {
  /** Service Connect namespace */
  namespace: string;
  
  /** Service name within the namespace */
  serviceName: string;
}

/**
 * Event rule target capability data shape.
 * Provided by components like 'eventbridge-rule'
 * 
 * Capability Key: `event:trigger`
 */
export interface EventTriggerCapability {
  /** EventBridge rule ARN */
  ruleArn: string;
}

// ============================================================================
// Union Types & Registry
// ============================================================================

/**
 * Union type of all standard capability data shapes.
 * Used for type-safe capability handling in binding strategies.
 */
export type StandardCapabilityData = 
  | DbPostgresCapability
  | DbMysqlCapability
  | DbDynamoDbCapability
  | CacheRedisCapability
  | CacheMemcachedCapability
  | BucketS3Capability
  | QueueSqsCapability
  | TopicSnsCapability
  | StreamKinesisCapability
  | BusEventBridgeCapability
  | ApiRestCapability
  | LambdaFunctionCapability
  | ComputeEc2Capability
  | ComputeAsgCapability
  | NetVpcCapability
  | NetLoadBalancerTargetCapability
  | NetSshAccessCapability
  | ServiceConnectCapability
  | EventTriggerCapability;

/**
 * Platform Capability Naming Standard Registry v1.0
 * 
 * This registry defines the complete mapping between capability keys and their
 * mandatory data shape interfaces. All capability keys follow `category:service`
 * format and provide real, tokenized values from underlying CDK constructs.
 * 
 * Used by:
 * - Component validation and type checking
 * - Binding strategy selection and routing
 * - Automated documentation generation
 * - IDE IntelliSense and code completion
 */
export const STANDARD_CAPABILITIES = {
  // Database Capabilities
  'db:postgres': 'DbPostgresCapability',
  'db:mysql': 'DbMysqlCapability',
  'db:dynamodb': 'DbDynamoDbCapability',
  
  // Caching Capabilities
  'cache:redis': 'CacheRedisCapability',
  'cache:memcached': 'CacheMemcachedCapability',
  
  // Storage Capabilities
  'bucket:s3': 'BucketS3Capability',
  
  // Messaging & Streaming Capabilities
  'queue:sqs': 'QueueSqsCapability',
  'topic:sns': 'TopicSnsCapability',
  'stream:kinesis': 'StreamKinesisCapability',
  'bus:eventbridge': 'BusEventBridgeCapability',
  
  // API & Compute Capabilities
  'api:rest': 'ApiRestCapability',
  'lambda:function': 'LambdaFunctionCapability',
  'compute:ec2': 'ComputeEc2Capability',
  'compute:asg': 'ComputeAsgCapability',
  
  // Networking Capabilities
  'net:vpc': 'NetVpcCapability',
  'net:load-balancer-target': 'NetLoadBalancerTargetCapability',
  'net:ssh-access': 'NetSshAccessCapability',
  
  // Service Integration Capabilities
  'service:connect': 'ServiceConnectCapability',
  'event:trigger': 'EventTriggerCapability'
} as const;

/**
 * Type-safe capability key union
 */
export type StandardCapabilityKey = keyof typeof STANDARD_CAPABILITIES;