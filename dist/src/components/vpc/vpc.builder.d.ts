/**
 * Configuration Builder for VPC Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
import { ConfigBuilder, ConfigBuilderContext, ComponentConfigSchema } from '../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for VPC component
 */
export interface VpcConfig {
    /** Component name (optional, will be auto-generated) */
    name?: string;
    /** Component description */
    description?: string;
    /** CIDR block for the VPC */
    cidr?: string;
    /** Maximum number of Availability Zones */
    maxAzs?: number;
    /** Enable NAT gateways for private subnets */
    natGateways?: number;
    /** Enable VPC Flow Logs */
    flowLogsEnabled?: boolean;
    /** VPC Flow Logs retention period in days */
    flowLogRetentionDays?: number;
    /** Subnet configuration */
    subnets?: {
        /** Public subnet configuration */
        public?: {
            cidrMask?: number;
            name?: string;
        };
        /** Private subnet configuration */
        private?: {
            cidrMask?: number;
            name?: string;
        };
        /** Database subnet configuration */
        database?: {
            cidrMask?: number;
            name?: string;
        };
    };
    /** VPC Endpoints configuration */
    vpcEndpoints?: {
        s3?: boolean;
        dynamodb?: boolean;
        secretsManager?: boolean;
        kms?: boolean;
    };
    /** DNS configuration */
    dns?: {
        enableDnsHostnames?: boolean;
        enableDnsSupport?: boolean;
    };
    /** Enable detailed monitoring */
    monitoring?: {
        enabled?: boolean;
        detailedMetrics?: boolean;
        alarms?: {
            natGatewayPacketDropThreshold?: number;
            vpcFlowLogDeliveryFailures?: number;
        };
    };
    /** Tagging configuration */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for VPC configuration validation
 */
export declare const VPC_CONFIG_SCHEMA: ComponentConfigSchema;
/**
 * ConfigBuilder implementation for VPC component
 */
export declare class VpcConfigBuilder extends ConfigBuilder<VpcConfig> {
    constructor(builderContext: ConfigBuilderContext, schema: ComponentConfigSchema);
    /**
     * Provides ultra-safe baseline configuration that works in any environment
     */
    protected getHardcodedFallbacks(): Partial<VpcConfig>;
    /**
     * Security and compliance-specific configurations
     */
    protected getComplianceFrameworkDefaults(): Partial<VpcConfig>;
}
