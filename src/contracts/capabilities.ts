/**
 * Standard Capability Vocabulary
 * 
 * This file defines the standardized capability keys and their expected
 * data shapes. This vocabulary ensures consistent binding interfaces
 * across all components in the platform.
 */

/**
 * PostgreSQL database capability data shape.
 * Provided by components like 'rds-postgres', 'rds-postgres-import'
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
  
  /** Optional: Connection string template */
  connectionString?: string;
  
  /** Optional: Read replica endpoints for read scaling */
  readReplicas?: {
    host: string;
    port: number;
  }[];
}

/**
 * DynamoDB table capability data shape.
 * Provided by components like 'dynamodb-table'
 */
export interface DbDynamoDbCapability {
  /** DynamoDB table name */
  tableName: string;
  
  /** DynamoDB table ARN */
  tableArn: string;
  
  /** Optional: Global secondary index names */
  globalSecondaryIndexes?: string[];
  
  /** Optional: Local secondary index names */
  localSecondaryIndexes?: string[];
  
  /** Optional: Stream ARN if DynamoDB Streams is enabled */
  streamArn?: string;
}

/**
 * SQS queue capability data shape.
 * Provided by components like 'sqs-queue'
 */
export interface QueueSqsCapability {
  /** SQS queue URL */
  queueUrl: string;
  
  /** SQS queue ARN */
  queueArn: string;
  
  /** Optional: Dead letter queue URL */
  deadLetterQueueUrl?: string;
  
  /** Optional: Dead letter queue ARN */
  deadLetterQueueArn?: string;
  
  /** Optional: Visibility timeout in seconds */
  visibilityTimeoutSeconds?: number;
}

/**
 * SNS topic capability data shape.
 * Provided by components like 'sns-topic', 'sns-topic-import'
 */
export interface TopicSnsCapability {
  /** SNS topic ARN */
  topicArn: string;
  
  /** Optional: Topic display name */
  displayName?: string;
  
  /** Optional: Subscription ARNs if subscriptions are managed by this component */
  subscriptionArns?: string[];
  
  /** Optional: Dead letter queue for failed deliveries */
  deadLetterQueueArn?: string;
}

/**
 * S3 bucket capability data shape.
 * Provided by components like 's3-bucket'
 */
export interface BucketS3Capability {
  /** S3 bucket name */
  bucketName: string;
  
  /** S3 bucket ARN */
  bucketArn: string;
  
  /** S3 bucket domain name */
  bucketDomainName: string;
  
  /** Optional: CloudFront distribution domain if CDN is enabled */
  cloudFrontDomainName?: string;
  
  /** Optional: Bucket website endpoint if static website hosting is enabled */
  websiteUrl?: string;
}

/**
 * REST API capability data shape.
 * Provided by components like 'lambda-api', 'api-gateway'
 */
export interface ApiRestCapability {
  /** API endpoint URL */
  endpointUrl: string;
  
  /** API Gateway REST API ID */
  apiId: string;
  
  /** API Gateway stage name */
  stageName: string;
  
  /** Optional: Custom domain name */
  customDomainName?: string;
  
  /** Optional: API key for secured endpoints */
  apiKeyId?: string;
}

/**
 * Lambda function capability data shape.
 * Provided by components like 'lambda-api', 'lambda-worker'
 */
export interface LambdaFunctionCapability {
  /** Lambda function ARN */
  functionArn: string;
  
  /** Lambda function name */
  functionName: string;
  
  /** IAM role ARN used by the Lambda function */
  roleArn: string;
  
  /** Optional: Lambda layer ARNs if custom layers are used */
  layerArns?: string[];
  
  /** Optional: Environment variables that can be modified by bindings */
  environmentVariables?: Record<string, string>;
}

/**
 * VPC network capability data shape.
 * Provided by components like 'vpc'
 */
export interface NetVpcCapability {
  /** VPC ID */
  vpcId: string;
  
  /** Public subnet IDs */
  publicSubnetIds: string[];
  
  /** Private subnet IDs */
  privateSubnetIds: string[];
  
  /** Optional: Database subnet IDs */
  databaseSubnetIds?: string[];
  
  /** Optional: Internet gateway ID */
  internetGatewayId?: string;
  
  /** Optional: NAT gateway IDs */
  natGatewayIds?: string[];
}

/**
 * Load balancer target capability data shape.
 * Provided by components like 'auto-scaling-group', 'ecs-fargate-service'
 */
export interface NetLoadBalancerTargetCapability {
  /** Target group ARN for load balancer registration */
  targetGroupArn: string;
  
  /** Security group ID that allows traffic from the load balancer */
  sgId: string;
  
  /** Port number for health checks and traffic */
  port: number;
  
  /** Optional: Health check path for HTTP targets */
  healthCheckPath?: string;
}

/**
 * SSH access capability data shape.
 * Provided by components like 'ec2-instance'
 */
export interface NetSshAccessCapability {
  /** Security group ID that allows SSH access */
  sgId: string;
  
  /** SSH port (typically 22) */
  port: number;
  
  /** Optional: Key pair name for SSH authentication */
  keyPairName?: string;
  
  /** Optional: Instance ID for direct connection */
  instanceId?: string;
}

/**
 * ECS Service Connect endpoint capability data shape.
 * Provided by components like 'ecs-fargate-service'
 */
export interface ServiceConnectCapability {
  /** Service Connect namespace */
  namespace: string;
  
  /** Service name within the namespace */
  serviceName: string;
  
  /** Port number for service communication */
  port: number;
  
  /** Optional: Custom DNS name */
  dnsName?: string;
}

/**
 * EventBridge rule target capability data shape.
 * Provided by components like 'eventbridge-rule'
 */
export interface EventTriggerCapability {
  /** EventBridge rule ARN */
  ruleArn: string;
  
  /** EventBridge event bus name */
  eventBusName: string;
  
  /** Event pattern that triggers this rule */
  eventPattern: Record<string, any>;
  
  /** Optional: Schedule expression if this is a scheduled rule */
  scheduleExpression?: string;
}

/**
 * Union type of all standard capability data shapes.
 * Used for type-safe capability handling in binding strategies.
 */
export type StandardCapabilityData = 
  | DbPostgresCapability
  | DbDynamoDbCapability
  | QueueSqsCapability
  | TopicSnsCapability
  | BucketS3Capability
  | ApiRestCapability
  | LambdaFunctionCapability
  | NetVpcCapability
  | NetLoadBalancerTargetCapability
  | NetSshAccessCapability
  | ServiceConnectCapability
  | EventTriggerCapability;

/**
 * Standard Capability Vocabulary Registry
 * 
 * This constant defines the mapping between capability keys and their
 * corresponding TypeScript interfaces. This registry is used by:
 * - Component validation
 * - Binding strategy selection
 * - Documentation generation
 * - IDE IntelliSense support
 */
export const STANDARD_CAPABILITIES = {
  'db:postgres': 'DbPostgresCapability',
  'db:dynamodb': 'DbDynamoDbCapability',
  'queue:sqs': 'QueueSqsCapability', 
  'topic:sns': 'TopicSnsCapability',
  'bucket:s3': 'BucketS3Capability',
  'api:rest': 'ApiRestCapability',
  'lambda:function': 'LambdaFunctionCapability',
  'net:vpc': 'NetVpcCapability',
  'net:load-balancer-target': 'NetLoadBalancerTargetCapability',
  'net:ssh-access': 'NetSshAccessCapability',
  'service:connect': 'ServiceConnectCapability',
  'event:trigger': 'EventTriggerCapability'
} as const;

/**
 * Type-safe capability key union
 */
export type StandardCapabilityKey = keyof typeof STANDARD_CAPABILITIES;