/**
 * Enterprise REST API Gateway Component implementing Component API Contract v1.0
 *
 * AWS API Gateway v1 (REST API) for enterprise use cases with advanced features:
 * - Cognito User Pool authentication with scopes
 * - Request/response transformation and validation
 * - API key management and throttling
 * - WAF integration and enterprise security
 * - Full feature set with caching and SDK generation
 *
 * Use this for complex enterprise APIs requiring advanced authentication and transformation.
 * For simple, high-performance APIs, use api-gateway-http instead.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
import { ConfigBuilder } from '../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for Enterprise REST API Gateway component
 */
export interface ApiGatewayRestConfig {
    /** API name (optional, defaults to component name) */
    apiName?: string;
    /** API description */
    description?: string;
    /** API Gateway deployment stage */
    deploymentStage?: string;
    /** Domain configuration */
    domain?: {
        domainName?: string;
        certificateArn?: string;
        basePath?: string;
    };
    /** CORS configuration */
    cors?: {
        allowOrigins?: string[];
        allowMethods?: string[];
        allowHeaders?: string[];
        allowCredentials?: boolean;
    };
    /** Authentication configuration */
    authentication?: {
        cognito?: {
            userPoolId?: string;
            userPoolArn?: string;
            scopes?: string[];
        };
        apiKey?: {
            required?: boolean;
            keyName?: string;
        };
    };
    /** Tracing configuration */
    tracing?: {
        xrayEnabled?: boolean;
    };
    /** Throttling configuration */
    throttling?: {
        burstLimit?: number;
        rateLimit?: number;
    };
    /** WAF association */
    waf?: {
        webAclArn?: string;
    };
    /** Tags for the API */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for Enterprise REST API Gateway configuration
 */
export declare const API_GATEWAY_REST_CONFIG_SCHEMA: {
    type: string;
    properties: {
        apiName: {
            type: string;
            pattern: string;
            maxLength: number;
        };
        description: {
            type: string;
        };
        deploymentStage: {
            type: string;
            pattern: string;
            maxLength: number;
        };
        domain: {
            type: string;
            properties: {
                domainName: {
                    type: string;
                };
                certificateArn: {
                    type: string;
                };
                basePath: {
                    type: string;
                };
            };
        };
        cors: {
            type: string;
            properties: {
                allowOrigins: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                allowMethods: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                allowHeaders: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                allowCredentials: {
                    type: string;
                };
            };
        };
        authentication: {
            type: string;
            properties: {
                cognito: {
                    type: string;
                    properties: {
                        userPoolId: {
                            type: string;
                        };
                        userPoolArn: {
                            type: string;
                        };
                        scopes: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                    };
                };
                apiKey: {
                    type: string;
                    properties: {
                        required: {
                            type: string;
                        };
                        keyName: {
                            type: string;
                        };
                    };
                };
            };
        };
        tracing: {
            type: string;
            properties: {
                xrayEnabled: {
                    type: string;
                };
            };
        };
        throttling: {
            type: string;
            properties: {
                burstLimit: {
                    type: string;
                    minimum: number;
                };
                rateLimit: {
                    type: string;
                    minimum: number;
                };
            };
        };
        waf: {
            type: string;
            properties: {
                webAclArn: {
                    type: string;
                };
            };
        };
        tags: {
            type: string;
            additionalProperties: {
                type: string;
            };
        };
    };
    additionalProperties: boolean;
};
/**
 * ConfigBuilder for Enterprise REST API Gateway component
 */
export declare class ApiGatewayRestConfigBuilder extends ConfigBuilder<ApiGatewayRestConfig> {
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
   * Builds the final configuration using the centralized 5-layer precedence engine
   */
    build(): Promise<ApiGatewayRestConfig>;
    /**
     * Component-specific hardcoded fallbacks
     */
    protected getHardcodedFallbacks(): ApiGatewayRestConfig;
}
/**
 * Enterprise REST API Gateway Component implementing Component API Contract v1.0
 */
export declare class ApiGatewayRestComponent extends BaseComponent {
    private api?;
    private deployment?;
    private stage?;
    private authorizer?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create standalone API Gateway with advanced configuration
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
     * Create CloudWatch log group if logging is enabled
     */
    /**
     * Create API Gateway REST API
     */
    private createApiGateway;
    /**
     * Create Cognito User Pool authorizer if configured
     */
    private createCognitoAuthorizerIfNeeded;
    /**
     * Configure X-Ray tracing
     */
    private configureTracing;
    /**
     * Apply compliance hardening based on framework
     */
    private applyComplianceHardening;
    /**
     * Build API Gateway capability descriptor
     */
    private buildApiCapability;
}
