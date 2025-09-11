"use strict";
/**
 * IAM Policy Component
 *
 * AWS IAM Policy for granular access control with least privilege security patterns.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
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
exports.IamPolicyComponent = exports.IamPolicyConfigBuilder = exports.IAM_POLICY_CONFIG_SCHEMA = void 0;
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for IAM Policy component
 */
exports.IAM_POLICY_CONFIG_SCHEMA = {
    type: 'object',
    title: 'IAM Policy Configuration',
    description: 'Configuration for creating an IAM Policy',
    properties: {
        policyName: {
            type: 'string',
            description: 'Name of the policy (will be auto-generated if not provided)',
            pattern: '^[a-zA-Z0-9+=,.@_-]+$',
            maxLength: 128
        },
        description: {
            type: 'string',
            description: 'Description of the policy',
            maxLength: 1000
        },
        policyType: {
            type: 'string',
            description: 'Type of IAM policy',
            enum: ['managed', 'inline'],
            default: 'managed'
        },
        policyDocument: {
            type: 'object',
            description: 'IAM policy document',
            properties: {
                Version: {
                    type: 'string',
                    description: 'Policy language version',
                    default: '2012-10-17'
                },
                Statement: {
                    type: 'array',
                    description: 'Policy statements',
                    items: {
                        type: 'object',
                        properties: {
                            Sid: {
                                type: 'string',
                                description: 'Statement ID'
                            },
                            Effect: {
                                type: 'string',
                                description: 'Allow or Deny',
                                enum: ['Allow', 'Deny']
                            },
                            Action: {
                                oneOf: [
                                    { type: 'string' },
                                    { type: 'array', items: { type: 'string' } }
                                ],
                                description: 'Actions'
                            },
                            Resource: {
                                oneOf: [
                                    { type: 'string' },
                                    { type: 'array', items: { type: 'string' } }
                                ],
                                description: 'Resources'
                            },
                            Condition: {
                                type: 'object',
                                description: 'Conditions'
                            }
                        },
                        required: ['Effect', 'Action'],
                        additionalProperties: false
                    },
                    minItems: 1
                }
            },
            required: ['Statement'],
            additionalProperties: false
        },
        policyTemplate: {
            type: 'object',
            description: 'Use predefined policy template',
            properties: {
                type: {
                    type: 'string',
                    description: 'Template type',
                    enum: ['read-only', 'power-user', 'admin', 'lambda-execution', 'ecs-task', 's3-access', 'rds-access']
                },
                resources: {
                    type: 'array',
                    description: 'Resources to apply template to',
                    items: { type: 'string' },
                    default: ['*']
                },
                additionalStatements: {
                    type: 'array',
                    description: 'Additional policy statements',
                    items: {
                        type: 'object',
                        properties: {
                            Sid: { type: 'string' },
                            Effect: { type: 'string', enum: ['Allow', 'Deny'] },
                            Action: {
                                oneOf: [
                                    { type: 'string' },
                                    { type: 'array', items: { type: 'string' } }
                                ]
                            },
                            Resource: {
                                oneOf: [
                                    { type: 'string' },
                                    { type: 'array', items: { type: 'string' } }
                                ]
                            },
                            Condition: { type: 'object' }
                        },
                        required: ['Effect', 'Action']
                    },
                    default: []
                }
            },
            required: ['type'],
            additionalProperties: false
        },
        path: {
            type: 'string',
            description: 'Path for managed policies',
            pattern: '^/.*/$',
            default: '/'
        },
        groups: {
            type: 'array',
            description: 'Groups to attach policy to',
            items: { type: 'string' },
            default: []
        },
        roles: {
            type: 'array',
            description: 'Roles to attach policy to',
            items: { type: 'string' },
            default: []
        },
        users: {
            type: 'array',
            description: 'Users to attach policy to',
            items: { type: 'string' },
            default: []
        },
        tags: {
            type: 'object',
            description: 'Tags for the policy',
            additionalProperties: { type: 'string' },
            default: {}
        }
    },
    additionalProperties: false,
    anyOf: [
        { required: ['policyDocument'] },
        { required: ['policyTemplate'] }
    ],
    defaults: {
        policyType: 'managed',
        path: '/',
        groups: [],
        roles: [],
        users: [],
        tags: {}
    }
};
/**
 * Configuration builder for IAM Policy component
 */
class IamPolicyConfigBuilder {
    context;
    spec;
    constructor(context, spec) {
        this.context = context;
        this.spec = spec;
    }
    async build() {
        return this.buildSync();
    }
    buildSync() {
        const platformDefaults = this.getPlatformDefaults();
        const complianceDefaults = this.getComplianceFrameworkDefaults();
        const userConfig = this.spec.config || {};
        const mergedConfig = this.mergeConfigs(this.mergeConfigs(platformDefaults, complianceDefaults), userConfig);
        return mergedConfig;
    }
    mergeConfigs(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeConfigs(result[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
    getPlatformDefaults() {
        return {
            policyType: 'managed',
            path: '/',
            tags: {
                'service': this.context.serviceName,
                'environment': this.context.environment,
                'policy-type': 'platform-managed'
            }
        };
    }
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
                return {
                    tags: {
                        'compliance-framework': 'fedramp-moderate',
                        'policy-classification': 'controlled',
                        'audit-required': 'true'
                    },
                    // Add compliance-specific policy restrictions
                    additionalComplianceStatements: this.getComplianceStatements('moderate')
                };
            case 'fedramp-high':
                return {
                    tags: {
                        'compliance-framework': 'fedramp-high',
                        'policy-classification': 'confidential',
                        'audit-required': 'true',
                        'review-period': 'quarterly'
                    },
                    // Add stricter compliance statements
                    additionalComplianceStatements: this.getComplianceStatements('high')
                };
            default: // commercial
                return {};
        }
    }
    getComplianceStatements(level) {
        const baseStatements = [
            {
                Sid: 'DenyInsecureTransport',
                Effect: 'Deny',
                Action: '*',
                Resource: '*',
                Condition: {
                    Bool: {
                        'aws:SecureTransport': 'false'
                    }
                }
            }
        ];
        if (level === 'high') {
            baseStatements.push({
                Sid: 'RequireMFAForSensitiveActions',
                Effect: 'Deny',
                Action: [
                    'iam:*',
                    'kms:*',
                    's3:Delete*',
                    'rds:Delete*'
                ],
                Resource: '*',
                Condition: {
                    BoolIfExists: {
                        'aws:MultiFactorAuthPresent': 'false'
                    }
                }
            });
        }
        return baseStatements;
    }
}
exports.IamPolicyConfigBuilder = IamPolicyConfigBuilder;
/**
 * IAM Policy Component implementing Component API Contract v1.0
 */
class IamPolicyComponent extends contracts_1.Component {
    policy;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting IAM Policy component synthesis', {
            policyName: this.spec.config?.policyName,
            policyType: this.spec.config?.policyType
        });
        const startTime = Date.now();
        try {
            const configBuilder = new IamPolicyConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            this.logComponentEvent('config_built', 'IAM Policy configuration built successfully', {
                policyName: this.config.policyName,
                policyType: this.config.policyType,
                hasTemplate: !!this.config.policyTemplate
            });
            this.createPolicy();
            this.attachPolicyToEntities();
            this.applyComplianceHardening();
            this.configureObservabilityForPolicy();
            this.registerConstruct('policy', this.policy);
            this.registerCapability('iam:policy', this.buildPolicyCapability());
            const duration = Date.now() - startTime;
            this.logPerformanceMetric('component_synthesis', duration, {
                resourcesCreated: Object.keys(this.capabilities).length
            });
            this.logComponentEvent('synthesis_complete', 'IAM Policy component synthesis completed successfully', {
                policyCreated: 1,
                policyType: this.config.policyType,
                attachmentsCount: (this.config.groups?.length || 0) + (this.config.roles?.length || 0) + (this.config.users?.length || 0)
            });
        }
        catch (error) {
            this.logError(error, 'component synthesis', {
                componentType: 'iam-policy',
                stage: 'synthesis'
            });
            throw error;
        }
    }
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    getType() {
        return 'iam-policy';
    }
    createPolicy() {
        const policyDocument = this.buildPolicyDocument();
        const policyName = this.buildPolicyName();
        if (this.config.policyType === 'managed') {
            this.policy = new iam.ManagedPolicy(this, 'Policy', {
                managedPolicyName: policyName,
                description: this.config.description,
                path: this.config.path,
                document: policyDocument
            });
            this.applyStandardTags(this.policy, {
                'policy-type': 'managed',
                'policy-name': policyName,
                'statements-count': policyDocument.statementCount.toString()
            });
        }
        else {
            // For inline policies, we'll create them when attaching to entities
            this.policy = new iam.Policy(this, 'Policy', {
                policyName: policyName,
                document: policyDocument
            });
            this.applyStandardTags(this.policy, {
                'policy-type': 'inline',
                'policy-name': policyName,
                'statements-count': policyDocument.statementCount.toString()
            });
        }
        if (this.config.tags) {
            Object.entries(this.config.tags).forEach(([key, value]) => {
                cdk.Tags.of(this.policy).add(key, value);
            });
        }
        this.logResourceCreation('iam-policy', policyName, {
            policyType: this.config.policyType,
            statementsCount: policyDocument.statementCount,
            hasTemplate: !!this.config.policyTemplate
        });
    }
    buildPolicyDocument() {
        let statements = [];
        // Add statements from policy document
        if (this.config.policyDocument) {
            statements = this.config.policyDocument.Statement.map(stmt => new iam.PolicyStatement({
                sid: stmt.Sid,
                effect: stmt.Effect === 'Allow' ? iam.Effect.ALLOW : iam.Effect.DENY,
                actions: Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action],
                resources: stmt.Resource ? (Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource]) : undefined,
                conditions: stmt.Condition
            }));
        }
        // Add statements from template
        if (this.config.policyTemplate) {
            const templateStatements = this.buildTemplateStatements();
            statements.push(...templateStatements);
        }
        // Add compliance statements
        const complianceStatements = this.buildComplianceStatements();
        statements.push(...complianceStatements);
        return new iam.PolicyDocument({
            statements: statements
        });
    }
    buildTemplateStatements() {
        const template = this.config.policyTemplate;
        const resources = template.resources || ['*'];
        let statements = [];
        switch (template.type) {
            case 'read-only':
                statements.push(new iam.PolicyStatement({
                    sid: 'ReadOnlyAccess',
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'cloudwatch:Describe*',
                        'cloudwatch:Get*',
                        'cloudwatch:List*',
                        'ec2:Describe*',
                        's3:Get*',
                        's3:List*',
                        'iam:Get*',
                        'iam:List*'
                    ],
                    resources: resources
                }));
                break;
            case 'lambda-execution':
                statements.push(new iam.PolicyStatement({
                    sid: 'LambdaExecutionRole',
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'logs:CreateLogGroup',
                        'logs:CreateLogStream',
                        'logs:PutLogEvents'
                    ],
                    resources: ['arn:aws:logs:*:*:*']
                }));
                break;
            case 'ecs-task':
                statements.push(new iam.PolicyStatement({
                    sid: 'ECSTaskExecution',
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ecr:GetAuthorizationToken',
                        'ecr:BatchCheckLayerAvailability',
                        'ecr:GetDownloadUrlForLayer',
                        'ecr:BatchGetImage',
                        'logs:CreateLogStream',
                        'logs:PutLogEvents'
                    ],
                    resources: resources
                }));
                break;
            case 's3-access':
                statements.push(new iam.PolicyStatement({
                    sid: 'S3Access',
                    effect: iam.Effect.ALLOW,
                    actions: [
                        's3:GetObject',
                        's3:PutObject',
                        's3:DeleteObject',
                        's3:ListBucket'
                    ],
                    resources: resources
                }));
                break;
            case 'rds-access':
                statements.push(new iam.PolicyStatement({
                    sid: 'RDSAccess',
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'rds:Describe*',
                        'rds-db:connect'
                    ],
                    resources: resources
                }));
                break;
            case 'power-user':
                statements.push(new iam.PolicyStatement({
                    sid: 'PowerUserAccess',
                    effect: iam.Effect.ALLOW,
                    actions: ['*'],
                    resources: ['*']
                }));
                statements.push(new iam.PolicyStatement({
                    sid: 'DenyIAMAccess',
                    effect: iam.Effect.DENY,
                    actions: [
                        'iam:*',
                        'organizations:*',
                        'account:*'
                    ],
                    resources: ['*']
                }));
                break;
            case 'admin':
                statements.push(new iam.PolicyStatement({
                    sid: 'AdministratorAccess',
                    effect: iam.Effect.ALLOW,
                    actions: ['*'],
                    resources: ['*']
                }));
                break;
        }
        // Add additional statements from template
        if (template.additionalStatements) {
            const additionalStatements = template.additionalStatements.map(stmt => new iam.PolicyStatement({
                sid: stmt.Sid,
                effect: stmt.Effect === 'Allow' ? iam.Effect.ALLOW : iam.Effect.DENY,
                actions: Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action],
                resources: stmt.Resource ? (Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource]) : undefined,
                conditions: stmt.Condition
            }));
            statements.push(...additionalStatements);
        }
        return statements;
    }
    buildComplianceStatements() {
        const statements = [];
        if (['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)) {
            // Always deny insecure transport
            statements.push(new iam.PolicyStatement({
                sid: 'DenyInsecureTransport',
                effect: iam.Effect.DENY,
                actions: ['*'],
                resources: ['*'],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false'
                    }
                }
            }));
        }
        if (this.context.complianceFramework === 'fedramp-high') {
            // Require MFA for sensitive actions
            statements.push(new iam.PolicyStatement({
                sid: 'RequireMFAForSensitiveActions',
                effect: iam.Effect.DENY,
                actions: [
                    'iam:*',
                    'kms:*',
                    's3:Delete*',
                    'rds:Delete*'
                ],
                resources: ['*'],
                conditions: {
                    BoolIfExists: {
                        'aws:MultiFactorAuthPresent': 'false'
                    }
                }
            }));
        }
        return statements;
    }
    buildPolicyName() {
        if (this.config.policyName) {
            return this.config.policyName;
        }
        return `${this.context.serviceName}-${this.spec.name}`;
    }
    attachPolicyToEntities() {
        if (!this.policy || !(this.policy instanceof iam.ManagedPolicy)) {
            return; // Only managed policies can be attached
        }
        const managedPolicy = this.policy;
        // Attach to groups
        if (this.config.groups && this.config.groups.length > 0) {
            this.config.groups.forEach(groupName => {
                const group = iam.Group.fromGroupName(this, `Group${groupName}`, groupName);
                group.addManagedPolicy(managedPolicy);
            });
        }
        // Attach to roles
        if (this.config.roles && this.config.roles.length > 0) {
            this.config.roles.forEach(roleName => {
                const role = iam.Role.fromRoleName(this, `Role${roleName}`, roleName);
                role.addManagedPolicy(managedPolicy);
            });
        }
        // Attach to users
        if (this.config.users && this.config.users.length > 0) {
            this.config.users.forEach(userName => {
                const user = iam.User.fromUserName(this, `User${userName}`, userName);
                user.addManagedPolicy(managedPolicy);
            });
        }
    }
    applyComplianceHardening() {
        switch (this.context.complianceFramework) {
            case 'fedramp-moderate':
                this.applyFedrampModerateHardening();
                break;
            case 'fedramp-high':
                this.applyFedrampHighHardening();
                break;
            default:
                this.applyCommercialHardening();
                break;
        }
    }
    applyCommercialHardening() {
        // Basic logging for policy usage
        if (this.policy) {
            const logGroup = new logs.LogGroup(this, 'PolicyLogGroup', {
                logGroupName: `/aws/iam/policy/${this.buildPolicyName()}`,
                retention: logs.RetentionDays.THREE_MONTHS,
                removalPolicy: cdk.RemovalPolicy.DESTROY
            });
            this.applyStandardTags(logGroup, {
                'log-type': 'policy-usage',
                'retention': '3-months'
            });
        }
    }
    applyFedrampModerateHardening() {
        this.applyCommercialHardening();
        if (this.policy) {
            const complianceLogGroup = new logs.LogGroup(this, 'CompliancePolicyLogGroup', {
                logGroupName: `/aws/iam/policy/${this.buildPolicyName()}/compliance`,
                retention: logs.RetentionDays.ONE_YEAR,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            this.applyStandardTags(complianceLogGroup, {
                'log-type': 'compliance',
                'retention': '1-year',
                'compliance': 'fedramp-moderate'
            });
        }
    }
    applyFedrampHighHardening() {
        this.applyFedrampModerateHardening();
        if (this.policy) {
            const auditLogGroup = new logs.LogGroup(this, 'AuditPolicyLogGroup', {
                logGroupName: `/aws/iam/policy/${this.buildPolicyName()}/audit`,
                retention: logs.RetentionDays.TEN_YEARS,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            this.applyStandardTags(auditLogGroup, {
                'log-type': 'audit',
                'retention': '10-years',
                'compliance': 'fedramp-high'
            });
        }
    }
    buildPolicyCapability() {
        const policyArn = this.policy instanceof iam.ManagedPolicy ?
            this.policy.managedPolicyArn :
            this.policy.policyName;
        return {
            policyArn: policyArn,
            policyName: this.buildPolicyName()
        };
    }
    configureObservabilityForPolicy() {
        if (this.context.complianceFramework === 'commercial') {
            return;
        }
        const policyName = this.buildPolicyName();
        // 1. Policy Usage Alarm (unusual access patterns)
        const policyUsageAlarm = new cloudwatch.Alarm(this, 'PolicyUsageAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-policy-usage`,
            alarmDescription: 'IAM Policy usage monitoring alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/IAM',
                metricName: 'PolicyUsage',
                dimensionsMap: {
                    PolicyName: policyName
                },
                statistic: 'Sum',
                period: cdk.Duration.hours(1)
            }),
            threshold: 1000, // High usage threshold
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.applyStandardTags(policyUsageAlarm, {
            'alarm-type': 'policy-usage',
            'metric-type': 'security',
            'threshold': '1000'
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to IAM Policy', {
            alarmsCreated: 1,
            policyName: policyName,
            monitoringEnabled: true
        });
    }
}
exports.IamPolicyComponent = IamPolicyComponent;
