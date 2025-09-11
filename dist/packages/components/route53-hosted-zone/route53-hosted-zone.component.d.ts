/**
 * Route53 Hosted Zone Component
 *
 * AWS Route53 Hosted Zone for DNS management and domain resolution.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for Route53 Hosted Zone component
 */
export interface Route53HostedZoneConfig {
    /** Zone name (domain name) - required */
    zoneName: string;
    /** Comment for the hosted zone */
    comment?: string;
    /** Enable query logging */
    queryLoggingEnabled?: boolean;
    /** Query log destination (CloudWatch log group) */
    queryLogDestination?: string;
    /** VPCs to associate with private hosted zone */
    vpcs?: Array<{
        vpcId: string;
        region?: string;
    }>;
    /** Tags for the hosted zone */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for Route53 Hosted Zone component
 */
export declare const ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    required: string[];
    properties: {
        zoneName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        comment: {
            type: string;
            description: string;
            maxLength: number;
        };
        queryLoggingEnabled: {
            type: string;
            description: string;
            default: boolean;
        };
        queryLogDestination: {
            type: string;
            description: string;
        };
        vpcs: {
            type: string;
            description: string;
            items: {
                type: string;
                properties: {
                    vpcId: {
                        type: string;
                        description: string;
                    };
                    region: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
            default: never[];
        };
        tags: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
            };
            default: {};
        };
    };
    additionalProperties: boolean;
    defaults: {
        queryLoggingEnabled: boolean;
        vpcs: never[];
        tags: {};
    };
};
/**
 * Configuration builder for Route53 Hosted Zone component
 */
export declare class Route53HostedZoneConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<Route53HostedZoneConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): Route53HostedZoneConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for Route53 Hosted Zone
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default query logging setting based on compliance framework
     */
    private getDefaultQueryLogging;
}
/**
 * Route53 Hosted Zone Component implementing Component API Contract v1.0
 */
export declare class Route53HostedZoneComponent extends Component {
    private hostedZone?;
    private queryLogGroup?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create Route53 Hosted Zone with compliance hardening
     */
    synth(): void;
    /**
     * Get the capabilities this component provides
     */
    getCapabilities(): ComponentCapabilities;
    /**
     * Get the component type identifier
     */
    getType(): string;
    /**
     * Create query log group if query logging is enabled
     */
    private createQueryLogGroupIfNeeded;
    /**
     * Create the hosted zone (public or private based on VPC configuration)
     */
    private createHostedZone;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Get log retention based on compliance framework
     */
    private getLogRetention;
    /**
     * Get log removal policy based on compliance framework
     */
    private getLogRemovalPolicy;
    /**
     * Build hosted zone capability data shape
     */
    private buildHostedZoneCapability;
    /**
     * Configure CloudWatch observability for Route53 Hosted Zone
     */
    private configureObservabilityForHostedZone;
}
