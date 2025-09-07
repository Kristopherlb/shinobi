/**
 * Lambda Worker Component
 *
 * A Lambda function for asynchronous background processing workloads.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for Lambda Worker component
 */
export interface LambdaWorkerConfig {
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
    /** Reserved concurrency */
    reservedConcurrency?: number;
    /** Dead letter queue configuration */
    deadLetterQueue?: {
        enabled: boolean;
        maxReceiveCount?: number;
    };
    /** VPC configuration for FedRAMP deployments */
    vpc?: {
        vpcId?: string;
        subnetIds?: string[];
        securityGroupIds?: string[];
    };
    /** Encryption configuration */
    encryption?: {
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
 * Configuration schema for Lambda Worker component
 */
export declare const LAMBDA_WORKER_CONFIG_SCHEMA: {
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
        reservedConcurrency: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
        };
        deadLetterQueue: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                maxReceiveCount: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                maxReceiveCount: number;
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
        deadLetterQueue: {
            enabled: boolean;
            maxReceiveCount: number;
        };
        security: {
            tools: {
                falco: boolean;
            };
        };
    };
};
/**
 * Configuration builder for Lambda Worker component
 */
export declare class LambdaWorkerConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<LambdaWorkerConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): LambdaWorkerConfig;
    /**
     * Synchronous version of environment interpolation resolution
     */
    private resolveEnvironmentInterpolationsSync;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for Lambda Worker
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
 * Lambda Worker Component implementing Component API Contract v1.0
 */
export declare class LambdaWorkerComponent extends Component {
    private lambdaFunction?;
    private kmsKey?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create Lambda function for background processing
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
     * Helper methods for compliance decisions
     */
    private shouldUseCustomerManagedKey;
    private getLambdaRuntime;
    /**
     * Configure OpenTelemetry observability for the Lambda function
     */
    private configureObservabilityForLambda;
    /**
     * Add OpenTelemetry instrumentation layer based on Lambda runtime
     */
    private addOtelInstrumentationLayer;
    /**
     * Get OpenTelemetry layer ARN for specific runtime
     */
    private getOtelLayerArn;
}
//# sourceMappingURL=lambda-worker.component.d.ts.map