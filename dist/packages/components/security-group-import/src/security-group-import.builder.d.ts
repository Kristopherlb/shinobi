/**
 * Configuration Builder for SecurityGroupImportComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
import { ConfigBuilder, ConfigBuilderContext } from '../../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for SecurityGroupImportComponent component
 */
export interface SecurityGroupImportConfig {
    /** Component name (optional, will be auto-generated) */
    name?: string;
    /** Component description */
    description?: string;
    /** Security Group import configuration */
    securityGroup: {
        /** SSM parameter name containing the security group ID */
        ssmParameterName: string;
        /** AWS region where the security group exists (optional, defaults to current region) */
        region?: string;
        /** AWS account ID where the security group exists (optional, defaults to current account) */
        accountId?: string;
        /** VPC ID where the security group exists (optional, for validation) */
        vpcId?: string;
        /** Security group name for reference (optional, for documentation) */
        securityGroupName?: string;
    };
    /** Import validation settings */
    validation?: {
        /** Whether to validate the security group exists during synthesis */
        validateExistence?: boolean;
        /** Whether to validate the security group is in the expected VPC */
        validateVpc?: boolean;
        /** Custom validation timeout in seconds */
        validationTimeout?: number;
    };
    /** Tagging configuration (for documentation purposes only) */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for SecurityGroupImportComponent configuration validation
 */
export declare const SECURITY_GROUP_IMPORT_CONFIG_SCHEMA: {
    type: string;
    properties: {
        name: {
            type: string;
            description: string;
            pattern: string;
            maxLength: number;
        };
        description: {
            type: string;
            description: string;
            maxLength: number;
        };
        securityGroup: {
            type: string;
            description: string;
            properties: {
                ssmParameterName: {
                    type: string;
                    description: string;
                    pattern: string;
                    minLength: number;
                    maxLength: number;
                };
                region: {
                    type: string;
                    description: string;
                    pattern: string;
                    maxLength: number;
                };
                accountId: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                vpcId: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                securityGroupName: {
                    type: string;
                    description: string;
                    pattern: string;
                    maxLength: number;
                };
            };
            required: string[];
        };
        validation: {
            type: string;
            description: string;
            properties: {
                validateExistence: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                validateVpc: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                validationTimeout: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
        };
        tags: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
                maxLength: number;
            };
        };
    };
    required: string[];
    additionalProperties: boolean;
};
/**
 * Configuration Builder for SecurityGroupImportComponent
 *
 * Extends the abstract ConfigBuilder to provide security group import-specific configuration
 * with 5-layer precedence chain and compliance-aware defaults.
 */
export declare class SecurityGroupImportConfigBuilder extends ConfigBuilder<SecurityGroupImportConfig> {
    constructor(context: ConfigBuilderContext);
    /**
     * Provide component-specific hardcoded fallbacks.
     * These are the absolute, safest, most minimal defaults possible.
     *
     * Layer 1 (Priority 5 - Lowest): Hardcoded Fallbacks
     */
    protected getHardcodedFallbacks(): Record<string, any>;
}
