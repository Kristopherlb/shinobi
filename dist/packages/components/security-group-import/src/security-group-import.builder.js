"use strict";
/**
 * Configuration Builder for SecurityGroupImportComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityGroupImportConfigBuilder = exports.SECURITY_GROUP_IMPORT_CONFIG_SCHEMA = void 0;
const config_builder_1 = require("../../../../src/platform/contracts/config-builder");
/**
 * JSON Schema for SecurityGroupImportComponent configuration validation
 */
exports.SECURITY_GROUP_IMPORT_CONFIG_SCHEMA = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            description: 'Component name (optional, will be auto-generated from component name)',
            pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
            maxLength: 128
        },
        description: {
            type: 'string',
            description: 'Component description for documentation',
            maxLength: 500
        },
        securityGroup: {
            type: 'object',
            description: 'Security Group import configuration',
            properties: {
                ssmParameterName: {
                    type: 'string',
                    description: 'SSM parameter name containing the security group ID',
                    pattern: '^/[a-zA-Z0-9._-]+$',
                    minLength: 1,
                    maxLength: 2048
                },
                region: {
                    type: 'string',
                    description: 'AWS region where the security group exists',
                    pattern: '^[a-z0-9-]+$',
                    maxLength: 20
                },
                accountId: {
                    type: 'string',
                    description: 'AWS account ID where the security group exists',
                    pattern: '^[0-9]{12}$'
                },
                vpcId: {
                    type: 'string',
                    description: 'VPC ID where the security group exists (for validation)',
                    pattern: '^vpc-[a-f0-9]{8,17}$'
                },
                securityGroupName: {
                    type: 'string',
                    description: 'Security group name for reference (documentation only)',
                    pattern: '^[a-zA-Z0-9._-]+$',
                    maxLength: 255
                }
            },
            required: ['ssmParameterName']
        },
        validation: {
            type: 'object',
            description: 'Import validation settings',
            properties: {
                validateExistence: {
                    type: 'boolean',
                    description: 'Whether to validate the security group exists during synthesis',
                    default: true
                },
                validateVpc: {
                    type: 'boolean',
                    description: 'Whether to validate the security group is in the expected VPC',
                    default: false
                },
                validationTimeout: {
                    type: 'integer',
                    description: 'Custom validation timeout in seconds',
                    minimum: 5,
                    maximum: 300,
                    default: 30
                }
            }
        },
        tags: {
            type: 'object',
            description: 'Tagging configuration (for documentation purposes only)',
            additionalProperties: {
                type: 'string',
                maxLength: 256
            }
        }
    },
    required: ['securityGroup'],
    additionalProperties: false
};
/**
 * Configuration Builder for SecurityGroupImportComponent
 *
 * Extends the abstract ConfigBuilder to provide security group import-specific configuration
 * with 5-layer precedence chain and compliance-aware defaults.
 */
class SecurityGroupImportConfigBuilder extends config_builder_1.ConfigBuilder {
    constructor(context) {
        super(context, exports.SECURITY_GROUP_IMPORT_CONFIG_SCHEMA);
    }
    /**
     * Provide component-specific hardcoded fallbacks.
     * These are the absolute, safest, most minimal defaults possible.
     *
     * Layer 1 (Priority 5 - Lowest): Hardcoded Fallbacks
     */
    getHardcodedFallbacks() {
        return {
            securityGroup: {
                ssmParameterName: '/platform/security-groups/default', // Safe default path
                region: undefined, // Will use current region
                accountId: undefined, // Will use current account
                vpcId: undefined, // No VPC validation by default
                securityGroupName: undefined // No name validation by default
            },
            validation: {
                validateExistence: true, // Always validate by default for safety
                validateVpc: false, // Disabled by default to avoid cross-VPC issues
                validationTimeout: 30 // 30 seconds timeout
            },
            tags: {
                'Component': 'security-group-import',
                'ManagedBy': 'platform',
                'ImportType': 'ssm-parameter'
            }
        };
    }
}
exports.SecurityGroupImportConfigBuilder = SecurityGroupImportConfigBuilder;
