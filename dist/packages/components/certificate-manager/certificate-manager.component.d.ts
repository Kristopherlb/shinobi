/**
 * Certificate Manager Component
 *
 * AWS Certificate Manager for SSL/TLS certificate provisioning and management.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for Certificate Manager component
 */
export interface CertificateManagerConfig {
    /** Domain name for the certificate (required) */
    domainName: string;
    /** Subject alternative names */
    subjectAlternativeNames?: string[];
    /** Validation method */
    validation?: {
        method: 'DNS' | 'EMAIL';
        /** Route53 hosted zone for DNS validation (required for DNS validation) */
        hostedZone?: string;
        /** Email addresses for email validation */
        validationEmails?: string[];
    };
    /** Certificate transparency logging */
    transparencyLoggingEnabled?: boolean;
    /** Key algorithm */
    keyAlgorithm?: 'RSA_2048' | 'EC_prime256v1' | 'EC_secp384r1';
    /** Tags for the certificate */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for Certificate Manager component
 */
export declare const CERTIFICATE_MANAGER_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    required: string[];
    properties: {
        domainName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        subjectAlternativeNames: {
            type: string;
            description: string;
            items: {
                type: string;
                pattern: string;
            };
            default: never[];
        };
        validation: {
            type: string;
            description: string;
            properties: {
                method: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                hostedZone: {
                    type: string;
                    description: string;
                };
                validationEmails: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        format: string;
                    };
                };
            };
            additionalProperties: boolean;
            default: {
                method: string;
            };
        };
        transparencyLoggingEnabled: {
            type: string;
            description: string;
            default: boolean;
        };
        keyAlgorithm: {
            type: string;
            description: string;
            enum: string[];
            default: string;
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
        subjectAlternativeNames: never[];
        validation: {
            method: string;
        };
        transparencyLoggingEnabled: boolean;
        keyAlgorithm: string;
        tags: {};
    };
};
/**
 * Configuration builder for Certificate Manager component
 */
export declare class CertificateManagerConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<CertificateManagerConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): CertificateManagerConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for Certificate Manager
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default key algorithm based on compliance framework
     */
    private getDefaultKeyAlgorithm;
}
/**
 * Certificate Manager Component implementing Component API Contract v1.0
 */
export declare class CertificateManagerComponent extends Component {
    private certificate?;
    private hostedZone?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create SSL/TLS certificate with compliance hardening
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
     * Lookup hosted zone for DNS validation if required
     */
    private lookupHostedZoneIfNeeded;
    /**
     * Create the SSL/TLS certificate
     */
    private createCertificate;
    /**
     * Map key algorithm string to ACM KeyAlgorithm enum
     */
    private mapKeyAlgorithm;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Build certificate capability data shape
     */
    private buildCertificateCapability;
    /**
     * Configure CloudWatch observability for Certificate Manager
     */
    private configureObservabilityForCertificate;
}
