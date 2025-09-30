/**
 * Core binding contracts and types
 * Thin re-export wrapper for canonical binding interfaces
 */
import { BindingContext, BindingResult, IBinderStrategy, CompatibilityEntry, IBinderMatrix } from './platform-binding-trigger-spec';
import { IComponent } from './component-interfaces';
export { BindingContext, BindingResult, IBinderStrategy, CompatibilityEntry, IBinderMatrix, IComponent };
export type ComplianceFramework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';
export type ComponentType = 's3-bucket' | 'lambda-api' | 'rds-postgres' | 'ec2-instance' | 'dynamodb-table' | 'sqs-queue' | 'sns-topic';
export type DbCapability = 'db:postgres' | 'db:mysql' | 'db:aurora-postgres' | 'db:aurora-mysql';
export type StorageCapability = 'storage:s3' | 'storage:s3-bucket' | 'bucket:s3';
export type QueueCapability = 'queue:sqs' | 'topic:sns' | 'messaging:sqs' | 'messaging:sns';
export type CacheCapability = 'cache:redis' | 'cache:memcached' | 'cache:elasticache';
export type LambdaCapability = 'lambda:function' | 'function:lambda' | 'compute:lambda';
export type ApiCapability = 'api:rest' | 'api:http' | 'api:websocket';
export type MonitoringCapability = 'monitoring:cloudwatch' | 'monitoring:logs' | 'monitoring:metrics';
export type Capability = DbCapability | StorageCapability | QueueCapability | CacheCapability | LambdaCapability | ApiCapability | MonitoringCapability;
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
export type CapabilityData = PostgresCapabilityData | MySQLCapabilityData | S3CapabilityData | SQSCapabilityData | SNSCapabilityData | RedisCapabilityData | LambdaCapabilityData | ApiGatewayCapabilityData;
export type SgPeer = {
    kind: 'sg';
    id: string;
} | {
    kind: 'cidr';
    cidr: string;
};
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
export interface IamPolicy {
    statement: any;
    description: string;
    complianceRequirement: string;
}
export interface ComplianceAction {
    ruleId: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    remediation?: string;
    framework: ComplianceFramework;
    metadata?: Record<string, unknown>;
}
export interface EnhancedBindingContext<T extends ComplianceFramework = ComplianceFramework> {
    source: IComponent;
    target: IComponent;
    directive: any;
    environment: string;
    complianceFramework: T;
    targetCapabilityData: CapabilityData;
    options?: Record<string, unknown>;
}
export interface EnhancedBindingResult {
    readonly environmentVariables: Readonly<Record<string, string>>;
    readonly iamPolicies: ReadonlyArray<IamPolicy>;
    readonly securityGroupRules: ReadonlyArray<SecurityGroupRule>;
    readonly complianceActions: ReadonlyArray<ComplianceAction>;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
export interface BindingMetadata {
    readonly bindingId: string;
    readonly strategyName: string;
    readonly timestamp: string;
    readonly version: string;
    readonly sourceId: string;
    readonly targetId: string;
    readonly capability: Capability;
    readonly access: string;
    readonly framework: ComplianceFramework;
    readonly environment: string;
}
//# sourceMappingURL=bindings.d.ts.map