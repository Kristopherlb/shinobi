"use strict";
/**
 * IAM Role Component
 *
 * AWS IAM Role for secure resource access with least privilege security patterns.
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
exports.IamRoleComponent = exports.IamRoleConfigBuilder = exports.IAM_ROLE_CONFIG_SCHEMA = void 0;
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for IAM Role component
 */
exports.IAM_ROLE_CONFIG_SCHEMA = {
    type: 'object',
    title: 'IAM Role Configuration',
    description: 'Configuration for creating an IAM Role',
    properties: {
        roleName: {
            type: 'string',
            description: 'Name of the role (will be auto-generated if not provided)',
            pattern: '^[a-zA-Z0-9+=,.@_-]+$',
            maxLength: 64
        },
        description: {
            type: 'string',
            description: 'Description of the role',
            maxLength: 1000
        },
        assumedBy: {
            type: 'array',
            description: 'Services or entities that can assume this role',
            items: {
                type: 'object',
                properties: {
                    service: {
                        type: 'string',
                        description: 'AWS service name (e.g., lambda.amazonaws.com)'
                    },
                    accountId: {
                        type: 'string',
                        description: 'AWS account ID',
                        pattern: '^[0-9]{12}$'
                    },
                    roleArn: {
                        type: 'string',
                        description: 'Specific IAM role ARN'
                    },
                    federatedProvider: {
                        type: 'string',
                        description: 'Federated identity provider'
                    }
                },
                additionalProperties: false
            },
            default: []
        },
        managedPolicies: {
            type: 'array',
            description: 'Managed policy ARNs to attach',
            items: {
                type: 'string',
                description: 'Policy ARN'
            },
            default: []
        },
        inlinePolicies: {
            type: 'array',
            description: 'Inline policies to attach',
            items: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Policy name'
                    },
                    document: {
                        type: 'object',
                        description: 'IAM policy document'
                    }
                },
                required: ['name', 'document'],
                additionalProperties: false
            },
            default: []
        },
        maxSessionDuration: {
            type: 'number',
            description: 'Maximum session duration in seconds',
            minimum: 3600,
            maximum: 43200,
            default: 3600
        },
        externalId: {
            type: 'string',
            description: 'External ID for cross-account access',
            maxLength: 1224
        },
        path: {
            type: 'string',
            description: 'Path for the role',
            pattern: '^/.*/$',
            default: '/'
        },
        permissionsBoundary: {
            type: 'string',
            description: 'Permission boundary policy ARN'
        },
        tags: {
            type: 'object',
            description: 'Tags for the role',
            additionalProperties: {
                type: 'string'
            },
            default: {}
        }
    },
    additionalProperties: false,
    defaults: {
        assumedBy: [],
        managedPolicies: [],
        inlinePolicies: [],
        maxSessionDuration: 3600,
        path: '/',
        tags: {}
    }
};
/**
 * Configuration builder for IAM Role component
 */
class IamRoleConfigBuilder {
    context;
    spec;
    constructor(context, spec) {
        this.context = context;
        this.spec = spec;
    }
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    async build() {
        return this.buildSync();
    }
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync() {
        // Start with platform defaults
        const platformDefaults = this.getPlatformDefaults();
        // Apply compliance framework defaults
        const complianceDefaults = this.getComplianceFrameworkDefaults();
        // Merge user configuration from spec
        const userConfig = this.spec.config || {};
        // Merge configurations (user config takes precedence)
        const mergedConfig = this.mergeConfigs(this.mergeConfigs(platformDefaults, complianceDefaults), userConfig);
        return mergedConfig;
    }
    /**
     * Simple merge utility for combining configuration objects
     */
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
    /**
     * Get platform-wide defaults for IAM Role
     */
    getPlatformDefaults() {
        return {
            maxSessionDuration: this.getDefaultSessionDuration(),
            path: '/',
            tags: {
                'service': this.context.serviceName,
                'environment': this.context.environment
            }
        };
    }
    /**
     * Get compliance framework specific defaults
     */
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
                return {
                    maxSessionDuration: 7200, // 2 hours max for compliance
                    // Mandatory compliance tags
                    tags: {
                        'compliance-framework': 'fedramp-moderate',
                        'data-classification': 'controlled',
                        'access-review': 'required'
                    },
                    // Add permission boundary for compliance
                    permissionsBoundary: this.getCompliancePermissionBoundary()
                };
            case 'fedramp-high':
                return {
                    maxSessionDuration: 3600, // 1 hour max for high security
                    // Stricter compliance tags
                    tags: {
                        'compliance-framework': 'fedramp-high',
                        'data-classification': 'confidential',
                        'access-review': 'quarterly',
                        'mfa-required': 'true'
                    },
                    // Mandatory permission boundary for high compliance
                    permissionsBoundary: this.getCompliancePermissionBoundary()
                };
            default: // commercial
                return {
                    tags: {
                        'environment': this.context.environment
                    }
                };
        }
    }
    /**
     * Get default session duration based on compliance framework
     */
    getDefaultSessionDuration() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 3600; // 1 hour for high security
            case 'fedramp-moderate':
                return 7200; // 2 hours for moderate
            default:
                return 3600; // 1 hour default
        }
    }
    /**
     * Get compliance permission boundary ARN
     */
    getCompliancePermissionBoundary() {
        // In a real implementation, this would reference an actual compliance boundary policy
        return `arn:aws:iam::${this.context.accountId}:policy/CompliancePermissionBoundary`;
    }
}
exports.IamRoleConfigBuilder = IamRoleConfigBuilder;
/**
 * IAM Role Component implementing Component API Contract v1.0
 */
class IamRoleComponent extends contracts_1.Component {
    role;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create IAM Role with compliance hardening
     */
    synth() {
        // Log component synthesis start
        this.logComponentEvent('synthesis_start', 'Starting IAM Role component synthesis', {
            roleName: this.spec.config?.roleName,
            assumedByCount: this.spec.config?.assumedBy?.length || 0
        });
        const startTime = Date.now();
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new IamRoleConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Log configuration built
            this.logComponentEvent('config_built', 'IAM Role configuration built successfully', {
                roleName: this.config.roleName,
                maxSessionDuration: this.config.maxSessionDuration,
                managedPoliciesCount: this.config.managedPolicies?.length || 0
            });
            // Create IAM Role
            this.createRole();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Configure observability
            this.configureObservabilityForRole();
            // Register constructs
            this.registerConstruct('role', this.role);
            // Register capabilities
            this.registerCapability('iam:role', this.buildRoleCapability());
            // Log successful synthesis completion
            const duration = Date.now() - startTime;
            this.logPerformanceMetric('component_synthesis', duration, {
                resourcesCreated: Object.keys(this.capabilities).length
            });
            this.logComponentEvent('synthesis_complete', 'IAM Role component synthesis completed successfully', {
                roleCreated: 1,
                policiesAttached: (this.config.managedPolicies?.length || 0) + (this.config.inlinePolicies?.length || 0)
            });
        }
        catch (error) {
            this.logError(error, 'component synthesis', {
                componentType: 'iam-role',
                stage: 'synthesis'
            });
            throw error;
        }
    }
    /**
     * Get the capabilities this component provides
     */
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    /**
     * Get the component type identifier
     */
    getType() {
        return 'iam-role';
    }
    /**
     * Create the IAM Role
     */
    createRole() {
        // Build assume role policy based on configuration
        const assumedBy = this.buildAssumedByPrincipal();
        const roleProps = {
            roleName: this.buildRoleName(),
            description: this.config.description,
            assumedBy: assumedBy,
            maxSessionDuration: cdk.Duration.seconds(this.config.maxSessionDuration),
            path: this.config.path,
            externalIds: this.config.externalId ? [this.config.externalId] : undefined,
            permissionsBoundary: this.config.permissionsBoundary ?
                iam.ManagedPolicy.fromManagedPolicyArn(this, 'PermissionsBoundary', this.config.permissionsBoundary) :
                undefined
        };
        this.role = new iam.Role(this, 'Role', roleProps);
        // Apply standard tags
        this.applyStandardTags(this.role, {
            'role-type': 'custom',
            'max-session-duration': this.config.maxSessionDuration.toString(),
            'managed-policies-count': (this.config.managedPolicies?.length || 0).toString(),
            'inline-policies-count': (this.config.inlinePolicies?.length || 0).toString()
        });
        // Apply additional user tags
        if (this.config.tags) {
            Object.entries(this.config.tags).forEach(([key, value]) => {
                cdk.Tags.of(this.role).add(key, value);
            });
        }
        // Attach managed policies
        if (this.config.managedPolicies && this.config.managedPolicies.length > 0) {
            this.config.managedPolicies.forEach((policyArn, index) => {
                const policy = iam.ManagedPolicy.fromManagedPolicyArn(this, `ManagedPolicy${index}`, policyArn);
                this.role.addManagedPolicy(policy);
            });
        }
        // Add inline policies
        if (this.config.inlinePolicies && this.config.inlinePolicies.length > 0) {
            this.config.inlinePolicies.forEach(policySpec => {
                const policyDocument = iam.PolicyDocument.fromJson(policySpec.document);
                this.role.attachInlinePolicy(new iam.Policy(this, policySpec.name, {
                    policyName: policySpec.name,
                    document: policyDocument
                }));
            });
        }
        // Log role creation
        this.logResourceCreation('iam-role', this.role.roleName, {
            assumedByPrincipals: this.config.assumedBy?.length || 0,
            managedPoliciesCount: this.config.managedPolicies?.length || 0,
            inlinePoliciesCount: this.config.inlinePolicies?.length || 0
        });
    }
    /**
     * Build the principal that can assume this role
     */
    buildAssumedByPrincipal() {
        if (!this.config.assumedBy || this.config.assumedBy.length === 0) {
            // Default to Lambda service if no principal specified
            return new iam.ServicePrincipal('lambda.amazonaws.com');
        }
        const principals = [];
        this.config.assumedBy.forEach(assumedBy => {
            if (assumedBy.service) {
                principals.push(new iam.ServicePrincipal(assumedBy.service));
            }
            else if (assumedBy.accountId) {
                principals.push(new iam.AccountPrincipal(assumedBy.accountId));
            }
            else if (assumedBy.roleArn) {
                principals.push(new iam.ArnPrincipal(assumedBy.roleArn));
            }
            else if (assumedBy.federatedProvider) {
                principals.push(new iam.FederatedPrincipal(assumedBy.federatedProvider, {}));
            }
        });
        return principals.length === 1 ?
            principals[0] :
            new iam.CompositePrincipal(...principals);
    }
    /**
     * Build role name
     */
    buildRoleName() {
        if (this.config.roleName) {
            return this.config.roleName;
        }
        return `${this.context.serviceName}-${this.spec.name}`;
    }
    /**
     * Apply compliance-specific hardening
     */
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
        // Basic security policies for commercial use
        if (this.role) {
            // Add basic security policy to prevent privilege escalation
            this.role.attachInlinePolicy(new iam.Policy(this, 'SecurityPolicy', {
                policyName: 'SecurityPolicy',
                document: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            sid: 'DenyPrivilegeEscalation',
                            effect: iam.Effect.DENY,
                            actions: [
                                'iam:AttachRolePolicy',
                                'iam:DetachRolePolicy',
                                'iam:PutRolePolicy',
                                'iam:DeleteRolePolicy',
                                'iam:CreateRole',
                                'iam:DeleteRole',
                                'iam:UpdateRole',
                                'iam:UpdateAssumeRolePolicy'
                            ],
                            resources: ['*']
                        })
                    ]
                })
            }));
        }
    }
    applyFedrampModerateHardening() {
        // Apply commercial hardening
        this.applyCommercialHardening();
        if (this.role) {
            // Enhanced access logging for compliance
            const accessLogGroup = new logs.LogGroup(this, 'RoleAccessLogGroup', {
                logGroupName: `/aws/iam/role/${this.role.roleName}`,
                retention: logs.RetentionDays.ONE_YEAR,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            // Apply standard tags
            this.applyStandardTags(accessLogGroup, {
                'log-type': 'role-access',
                'retention': '1-year',
                'compliance': 'fedramp-moderate'
            });
            // Add compliance monitoring policy
            this.role.attachInlinePolicy(new iam.Policy(this, 'ComplianceMonitoringPolicy', {
                policyName: 'ComplianceMonitoring',
                document: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            sid: 'RequireCloudTrailLogging',
                            effect: iam.Effect.DENY,
                            actions: ['*'],
                            resources: ['*'],
                            conditions: {
                                Bool: {
                                    'aws:CloudWatchLogsDelivery': 'false'
                                }
                            }
                        })
                    ]
                })
            }));
        }
    }
    applyFedrampHighHardening() {
        // Apply all moderate hardening
        this.applyFedrampModerateHardening();
        if (this.role) {
            // Extended audit logging for high compliance
            const auditLogGroup = new logs.LogGroup(this, 'RoleAuditLogGroup', {
                logGroupName: `/aws/iam/role/${this.role.roleName}/audit`,
                retention: logs.RetentionDays.TEN_YEARS,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            // Apply standard tags
            this.applyStandardTags(auditLogGroup, {
                'log-type': 'audit',
                'retention': '10-years',
                'compliance': 'fedramp-high'
            });
            // Additional security restrictions
            this.role.attachInlinePolicy(new iam.Policy(this, 'HighSecurityPolicy', {
                policyName: 'HighSecurity',
                document: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
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
                        })
                    ]
                })
            }));
        }
    }
    /**
     * Build role capability data shape
     */
    buildRoleCapability() {
        return {
            roleArn: this.role.roleArn,
            roleName: this.role.roleName
        };
    }
    /**
     * Configure CloudWatch observability for IAM Role
     */
    configureObservabilityForRole() {
        // Enable monitoring for compliance frameworks only
        if (this.context.complianceFramework === 'commercial') {
            return;
        }
        const roleName = this.role.roleName;
        // 1. Role Assumption Frequency Alarm (unusual activity)
        const assumptionFrequencyAlarm = new cloudwatch.Alarm(this, 'RoleAssumptionFrequencyAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-high-assumptions`,
            alarmDescription: 'IAM Role high assumption frequency alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/CloudTrail',
                metricName: 'AssumeRole',
                dimensionsMap: {
                    RoleName: roleName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 100, // High threshold for potential abuse
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // Apply standard tags
        this.applyStandardTags(assumptionFrequencyAlarm, {
            'alarm-type': 'high-assumption-rate',
            'metric-type': 'security',
            'threshold': '100'
        });
        // 2. Failed Assumption Attempts Alarm
        const failedAssumptionAlarm = new cloudwatch.Alarm(this, 'FailedAssumptionAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-failed-assumptions`,
            alarmDescription: 'IAM Role failed assumption attempts alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/CloudTrail',
                metricName: 'AssumeRoleFailure',
                dimensionsMap: {
                    RoleName: roleName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 5, // Multiple failures could indicate attack
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // Apply standard tags
        this.applyStandardTags(failedAssumptionAlarm, {
            'alarm-type': 'failed-assumptions',
            'metric-type': 'security',
            'threshold': '5'
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to IAM Role', {
            alarmsCreated: 2,
            roleName: roleName,
            monitoringEnabled: true
        });
    }
}
exports.IamRoleComponent = IamRoleComponent;
