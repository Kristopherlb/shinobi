"use strict";
/**
 * IAM Role Component
 *
 * Declarative management of custom IAM roles with inline policies and managed policies.
 * Implements the Platform Component API Contract and provides iam:assumeRole capability.
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
exports.IamRoleComponent = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const component_1 = require("../../../../src/platform/contracts/component");
const iam_role_builder_1 = require("./iam-role.builder");
/**
 * IAM Role Component
 *
 * Creates and manages custom IAM roles with configurable inline policies,
 * managed policies, and compliance-aware defaults.
 */
class IamRoleComponent extends component_1.BaseComponent {
    config;
    role;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
        // Build configuration only - no synthesis in constructor
        const configBuilder = new iam_role_builder_1.IamRoleConfigBuilder({ context, spec });
        this.config = configBuilder.buildSync();
        // Initialize role as undefined - will be created in synth()
        this.role = undefined;
    }
    /**
     * Create the IAM role with all configured policies and settings
     */
    createIamRole() {
        const roleProps = {
            roleName: this.config.name || `${this.context.environment}-${this.node.id}-role`,
            description: this.config.description || `IAM role for ${this.node.id}`,
            assumedBy: this.createPrincipal(),
            maxSessionDuration: cdk.Duration.seconds(this.config.role.maxSessionDuration || 3600),
            path: this.config.role.path || '/'
        };
        // Add inline policies
        if (this.config.role.inlinePolicies) {
            roleProps.inlinePolicies = this.createInlinePolicies();
        }
        // Add managed policies
        if (this.config.role.managedPolicies && this.config.role.managedPolicies.length > 0) {
            roleProps.managedPolicies = this.config.role.managedPolicies.map(arn => iam.ManagedPolicy.fromManagedPolicyArn(this, `ManagedPolicy-${arn.split('/').pop()}`, arn));
        }
        // Apply compliance settings
        this.applyComplianceSettings(roleProps);
        return new iam.Role(this, 'Role', roleProps);
    }
    /**
     * Create the principal that can assume this role
     */
    createPrincipal() {
        const { assumedBy } = this.config.role;
        if (assumedBy.service) {
            return new iam.ServicePrincipal(assumedBy.service);
        }
        if (assumedBy.arn) {
            return new iam.ArnPrincipal(assumedBy.arn);
        }
        if (assumedBy.account) {
            const accountPrincipal = new iam.AccountPrincipal(assumedBy.account);
            if (assumedBy.externalId) {
                // Add external ID condition to the principal
                accountPrincipal.addToPolicy(new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['sts:AssumeRole'],
                    conditions: {
                        StringEquals: {
                            'sts:ExternalId': assumedBy.externalId
                        }
                    }
                }));
            }
            return accountPrincipal;
        }
        // Fallback to EC2 service principal
        return new iam.ServicePrincipal('ec2.amazonaws.com');
    }
    /**
     * Create inline policies from configuration
     */
    createInlinePolicies() {
        const policies = {};
        for (const [policyName, policyConfig] of Object.entries(this.config.role.inlinePolicies)) {
            const statements = policyConfig.statements.map(statement => new iam.PolicyStatement({
                effect: statement.effect === 'Allow' ? iam.Effect.ALLOW : iam.Effect.DENY,
                actions: statement.actions,
                resources: statement.resources,
                conditions: statement.conditions
            }));
            policies[policyName] = new iam.PolicyDocument({
                statements
            });
        }
        return policies;
    }
    /**
     * Apply compliance settings to the role
     */
    applyComplianceSettings(roleProps) {
        const { compliance } = this.config;
        if (!compliance)
            return;
        // Apply permissions boundary if configured
        if (compliance.permissionsBoundary && compliance.permissionsBoundaryArn) {
            roleProps.permissionsBoundary = iam.ManagedPolicy.fromManagedPolicyArn(this, 'PermissionsBoundary', compliance.permissionsBoundaryArn);
        }
        // Add MFA requirement if specified
        if (compliance.requireMfa) {
            // Create a new principal with MFA condition
            const mfaPrincipal = new iam.CompositePrincipal(roleProps.assumedBy);
            mfaPrincipal.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['sts:AssumeRole'],
                conditions: {
                    Bool: { 'aws:MultiFactorAuthPresent': 'true' }
                }
            }));
            roleProps.assumedBy = mfaPrincipal;
        }
    }
    /**
     * Configure observability for IAM role
     */
    _configureObservabilityForIamRole() {
        // Create CloudWatch alarm for role usage
        // Note: This would be implemented with actual CloudWatch alarm creation
        // For now, this is a placeholder for future observability integration
        // Future implementation would include:
        // - CloudWatch alarms for role assumption events
        // - Metrics for policy attachment/detachment
        // - Logging for role creation and modification events
    }
    /**
     * Get the IAM role construct for external access
     */
    getConstruct(handle) {
        if (!this.role) {
            throw new Error('Component must be synthesized before accessing constructs');
        }
        switch (handle) {
            case 'role':
                return this.role;
            default:
                throw new Error(`Unknown construct handle: ${handle}`);
        }
    }
    /**
     * Get component capabilities
     */
    getCapabilities() {
        if (!this.role) {
            throw new Error('Component must be synthesized before accessing capabilities');
        }
        return {
            'iam:assumeRole': {
                roleArn: this.role.roleArn,
                roleName: this.role.roleName,
                principal: this.config.role.assumedBy.service || 'custom'
            }
        };
    }
    /**
     * Get component outputs
     */
    getOutputs() {
        if (!this.role) {
            throw new Error('Component must be synthesized before accessing outputs');
        }
        return {
            roleArn: this.role.roleArn,
            roleName: this.role.roleName,
            roleId: this.role.roleId
        };
    }
    /**
     * Synthesize the component (required by BaseComponent)
     */
    synth() {
        try {
            // Step 1: Create the IAM role
            this.role = this.createIamRole();
            // Step 2: Apply standard tags
            this.applyStandardTags(this.role);
            // Step 3: Register constructs for patches.ts access
            this.registerConstruct('main', this.role);
            this.registerConstruct('role', this.role);
            // Step 4: Register capabilities for component binding
            this.registerCapability('iam:assumeRole', {
                roleArn: this.role.roleArn,
                roleName: this.role.roleName,
                principal: this.config.role.assumedBy.service || 'custom'
            });
            // Step 5: Configure observability for IAM role
            this._configureObservabilityForIamRole();
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Get component type (required by BaseComponent)
     */
    getType() {
        return 'iam-role';
    }
}
exports.IamRoleComponent = IamRoleComponent;
