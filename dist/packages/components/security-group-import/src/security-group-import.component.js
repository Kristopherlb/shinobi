"use strict";
/**
 * Security Group Import Component
 *
 * Declarative import of existing security groups via SSM parameters.
 * Implements the Platform Component API Contract and provides security-group:import capability.
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
exports.SecurityGroupImportComponent = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ssm = __importStar(require("aws-cdk-lib/aws-ssm"));
const component_1 = require("../../../../src/platform/contracts/component");
const security_group_import_builder_1 = require("./security-group-import.builder");
/**
 * Security Group Import Component
 *
 * Imports existing security groups by looking up their IDs from SSM parameters.
 * This is a "read-only" component that does not create new resources.
 */
class SecurityGroupImportComponent extends component_1.BaseComponent {
    config;
    securityGroup;
    ssmParameter;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
        // Build configuration using the 5-layer precedence chain
        const configBuilder = new security_group_import_builder_1.SecurityGroupImportConfigBuilder({ context, spec });
        this.config = configBuilder.buildSync();
        // Import the SSM parameter
        this.ssmParameter = this.importSsmParameter();
        // Import the security group
        this.securityGroup = this.importSecurityGroup();
        // Apply standard tags (for documentation purposes)
        this.applyStandardTags(this.securityGroup);
    }
    /**
     * Import the SSM parameter containing the security group ID
     */
    importSsmParameter() {
        const parameterName = this.config.securityGroup.ssmParameterName;
        // Import the SSM parameter
        const parameter = ssm.StringParameter.fromStringParameterName(this, 'SecurityGroupParameter', parameterName);
        return parameter;
    }
    /**
     * Import the security group using the ID from the SSM parameter
     */
    importSecurityGroup() {
        const { securityGroup } = this.config;
        // Import the security group by ID from SSM parameter
        const importedSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'ImportedSecurityGroup', this.ssmParameter.stringValue, {
            allowAllOutbound: false, // Conservative default
            mutable: false // Read-only import
        });
        // Add validation if configured
        if (this.config.validation?.validateExistence) {
            this.addValidation(importedSecurityGroup);
        }
        return importedSecurityGroup;
    }
    /**
     * Add validation for the imported security group
     */
    addValidation(securityGroup) {
        const { validation, securityGroup: sgConfig } = this.config;
        if (!validation?.validateExistence)
            return;
        // Create a custom resource to validate the security group exists
        const validator = new cdk.CustomResource(this, 'SecurityGroupValidator', {
            serviceToken: this.createValidationLambda(),
            properties: {
                SecurityGroupId: securityGroup.securityGroupId,
                VpcId: sgConfig.vpcId,
                ValidateVpc: validation.validateVpc || false,
                Timeout: validation.validationTimeout || 30
            }
        });
        // Ensure the security group is created before validation
        securityGroup.node.addDependency(validator);
    }
    /**
     * Create a Lambda function for security group validation
     */
    createValidationLambda() {
        // In a real implementation, this would create a Lambda function
        // For now, we'll use a placeholder that would be provided by the platform
        return `arn:aws:lambda:${this.context.region}:${this.context.accountId}:function:security-group-validator`;
    }
    /**
     * Get the security group construct for external access
     */
    getConstruct(handle) {
        switch (handle) {
            case 'securityGroup':
                return this.securityGroup;
            case 'ssmParameter':
                return this.ssmParameter;
            default:
                throw new Error(`Unknown construct handle: ${handle}`);
        }
    }
    /**
     * Get component capabilities
     */
    getCapabilities() {
        return {
            'security-group:import': {
                securityGroupId: this.securityGroup.securityGroupId,
                ssmParameterName: this.config.securityGroup.ssmParameterName,
                vpcId: this.config.securityGroup.vpcId,
                region: this.config.securityGroup.region || this.context.region,
                accountId: this.config.securityGroup.accountId || this.context.accountId
            }
        };
    }
    /**
     * Get component outputs
     */
    getOutputs() {
        return {
            securityGroupId: this.securityGroup.securityGroupId,
            vpcId: this.config.securityGroup.vpcId,
            ssmParameterName: this.config.securityGroup.ssmParameterName,
            ssmParameterValue: this.ssmParameter.stringValue
        };
    }
    /**
     * Synthesize the component (required by BaseComponent)
     */
    synth() {
        // Component is already synthesized in constructor
        // This method is required by the abstract base class
    }
    /**
     * Get component type (required by BaseComponent)
     */
    getType() {
        return 'security-group-import';
    }
}
exports.SecurityGroupImportComponent = SecurityGroupImportComponent;
