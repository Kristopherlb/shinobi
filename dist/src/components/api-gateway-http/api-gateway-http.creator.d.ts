/**
 * Creator for Modern HTTP API Gateway Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
import { Construct } from 'constructs';
import { ComponentSpec, ComponentContext, IComponentCreator } from '../../../src/platform/contracts/component-interfaces';
import { ApiGatewayHttpComponent } from './api-gateway-http.component';
/**
 * Creator class for API Gateway HTTP component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export declare class ApiGatewayHttpCreator implements IComponentCreator {
    /**
     * Component type identifier
     */
    readonly componentType = "api-gateway-http";
    /**
     * Component display name
     */
    readonly displayName = "Modern HTTP API Gateway";
    /**
     * Component description
     */
    readonly description = "AWS API Gateway v2 HTTP API for modern, high-performance APIs with cost optimization";
    /**
     * Component category for organization
     */
    readonly category = "api";
    /**
     * Component tags for discovery
     */
    readonly tags: string[];
    /**
     * JSON Schema for component configuration validation
     */
    readonly configSchema: {
        type: string;
        properties: {
            apiName: {
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
            protocolType: {
                type: string;
                enum: string[];
                default: string;
                description: string;
            };
            cors: {
                type: string;
                description: string;
                properties: {
                    allowOrigins: {
                        type: string;
                        items: {
                            type: string;
                        };
                        description: string;
                    };
                    allowHeaders: {
                        type: string;
                        items: {
                            type: string;
                        };
                        description: string;
                    };
                    allowMethods: {
                        type: string;
                        items: {
                            type: string;
                            enum: string[];
                        };
                        description: string;
                    };
                    allowCredentials: {
                        type: string;
                        description: string;
                    };
                    maxAge: {
                        type: string;
                        minimum: number;
                        maximum: number;
                        description: string;
                    };
                    exposeHeaders: {
                        type: string;
                        items: {
                            type: string;
                        };
                        description: string;
                    };
                };
                additionalProperties: boolean;
            };
            customDomain: {
                type: string;
                description: string;
                properties: {
                    domainName: {
                        type: string;
                        description: string;
                        pattern: string;
                    };
                    certificateArn: {
                        type: string;
                        description: string;
                    };
                    autoGenerateCertificate: {
                        type: string;
                        default: boolean;
                        description: string;
                    };
                    hostedZoneId: {
                        type: string;
                        description: string;
                    };
                    securityPolicy: {
                        type: string;
                        enum: string[];
                        default: string;
                        description: string;
                    };
                    endpointType: {
                        type: string;
                        enum: string[];
                        default: string;
                        description: string;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
            throttling: {
                type: string;
                description: string;
                properties: {
                    rateLimit: {
                        type: string;
                        minimum: number;
                        description: string;
                    };
                    burstLimit: {
                        type: string;
                        minimum: number;
                        description: string;
                    };
                };
                additionalProperties: boolean;
            };
            accessLogging: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        default: boolean;
                        description: string;
                    };
                    logGroupName: {
                        type: string;
                        description: string;
                    };
                    retentionInDays: {
                        type: string;
                        enum: number[];
                        description: string;
                    };
                    format: {
                        type: string;
                        description: string;
                    };
                };
                additionalProperties: boolean;
            };
            monitoring: {
                type: string;
                description: string;
                properties: {
                    detailedMetrics: {
                        type: string;
                        default: boolean;
                        description: string;
                    };
                    tracingEnabled: {
                        type: string;
                        default: boolean;
                        description: string;
                    };
                };
                additionalProperties: boolean;
            };
        };
        additionalProperties: boolean;
    };
    /**
     * Factory method to create component instances
     *
     * @param scope - CDK construct scope
     * @param spec - Component specification from service manifest
     * @param context - Service context (environment, compliance, etc.)
     * @returns New component instance
     */
    createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): ApiGatewayHttpComponent;
    /**
     * Validates component specification beyond JSON Schema validation
     *
     * Performs advanced validation that cannot be expressed in JSON Schema:
     * - Cross-field validation
     * - Business logic validation
     * - Security policy compliance
     * - Resource naming conflicts
     *
     * @param spec - Component specification to validate
     * @param context - Service context for validation
     * @returns Validation result with errors if any
     */
    validateSpec(spec: ComponentSpec, context: ComponentContext): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Returns the capabilities this component provides when synthesized
     *
     * These capabilities can be referenced by other components for binding
     * and integration purposes.
     */
    getProvidedCapabilities(): string[];
    /**
     * Returns the capabilities this component requires from other components
     *
     * These are dependencies that must be satisfied for proper operation.
     */
    getRequiredCapabilities(): string[];
    /**
     * Returns construct handles that will be registered by this component
     *
     * These handles can be used in patches.ts for advanced customization.
     */
    getConstructHandles(): string[];
}
