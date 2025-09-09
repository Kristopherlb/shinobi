"use strict";
/**
 * Concrete Binder Strategy Implementations
 * Enterprise-grade binding logic for different component combinations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ec2ToElastiCacheBinderStrategy = exports.Ec2ToRdsBinderStrategy = exports.LambdaToS3BucketBinderStrategy = exports.LambdaToRdsBinderStrategy = exports.LambdaToSqsBinderStrategy = void 0;
const contracts_1 = require("@platform/contracts");
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
/**
 * Enhanced Lambda to SQS binding with enterprise security
 */
class LambdaToSqsBinderStrategy extends contracts_1.BinderStrategy {
    canHandle(sourceType, targetCapability) {
        return (sourceType === 'lambda-api' || sourceType === 'lambda-worker') &&
            targetCapability === 'queue:sqs';
    }
    bind(context) {
        const { source, target, directive } = context;
        // 1. Get the REAL L2 construct handles from the component instances
        const lambdaConstruct = source.getConstruct('main');
        const sqsQueueConstruct = target.getConstruct('main');
        if (!lambdaConstruct || !sqsQueueConstruct) {
            throw new Error(`Could not retrieve construct handles for binding ${source.getName()} -> ${target.getName()}`);
        }
        // 2. Use high-level L2 methods to apply IAM permissions directly
        this.grantSQSAccess(sqsQueueConstruct, lambdaConstruct, directive.access);
        // 3. Apply compliance-specific security enhancements
        if (context.complianceFramework.startsWith('fedramp')) {
            this.applyFedRAMPSecurityEnhancements(sqsQueueConstruct, lambdaConstruct, context);
        }
        // 4. Handle advanced options like dead letter queue
        if (directive.options?.deadLetterQueue) {
            this.configureDeadLetterQueue(sqsQueueConstruct, lambdaConstruct, context);
        }
        // 5. Return environment variables from the REAL construct
        return {
            environmentVariables: {
                [directive.env?.queueUrl || 'QUEUE_URL']: sqsQueueConstruct.queueUrl,
                [directive.env?.queueArn || 'QUEUE_ARN']: sqsQueueConstruct.queueArn
            }
        };
    }
    /**
     * Grant Lambda access to SQS queue using CDK L2 methods
     */
    grantSQSAccess(sqsQueueConstruct, lambdaConstruct, access) {
        switch (access) {
            case 'read':
                sqsQueueConstruct.grantConsumeMessages(lambdaConstruct);
                break;
            case 'write':
                sqsQueueConstruct.grantSendMessages(lambdaConstruct);
                break;
            case 'readwrite':
                sqsQueueConstruct.grantConsumeMessages(lambdaConstruct);
                sqsQueueConstruct.grantSendMessages(lambdaConstruct);
                break;
            case 'admin':
                sqsQueueConstruct.grantConsumeMessages(lambdaConstruct);
                sqsQueueConstruct.grantSendMessages(lambdaConstruct);
                sqsQueueConstruct.grantPurge(lambdaConstruct);
                break;
            default:
                throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
        }
    }
    /**
     * Apply FedRAMP-specific security enhancements using CDK
     */
    applyFedRAMPSecurityEnhancements(sqsQueueConstruct, lambdaConstruct, context) {
        // Add enhanced SQS monitoring permissions for FedRAMP compliance
        lambdaConstruct.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'sqs:GetQueueAttributes',
                'sqs:ListQueues',
                'sqs:ListQueueTags'
            ],
            resources: [sqsQueueConstruct.queueArn],
            conditions: {
                'StringEquals': {
                    'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1',
                    'aws:SecureTransport': 'true'
                }
            }
        }));
        // Additional FedRAMP High restrictions
        if (context.complianceFramework === 'fedramp-high') {
            // Restrict to VPC endpoints for FedRAMP High
            lambdaConstruct.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.DENY,
                actions: ['sqs:*'],
                resources: ['*'],
                conditions: {
                    'StringNotEquals': {
                        'aws:SourceVpce': context.directive.options?.vpcEndpoint || 'vpce-*'
                    }
                }
            }));
        }
    }
    /**
     * Configure dead letter queue integration using CDK
     */
    configureDeadLetterQueue(sqsQueueConstruct, lambdaConstruct, context) {
        // For Lambda workers, configure event source mapping with DLQ settings
        if (context.source.getType() === 'lambda-worker') {
            // Event source mapping configuration is handled by CDK construct integration
            // The queue's dead letter queue is already configured at the construct level
            // Grant additional permissions for DLQ processing
            lambdaConstruct.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'sqs:GetQueueAttributes',
                    'sqs:ChangeMessageVisibility'
                ],
                resources: [sqsQueueConstruct.queueArn],
                conditions: {
                    'StringEquals': {
                        'aws:SecureTransport': 'true'
                    }
                }
            }));
        }
    }
}
exports.LambdaToSqsBinderStrategy = LambdaToSqsBinderStrategy;
/**
 * Enhanced Lambda to RDS binding with enterprise security
 */
class LambdaToRdsBinderStrategy extends contracts_1.BinderStrategy {
    canHandle(sourceType, targetCapability) {
        return (sourceType === 'lambda-api' || sourceType === 'lambda-worker') &&
            targetCapability === 'db:postgres';
    }
    bind(context) {
        const { source, target, directive } = context;
        // 1. Get the REAL L2 construct handles from the component instances
        const lambdaConstruct = source.getConstruct('main');
        const rdsConstruct = target.getConstruct('main');
        if (!lambdaConstruct || !rdsConstruct) {
            throw new Error(`Could not retrieve construct handles for binding ${source.spec.name} -> ${target.spec.name}`);
        }
        // 2. Use high-level L2 methods to apply wiring directly
        // Allow Lambda to connect to RDS on the default PostgreSQL port
        rdsConstruct.connections.allowDefaultPortFrom(lambdaConstruct, `Allow connection from Lambda ${source.spec.name}`);
        // Grant Lambda access to connect to the database and read secrets
        this.grantDatabaseAccess(rdsConstruct, lambdaConstruct, directive.access);
        // 3. Handle advanced options like IAM Auth
        if (directive.options?.iamAuth) {
            this.enableIamDatabaseAuth(rdsConstruct, lambdaConstruct, context);
        }
        // 4. Apply compliance-specific security enhancements
        if (context.complianceFramework.startsWith('fedramp')) {
            this.applyFedRAMPSecurityEnhancements(rdsConstruct, lambdaConstruct, context);
        }
        // 5. Return environment variables (the main output now that constructs are wired directly)
        return {
            environmentVariables: this.buildEnvironmentVariables(target, directive, rdsConstruct)
        };
    }
    /**
     * Grant Lambda access to the database using CDK L2 methods
     */
    grantDatabaseAccess(rdsConstruct, lambdaConstruct, access) {
        switch (access) {
            case 'read':
            case 'readwrite': // Both read and readwrite need secret access
                // Grant Lambda permission to read database credentials from Secrets Manager
                rdsConstruct.secret?.grantRead(lambdaConstruct);
                break;
            case 'write':
                // Write operations still need credential access
                rdsConstruct.secret?.grantRead(lambdaConstruct);
                break;
            case 'admin':
                // Full access including secret management
                rdsConstruct.secret?.grantRead(lambdaConstruct);
                rdsConstruct.secret?.grantWrite(lambdaConstruct);
                break;
            default:
                throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
        }
    }
    /**
     * Enable IAM database authentication using CDK methods
     */
    enableIamDatabaseAuth(rdsConstruct, lambdaConstruct, context) {
        // Grant RDS connect permission for IAM database authentication
        lambdaConstruct.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['rds-db:connect'],
            resources: [
                `arn:aws:rds-db:*:*:dbuser:${rdsConstruct.node.defaultChild.attrDbiResourceId}/${context.directive.options?.iamAuth?.username || 'lambda_user'}`
            ],
            conditions: {
                'StringEquals': {
                    'aws:SecureTransport': 'true'
                }
            }
        }));
    }
    /**
     * Apply FedRAMP-specific security enhancements using CDK
     */
    applyFedRAMPSecurityEnhancements(rdsConstruct, lambdaConstruct, context) {
        // Add enhanced monitoring permissions for FedRAMP compliance
        lambdaConstruct.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'rds:DescribeDBInstances',
                'rds:DescribeDBClusters',
                'rds:ListTagsForResource'
            ],
            resources: ['*'], // Describe actions require wildcard resource
            conditions: {
                'StringEquals': {
                    'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1',
                    'aws:SecureTransport': 'true'
                }
            }
        }));
    }
    /**
     * Build environment variables with tokenized values directly from CDK constructs
     */
    buildEnvironmentVariables(target, directive, rdsConstruct) {
        return {
            [directive.env?.host || 'DB_HOST']: rdsConstruct.instanceEndpoint.hostname,
            [directive.env?.port || 'DB_PORT']: rdsConstruct.instanceEndpoint.port.toString(),
            [directive.env?.dbName || 'DB_NAME']: target.spec.config.dbName,
            [directive.env?.secretArn || 'DB_SECRET_ARN']: rdsConstruct.secret.secretArn
        };
    }
}
exports.LambdaToRdsBinderStrategy = LambdaToRdsBinderStrategy;
/**
 * Enhanced Lambda to S3 binding with enterprise security
 */
class LambdaToS3BucketBinderStrategy extends contracts_1.BinderStrategy {
    canHandle(sourceType, targetCapability) {
        return (sourceType === 'lambda-api' || sourceType === 'lambda-worker') &&
            targetCapability === 'bucket:s3';
    }
    bind(context) {
        const { source, target, directive } = context;
        // 1. Get the REAL L2 construct handles from the component instances
        const lambdaConstruct = source.getConstruct('main');
        const s3Construct = target.getConstruct('main');
        if (!lambdaConstruct || !s3Construct) {
            throw new Error(`Could not retrieve construct handles for binding ${source.spec.name} -> ${target.spec.name}`);
        }
        // 2. Use high-level L2 methods to grant S3 access directly
        this.grantS3Access(s3Construct, lambdaConstruct, directive.access);
        // 3. Handle advanced options like KMS encryption
        if (directive.options?.kmsEncryption) {
            this.enableKMSEncryption(s3Construct, lambdaConstruct, context);
        }
        // 4. Apply compliance-specific security enhancements
        if (context.complianceFramework.startsWith('fedramp')) {
            this.applyS3FedRAMPSecurityEnhancements(s3Construct, lambdaConstruct, context);
        }
        // 5. Return environment variables (the main output now that constructs are wired directly)
        return {
            environmentVariables: this.buildS3EnvironmentVariables(directive, s3Construct)
        };
    }
    /**
     * Grant Lambda access to S3 bucket using CDK L2 methods
     */
    grantS3Access(s3Construct, lambdaConstruct, access) {
        switch (access) {
            case 'read':
                // Grant Lambda permission to read objects from S3 bucket
                s3Construct.grantRead(lambdaConstruct);
                break;
            case 'write':
                // Grant Lambda permission to write objects to S3 bucket
                s3Construct.grantWrite(lambdaConstruct);
                break;
            case 'readwrite':
                // Grant Lambda full read/write access to S3 bucket
                s3Construct.grantReadWrite(lambdaConstruct);
                break;
            case 'admin':
                // Grant Lambda administrative access to S3 bucket
                s3Construct.grantReadWrite(lambdaConstruct);
                // Additional admin permissions for bucket management
                lambdaConstruct.addToRolePolicy(new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        's3:GetBucketVersioning',
                        's3:PutBucketVersioning',
                        's3:GetBucketPolicy',
                        's3:PutBucketPolicy',
                        's3:GetBucketLocation'
                    ],
                    resources: [s3Construct.bucketArn]
                }));
                break;
            default:
                throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
        }
    }
    /**
     * Enable KMS encryption for S3 operations using CDK methods
     */
    enableKMSEncryption(s3Construct, lambdaConstruct, context) {
        // Grant Lambda permission to use KMS key for S3 encryption
        const kmsKeyArn = context.directive.options?.kmsKeyId || 'alias/aws/s3';
        lambdaConstruct.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'kms:Decrypt',
                'kms:DescribeKey',
                'kms:Encrypt',
                'kms:GenerateDataKey',
                'kms:GenerateDataKeyWithoutPlaintext',
                'kms:ReEncryptFrom',
                'kms:ReEncryptTo'
            ],
            resources: [kmsKeyArn],
            conditions: {
                'StringEquals': {
                    'kms:ViaService': `s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`
                }
            }
        }));
    }
    /**
     * Apply FedRAMP-specific security enhancements for S3 using CDK
     */
    applyS3FedRAMPSecurityEnhancements(s3Construct, lambdaConstruct, context) {
        // Add enhanced S3 monitoring permissions for FedRAMP compliance
        lambdaConstruct.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetBucketLogging',
                's3:GetBucketNotification',
                's3:GetBucketVersioning',
                's3:ListAllMyBuckets'
            ],
            resources: ['*'], // These actions require wildcard resource
            conditions: {
                'StringEquals': {
                    'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1',
                    'aws:SecureTransport': 'true'
                }
            }
        }));
        // Additional FedRAMP High restrictions
        if (context.complianceFramework === 'fedramp-high') {
            // Restrict to specific object prefix
            const allowedPrefix = context.directive.options?.objectPrefix || `${context.source.spec.name}/*`;
            lambdaConstruct.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.DENY,
                actions: ['s3:*'],
                resources: [`${s3Construct.bucketArn}/*`],
                conditions: {
                    'StringNotLike': {
                        's3:prefix': allowedPrefix
                    }
                }
            }));
        }
    }
    /**
     * Build environment variables with tokenized values directly from CDK constructs
     */
    buildS3EnvironmentVariables(directive, s3Construct) {
        return {
            [directive.env?.bucketName || 'BUCKET_NAME']: s3Construct.bucketName,
            [directive.env?.bucketArn || 'BUCKET_ARN']: s3Construct.bucketArn
        };
    }
}
exports.LambdaToS3BucketBinderStrategy = LambdaToS3BucketBinderStrategy;
/**
 * Enhanced EC2 to RDS binding with enterprise security
 */
class Ec2ToRdsBinderStrategy extends contracts_1.BinderStrategy {
    canHandle(sourceType, targetCapability) {
        return sourceType === 'ec2-instance' && targetCapability === 'db:postgres';
    }
    bind(context) {
        const { source, target, directive } = context;
        // 1. Get the REAL L2 construct handles from the component instances
        const ec2Instance = source.getConstruct('instance');
        const ec2SecurityGroup = source.getConstruct('securityGroup');
        const rdsConstruct = target.getConstruct('main');
        if (!ec2Instance || !ec2SecurityGroup || !rdsConstruct) {
            throw new Error(`Could not retrieve construct handles for binding ${source.spec.name} -> ${target.spec.name}`);
        }
        // 2. Use high-level L2 methods to allow EC2 to connect to RDS
        rdsConstruct.connections.allowDefaultPortFrom(ec2SecurityGroup, `Allow connection from EC2 ${source.spec.name}`);
        // 3. Grant IAM permissions for EC2 instance to access database credentials
        this.grantDatabaseAccess(rdsConstruct, ec2Instance, directive.access);
        // 4. Handle advanced options like IAM Auth
        if (directive.options?.iamAuth) {
            this.enableIamDatabaseAuth(rdsConstruct, ec2Instance, context);
        }
        // 5. Apply compliance-specific security enhancements
        if (context.complianceFramework.startsWith('fedramp')) {
            this.applyFedRAMPSecurityEnhancements(rdsConstruct, ec2Instance, context);
        }
        // 6. Return environment variables for EC2 user data or SSM parameters
        return {
            environmentVariables: this.buildEnvironmentVariables(target, directive, rdsConstruct)
        };
    }
    /**
     * Grant EC2 instance access to the database using CDK L2 methods
     */
    grantDatabaseAccess(rdsConstruct, ec2Instance, access) {
        switch (access) {
            case 'read':
            case 'write':
            case 'readwrite':
                // Grant EC2 instance role permission to read database credentials from Secrets Manager
                rdsConstruct.secret?.grantRead(ec2Instance.role);
                break;
            case 'admin':
                // Full access including secret management
                rdsConstruct.secret?.grantRead(ec2Instance.role);
                rdsConstruct.secret?.grantWrite(ec2Instance.role);
                break;
            default:
                throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
        }
    }
    /**
     * Enable IAM database authentication for EC2 using CDK methods
     */
    enableIamDatabaseAuth(rdsConstruct, ec2Instance, context) {
        // Grant RDS connect permission for IAM database authentication
        ec2Instance.role.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['rds-db:connect'],
            resources: [
                `arn:aws:rds-db:*:*:dbuser:${rdsConstruct.node.defaultChild.attrDbiResourceId}/${context.directive.options?.iamAuth?.username || 'ec2_user'}`
            ],
            conditions: {
                'StringEquals': {
                    'aws:SecureTransport': 'true'
                }
            }
        }));
    }
    /**
     * Apply FedRAMP-specific security enhancements using CDK
     */
    applyFedRAMPSecurityEnhancements(rdsConstruct, ec2Instance, context) {
        // Add enhanced monitoring permissions for FedRAMP compliance
        ec2Instance.role.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'rds:DescribeDBInstances',
                'rds:DescribeDBClusters',
                'rds:ListTagsForResource'
            ],
            resources: ['*'], // Describe actions require wildcard resource
            conditions: {
                'StringEquals': {
                    'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1',
                    'aws:SecureTransport': 'true'
                }
            }
        }));
        // Additional FedRAMP High restrictions
        if (context.complianceFramework === 'fedramp-high') {
            // Restrict to specific database operations
            ec2Instance.role.addToPrincipalPolicy(new iam.PolicyStatement({
                effect: iam.Effect.DENY,
                actions: ['rds:DeleteDBInstance', 'rds:ModifyDBInstance'],
                resources: ['*'],
                conditions: {
                    'StringNotEquals': {
                        'aws:userid': context.directive.options?.adminUserId || 'ADMIN_USER_ID'
                    }
                }
            }));
        }
    }
    /**
     * Build environment variables with tokenized values directly from CDK constructs
     */
    buildEnvironmentVariables(target, directive, rdsConstruct) {
        return {
            [directive.env?.host || 'DB_HOST']: rdsConstruct.instanceEndpoint.hostname,
            [directive.env?.port || 'DB_PORT']: rdsConstruct.instanceEndpoint.port.toString(),
            [directive.env?.dbName || 'DB_NAME']: target.spec.config.dbName,
            [directive.env?.secretArn || 'DB_SECRET_ARN']: rdsConstruct.secret.secretArn
        };
    }
}
exports.Ec2ToRdsBinderStrategy = Ec2ToRdsBinderStrategy;
/**
 * Enhanced EC2 to ElastiCache Redis binding with enterprise security
 */
class Ec2ToElastiCacheBinderStrategy extends contracts_1.BinderStrategy {
    canHandle(sourceType, targetCapability) {
        return sourceType === 'ec2-instance' && targetCapability === 'cache:redis';
    }
    bind(context) {
        const { source, target, directive } = context;
        // 1. Get the REAL L2 construct handles from the component instances
        const ec2Instance = source.getConstruct('instance');
        const ec2SecurityGroup = source.getConstruct('securityGroup');
        const redisConstruct = target.getConstruct('replicationGroup'); // ElastiCache construct
        const redisSecurityGroup = target.getConstruct('securityGroup');
        if (!ec2Instance || !ec2SecurityGroup || !redisConstruct || !redisSecurityGroup) {
            throw new Error(`Could not retrieve construct handles for binding ${source.spec.name} -> ${target.spec.name}`);
        }
        // 2. Allow EC2 security group to access Redis security group on Redis port
        redisSecurityGroup.addIngressRule(ec2SecurityGroup, ec2.Port.tcp(target.spec.config.port || 6379), `Allow connection from EC2 ${source.spec.name}`);
        // 3. Grant IAM permissions for EC2 instance to access Redis auth token if enabled
        this.grantCacheAccess(target, ec2Instance, directive.access);
        // 4. Apply compliance-specific security enhancements
        if (context.complianceFramework.startsWith('fedramp')) {
            this.applyFedRAMPSecurityEnhancements(redisConstruct, ec2Instance, context);
        }
        // 5. Return environment variables for EC2 user data or SSM parameters
        return {
            environmentVariables: this.buildCacheEnvironmentVariables(target, directive, redisConstruct)
        };
    }
    /**
     * Grant EC2 instance access to the cache using CDK L2 methods
     */
    grantCacheAccess(target, ec2Instance, access) {
        // If auth token is enabled, grant access to the auth secret
        if (target.spec.config.encryption?.authTokenEnabled) {
            const authTokenSecret = target.getConstruct('authToken');
            if (authTokenSecret) {
                switch (access) {
                    case 'read':
                    case 'write':
                    case 'readwrite':
                        // Grant EC2 instance role permission to read auth token from Secrets Manager
                        authTokenSecret.grantRead(ec2Instance.role);
                        break;
                    case 'admin':
                        // Full access including secret management
                        authTokenSecret.grantRead(ec2Instance.role);
                        authTokenSecret.grantWrite(ec2Instance.role);
                        break;
                    default:
                        throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
                }
            }
        }
        // Grant CloudWatch permissions for cache monitoring
        ec2Instance.role.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cloudwatch:GetMetricStatistics',
                'cloudwatch:ListMetrics'
            ],
            resources: ['*'],
            conditions: {
                'StringEquals': {
                    'cloudwatch:namespace': 'AWS/ElastiCache'
                }
            }
        }));
    }
    /**
     * Apply FedRAMP-specific security enhancements using CDK
     */
    applyFedRAMPSecurityEnhancements(redisConstruct, ec2Instance, context) {
        // Add enhanced monitoring permissions for FedRAMP compliance
        ec2Instance.role.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'elasticache:DescribeCacheClusters',
                'elasticache:DescribeReplicationGroups',
                'elasticache:ListTagsForResource'
            ],
            resources: ['*'], // Describe actions require wildcard resource
            conditions: {
                'StringEquals': {
                    'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1',
                    'aws:SecureTransport': 'true'
                }
            }
        }));
        // Additional FedRAMP High restrictions
        if (context.complianceFramework === 'fedramp-high') {
            // Restrict to read-only operations for non-admin users
            ec2Instance.role.addToPrincipalPolicy(new iam.PolicyStatement({
                effect: iam.Effect.DENY,
                actions: [
                    'elasticache:DeleteReplicationGroup',
                    'elasticache:ModifyReplicationGroup',
                    'elasticache:RebootCacheCluster'
                ],
                resources: ['*'],
                conditions: {
                    'StringNotEquals': {
                        'aws:userid': context.directive.options?.adminUserId || 'ADMIN_USER_ID'
                    }
                }
            }));
        }
    }
    /**
     * Build environment variables with tokenized values directly from CDK constructs
     */
    buildCacheEnvironmentVariables(target, directive, redisConstruct) {
        const envVars = {
            [directive.env?.host || 'REDIS_HOST']: redisConstruct.attrRedisEndpointAddress || redisConstruct.attrPrimaryEndPointAddress,
            [directive.env?.port || 'REDIS_PORT']: (target.spec.config.port || 6379).toString()
        };
        // Add auth token ARN if auth is enabled
        if (target.spec.config.encryption?.authTokenEnabled) {
            const authTokenSecret = target.getConstruct('authToken');
            if (authTokenSecret) {
                envVars[directive.env?.authSecretArn || 'REDIS_AUTH_SECRET_ARN'] = authTokenSecret.secretArn;
            }
        }
        return envVars;
    }
}
exports.Ec2ToElastiCacheBinderStrategy = Ec2ToElastiCacheBinderStrategy;
