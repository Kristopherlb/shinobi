/**
 * Lambda API Component
 *
 * A Lambda function for synchronous API workloads with API Gateway integration.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for Lambda API component
 */
export interface LambdaApiConfig {
    /** Lambda function handler (required) */
    handler: string;
    /** Runtime environment */
    runtime?: string;
    /** Memory allocation in MB */
    memory?: number;
    /** Timeout in seconds */
    timeout?: number;
    /** Code path for Lambda function */
    codePath?: string;
    /** Environment variables */
    environmentVariables?: Record<string, string>;
    /** API Gateway configuration */
    api?: {
        /** API name */
        name?: string;
        /** CORS configuration */
        cors?: boolean;
        /** API key required */
        apiKeyRequired?: boolean;
    };
    /** VPC configuration for FedRAMP deployments */
    vpc?: {
        /** VPC ID */
        vpcId?: string;
        /** Subnet IDs */
        subnetIds?: string[];
        /** Security group IDs */
        securityGroupIds?: string[];
    };
    /** Encryption configuration */
    encryption?: {
        /** KMS key ARN for environment variables */
        kmsKeyArn?: string;
    };
    /** Security tooling configuration */
    security?: {
        tools?: {
            falco?: boolean;
        };
    };
}
/**
 * Configuration schema for Lambda API component
 */
export declare const LAMBDA_API_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    required: string[];
    properties: {
        handler: {
            type: string;
            description: string;
            pattern: string;
        };
        runtime: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        memory: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        timeout: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        codePath: {
            type: string;
            description: string;
            default: string;
        };
        environmentVariables: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
            };
            default: {};
        };
        api: {
            type: string;
            description: string;
            properties: {
                name: {
                    type: string;
                    description: string;
                };
                cors: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                apiKeyRequired: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
            default: {
                cors: boolean;
                apiKeyRequired: boolean;
            };
        };
        vpc: {
            type: string;
            description: string;
            properties: {
                vpcId: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                subnetIds: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        pattern: string;
                    };
                    maxItems: number;
                };
                securityGroupIds: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        pattern: string;
                    };
                    maxItems: number;
                };
            };
            additionalProperties: boolean;
        };
        encryption: {
            type: string;
            description: string;
            properties: {
                kmsKeyArn: {
                    type: string;
                    description: string;
                    pattern: string;
                };
            };
            additionalProperties: boolean;
        };
        security: {
            type: string;
            description: string;
            properties: {
                tools: {
                    type: string;
                    description: string;
                    properties: {
                        falco: {
                            type: string;
                            description: string;
                            default: boolean;
                        };
                    };
                    additionalProperties: boolean;
                    default: {
                        falco: boolean;
                    };
                };
            };
            additionalProperties: boolean;
            default: {
                tools: {
                    falco: boolean;
                };
            };
        };
    };
    additionalProperties: boolean;
    defaults: {
        runtime: string;
        memory: number;
        timeout: number;
        codePath: string;
        environmentVariables: {};
        api: {
            cors: boolean;
            apiKeyRequired: boolean;
        };
        security: {
            tools: {
                falco: boolean;
            };
        };
    };
};
/**
 * Configuration builder for Lambda API component
 */
export declare class LambdaApiConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<LambdaApiConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): LambdaApiConfig;
    /**
     * Synchronous version of environment interpolation resolution
     */
    private resolveEnvironmentInterpolationsSync;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for Lambda API
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default runtime based on compliance framework
     */
    private getDefaultRuntime;
    /**
     * Get default memory size based on compliance framework
     */
    private getDefaultMemorySize;
    /**
     * Get compliance-specific memory size
     */
    private getComplianceMemorySize;
    /**
     * Get default timeout based on compliance framework
     */
    private getDefaultTimeout;
    /**
     * Get compliance-specific timeout
     */
    private getComplianceTimeout;
}
/**
 * Lambda API Component implementing Component API Contract v1.0
 */
export declare class LambdaApiComponent extends Component {
    private lambdaFunction?;
    private api?;
    private kmsKey?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create Lambda function and API Gateway
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
     * Create KMS key for encryption if required by compliance framework
     */
    private createKmsKeyIfNeeded;
    /**
     * Create the Lambda function with compliance-specific configuration
     */
    private createLambdaFunction;
    /**
     * Create API Gateway REST API
     */
    private createApiGateway;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Attach Falco security monitoring layer
     */
    private attachFalcoLayer;
    /**
     * Build Lambda function capability data shape
     */
    private buildLambdaCapability;
    /**
     * Build API REST capability data shape
     */
    private buildApiCapability;
    /**
     * Helper methods for compliance decisions
     */
    private shouldUseCustomerManagedKey;
    private shouldEnableLambdaXRayTracing;
    private shouldDeployInVpc;
    private getLambdaRuntime;
    /**
     * Configure OpenTelemetry observability for Lambda function according to Platform Observability Standard
     */
    private configureObservabilityForLambda;
    /**
     * Add OpenTelemetry instrumentation layer based on Lambda runtime
     */
    private addOtelInstrumentationLayer;
    /**
     * Get architecture string for Lambda layer ARN
     */
    private getArchString;
}
//# sourceMappingURL=lambda-api.component.d.ts.map