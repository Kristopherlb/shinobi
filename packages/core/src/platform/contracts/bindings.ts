/**
 * Core binding contracts and types
 * 
 * Central type hub for bindings — re-exports canonical interfaces, defines capability
 * vocabularies, data shapes, IAM/SG rules, and compliance types.
 * 
 * EXTENSIBILITY FOR EXTERNAL USERS
 * 
 * Users without codebase access can extend the platform via configuration:
 * 
 * 1. Custom Compliance Frameworks/Rules
 *    → Provide custom YAML config via context.options.complianceConfigPath
 *    → Or runtime override via context.options.complianceRulesOverride
 *    → Framework names are extensible via config (no code changes needed)
 * 
 * 2. Custom Capabilities
 *    → Use any string in 'capability' field (e.g., 'db:snowflake', 'storage:gcs')
 *    → Provide target data via custom labels or metadata
 *    → Falls back to CustomCapabilityData type for type safety
 *    → Strategies should handle unknown capabilities gracefully via canHandle()
 * 
 * 3. Custom Target Data
 *    → Falls back to CustomCapabilityData in union
 *    → Type system will accept any object with 'type' field
 */

import type {
  BindingContext,
  BindingResult,
  IBinderStrategy,
  CompatibilityEntry,
  IBinderMatrix
} from './platform-binding-trigger-spec.js';
import type { IComponent } from './component-interfaces.js';
import type { PolicyStatement } from 'aws-cdk-lib/aws-iam';

// Re-export canonical binding interfaces
export type {
  BindingContext,
  BindingResult,
  IBinderStrategy,
  CompatibilityEntry,
  IBinderMatrix,
  IComponent
};

// =============================================================================
// COMPLIANCE FRAMEWORK TYPES
// =============================================================================

/**
 * Compliance framework identifier
 * 
 * Supports any string value to allow consumers to define custom frameworks
 * (e.g., 'hipaa', 'sox', 'pci-dss', 'iso27001') without platform code changes.
 * 
 * Standard frameworks:
 * - 'commercial' - Standard commercial deployment
 * - 'fedramp-moderate' - FedRAMP Moderate baseline
 * - 'fedramp-high' - FedRAMP High baseline
 * 
 * Custom frameworks are supported via configuration files in /config/{framework}.yml
 */
export type ComplianceFramework = string;

export type ComponentType = 's3-bucket' | 'lambda-api' | 'rds-postgres' | 'ec2-instance' | 'dynamodb-table' | 'sqs-queue' | 'sns-topic';

// =============================================================================
// CAPABILITY TYPES
// =============================================================================

export type DbCapability = 'db:postgres' | 'db:mysql' | 'db:aurora-postgres' | 'db:aurora-mysql';
export type StorageCapability = 'storage:s3' | 'storage:s3-bucket' | 'bucket:s3';
export type QueueCapability = 'queue:sqs' | 'topic:sns' | 'messaging:sqs' | 'messaging:sns';
export type CacheCapability = 'cache:redis' | 'cache:memcached' | 'cache:elasticache';
export type LambdaCapability = 'lambda:function' | 'function:lambda' | 'compute:lambda';
export type ApiCapability = 'api:rest' | 'api:http' | 'api:websocket';
export type MonitoringCapability = 'monitoring:cloudwatch' | 'monitoring:logs' | 'monitoring:metrics';
export type AIProviderCapabilityType = 'ai:provider';

export type Capability =
  | DbCapability
  | StorageCapability
  | QueueCapability
  | CacheCapability
  | LambdaCapability
  | ApiCapability
  | MonitoringCapability
  | AIProviderCapabilityType;

/**
 * Note: External users can use custom capability strings (e.g., 'db:snowflake', 'storage:gcs')
 * by specifying them directly in the directive. The type system will fall back to string.
 * Strategies should handle unknown capabilities gracefully via canHandle().
 */

// =============================================================================
// CAPABILITY DATA TYPES
// =============================================================================

export interface PostgresCapabilityData {
  type: 'db:postgres';
  endpoints: {
    host: string;
    port: number;
    database: string;
  };
  resources: {
    arn: string;
    clusterArn?: string;
  };
  secrets: {
    masterSecretArn: string;
  };
  securityGroups: string[];
  subnetGroup: string;
  kmsKeyId?: string;
}

export interface MySQLCapabilityData {
  type: 'db:mysql';
  endpoints: {
    host: string;
    port: number;
    database: string;
  };
  resources: {
    arn: string;
    clusterArn?: string;
  };
  secrets: {
    masterSecretArn: string;
  };
  securityGroups: string[];
  subnetGroup: string;
  kmsKeyId?: string;
}

export interface S3CapabilityData {
  type: 'storage:s3';
  resources: {
    arn: string;
    name: string;
    region: string;
  };
  encryption: {
    enabled: boolean;
    algorithm?: string;
  };
  versioning: {
    enabled: boolean;
  };
  accessLogging?: {
    enabled: boolean;
    targetBucket?: string;
  };
}

export interface SQSCapabilityData {
  type: 'queue:sqs';
  resources: {
    arn: string;
    queueUrl: string;
    queueName: string;
  };
  encryption: {
    enabled: boolean;
    kmsKeyId?: string;
  };
  deadLetterQueue?: {
    arn: string;
    queueUrl: string;
  };
}

export interface SNSCapabilityData {
  type: 'topic:sns';
  resources: {
    arn: string;
    topicName: string;
  };
  encryption: {
    enabled: boolean;
    kmsKeyId?: string;
  };
}

export interface RedisCapabilityData {
  type: 'cache:redis';
  endpoints: {
    host: string;
    port: number;
  };
  resources: {
    arn: string;
    clusterId: string;
  };
  securityGroups: string[];
  encryption: {
    inTransit: boolean;
    atRest: boolean;
  };
}

export interface LambdaCapabilityData {
  type: 'lambda:function';
  resources: {
    arn: string;
    functionName: string;
    version: string;
  };
  environment: Record<string, string>;
  vpc?: {
    securityGroups: string[];
    subnets: string[];
  };
}

export interface ApiGatewayCapabilityData {
  type: 'api:rest' | 'api:http';
  resources: {
    arn: string;
    apiId: string;
    stage: string;
  };
  endpoints: {
    invokeUrl: string;
    executeApiArn: string;
  };
  cors?: {
    enabled: boolean;
    origins: string[];
  };
}

export interface AIProviderCapabilityData {
  type: 'ai:provider';
  providerType: 'openai' | 'anthropic' | 'bedrock' | 'gemini' | 'ollama';
  model: string;
  endpoint?: string;
  region?: string;
  auth: {
    type: 'apiKey' | 'aws' | 'none';
    secretRef?: string;
  };
  connectionConfig: Record<string, string>;
  environmentVariables: Record<string, string>;
}

/**
 * Custom capability data escape hatch for external users
 * Allows any capability type not defined in the core platform
 */
export interface CustomCapabilityData {
  type: string; // e.g., 'db:snowflake', 'storage:gcs', 'cache:memcached'
  [key: string]: unknown; // Flexible structure for custom providers
}

export type CapabilityData =
  | PostgresCapabilityData
  | MySQLCapabilityData
  | S3CapabilityData
  | SQSCapabilityData
  | SNSCapabilityData
  | RedisCapabilityData
  | LambdaCapabilityData
  | ApiGatewayCapabilityData
  | AIProviderCapabilityData
  | CustomCapabilityData; // Escape hatch for external extensibility

// =============================================================================
// SECURITY GROUP RULES
// =============================================================================

export type SgPeer =
  | { kind: 'sg'; id: string }
  | { kind: 'cidr'; cidr: string };

export interface SecurityGroupRule {
  type: 'ingress' | 'egress';
  peer: SgPeer;
  port: {
    from: number;
    to: number;
    protocol: 'tcp' | 'udp' | 'icmp';
  };
  description: string;
}

// =============================================================================
// IAM POLICIES
// =============================================================================

export interface IamPolicy {
  statement: PolicyStatement; // CDK PolicyStatement for type safety
  description: string;
  complianceRequirement: string;
}

// =============================================================================
// COMPLIANCE ACTIONS
// =============================================================================

export interface ComplianceAction {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  remediation?: string;
  framework: ComplianceFramework;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// BINDING METADATA
// =============================================================================

export interface BindingMetadata {
  readonly bindingId: string;
  readonly strategyName: string;
  readonly timestamp: string;
  readonly version: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly capability: Capability;
  readonly access: string; // AccessLevel
  readonly framework: ComplianceFramework;
  readonly environment: string;
}
