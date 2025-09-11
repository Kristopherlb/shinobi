/**
 * Creator for Static Website Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
import { Construct } from 'constructs';
import { ComponentSpec, ComponentContext, IComponentCreator } from '../../../src/platform/contracts/component-interfaces';
import { StaticWebsiteComponent } from './static-website.component';
/**
 * Creator class for Static Website component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export declare class StaticWebsiteCreator implements IComponentCreator {
    /**
     * Component type identifier
     */
    readonly componentType = "static-website";
    /**
     * Component display name
     */
    readonly displayName = "Static Website";
    /**
     * Component description
     */
    readonly description = "Static website hosting with S3 and CloudFront CDN for global performance with compliance-aware configuration";
    /**
     * Component category for organization
     */
    readonly category = "hosting";
    /**
     * AWS service this component manages
     */
    readonly awsService = "S3, CloudFront";
    /**
     * Component tags for discovery
     */
    readonly tags: string[];
    /**
     * JSON Schema for component configuration validation
     */
    readonly configSchema: {
        type: string;
        title: string;
        description: string;
        properties: {
            websiteName: {
                type: string;
                description: string;
                pattern: string;
                maxLength: number;
            };
            domain: {
                type: string;
                description: string;
                properties: {
                    domainName: {
                        type: string;
                        description: string;
                    };
                    alternativeDomainNames: {
                        type: string;
                        description: string;
                        items: {
                            type: string;
                        };
                        default: never[];
                    };
                    certificateArn: {
                        type: string;
                        description: string;
                    };
                    hostedZoneId: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
            bucket: {
                type: string;
                description: string;
                properties: {
                    indexDocument: {
                        type: string;
                        description: string;
                        default: string;
                    };
                    errorDocument: {
                        type: string;
                        description: string;
                        default: string;
                    };
                    versioning: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    accessLogging: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                };
                additionalProperties: boolean;
                default: {
                    indexDocument: string;
                    errorDocument: string;
                    versioning: boolean;
                    accessLogging: boolean;
                };
            };
            distribution: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    enableLogging: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    logFilePrefix: {
                        type: string;
                        description: string;
                        default: string;
                    };
                };
                additionalProperties: boolean;
                default: {
                    enabled: boolean;
                    enableLogging: boolean;
                    logFilePrefix: string;
                };
            };
            deployment: {
                type: string;
                description: string;
                properties: {
                    sourcePath: {
                        type: string;
                        description: string;
                    };
                    enabled: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    retainOnDelete: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                };
                additionalProperties: boolean;
                default: {
                    enabled: boolean;
                    retainOnDelete: boolean;
                };
            };
            security: {
                type: string;
                description: string;
                properties: {
                    blockPublicAccess: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    encryption: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    enforceHTTPS: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                };
                additionalProperties: boolean;
                default: {
                    blockPublicAccess: boolean;
                    encryption: boolean;
                    enforceHTTPS: boolean;
                };
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
    };
    /**
     * Factory method to create component instances
     */
    createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): StaticWebsiteComponent;
    /**
     * Validates component specification beyond JSON Schema validation
     */
    validateSpec(spec: ComponentSpec, context: ComponentContext): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Returns the capabilities this component provides when synthesized
     */
    getProvidedCapabilities(): string[];
    /**
     * Returns the capabilities this component requires from other components
     */
    getRequiredCapabilities(): string[];
    /**
     * Returns construct handles that will be registered by this component
     */
    getConstructHandles(): string[];
}
