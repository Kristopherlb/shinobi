/**
 * Configuration Builder for Route53RecordComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
import { ConfigBuilder, ConfigBuilderContext } from '../../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for Route53RecordComponent component
 */
export interface Route53RecordConfig {
    /** Component name (optional, will be auto-generated) */
    name?: string;
    /** Component description */
    description?: string;
    /** Route 53 record configuration */
    record: {
        /** DNS record name (e.g., 'api.example.com') */
        recordName: string;
        /** DNS record type (A, AAAA, CNAME, MX, TXT, etc.) */
        recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'SRV' | 'PTR';
        /** Hosted zone name (e.g., 'example.com.') */
        zoneName: string;
        /** Target value for the DNS record */
        target: string | string[];
        /** Time to live in seconds */
        ttl?: number;
        /** Comment for the record set */
        comment?: string;
        /** Whether to evaluate target health */
        evaluateTargetHealth?: boolean;
        /** Weight for weighted routing */
        weight?: number;
        /** Set identifier for routing policies */
        setIdentifier?: string;
        /** Geographic location for geolocation routing */
        geoLocation?: {
            continent?: string;
            country?: string;
            subdivision?: string;
        };
        /** Failover configuration */
        failover?: 'PRIMARY' | 'SECONDARY';
        /** Latency-based routing region */
        region?: string;
    };
    /** Tagging configuration (Route 53 records don't support tags, but for documentation) */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for Route53RecordComponent configuration validation
 */
export declare const ROUTE53_RECORD_CONFIG_SCHEMA: {
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
        record: {
            type: string;
            description: string;
            properties: {
                recordName: {
                    type: string;
                    description: string;
                    pattern: string;
                    minLength: number;
                    maxLength: number;
                };
                recordType: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                zoneName: {
                    type: string;
                    description: string;
                    pattern: string;
                    minLength: number;
                    maxLength: number;
                };
                target: {
                    oneOf: ({
                        type: string;
                        description: string;
                        items?: undefined;
                        minItems?: undefined;
                    } | {
                        type: string;
                        description: string;
                        items: {
                            type: string;
                        };
                        minItems: number;
                    })[];
                };
                ttl: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                comment: {
                    type: string;
                    description: string;
                    maxLength: number;
                };
                evaluateTargetHealth: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                weight: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                setIdentifier: {
                    type: string;
                    description: string;
                    pattern: string;
                    maxLength: number;
                };
                geoLocation: {
                    type: string;
                    description: string;
                    properties: {
                        continent: {
                            type: string;
                            description: string;
                            pattern: string;
                        };
                        country: {
                            type: string;
                            description: string;
                            pattern: string;
                        };
                        subdivision: {
                            type: string;
                            description: string;
                            pattern: string;
                        };
                    };
                };
                failover: {
                    type: string;
                    description: string;
                    enum: string[];
                };
                region: {
                    type: string;
                    description: string;
                    pattern: string;
                    maxLength: number;
                };
            };
            required: string[];
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
 * Configuration Builder for Route53RecordComponent
 *
 * Extends the abstract ConfigBuilder to provide Route 53 record-specific configuration
 * with 5-layer precedence chain and compliance-aware defaults.
 */
export declare class Route53RecordConfigBuilder extends ConfigBuilder<Route53RecordConfig> {
    constructor(context: ConfigBuilderContext);
    /**
     * Provide component-specific hardcoded fallbacks.
     * These are the absolute, safest, most minimal defaults possible.
     *
     * Layer 1 (Priority 5 - Lowest): Hardcoded Fallbacks
     */
    protected getHardcodedFallbacks(): Record<string, any>;
}
