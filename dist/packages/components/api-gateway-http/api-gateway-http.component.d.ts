/**
 * Modern HTTP API Gateway Component implementing Component API Contract v1.0
 *
 * AWS API Gateway v2 (HTTP API) for modern, high-performance APIs with cost optimization:
 * - Up to 70% lower cost than REST API Gateway
 * - 60% lower latency for better performance
 * - Native JWT authentication and OIDC integration
 * - WebSocket support for real-time communication
 * - VPC Link support for private integrations
 * - Streamlined configuration for microservices
 *
 * Use this for modern microservices, serverless APIs, and cost-sensitive applications.
 * For complex enterprise features, use api-gateway-rest instead.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
import { ConfigBuilder } from '../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for Modern HTTP API Gateway component
 */
export interface ApiGatewayHttpConfig {
    /** API name (optional, will be auto-generated) */
    apiName?: string;
    /** API description */
    description?: string;
    /** Protocol type */
    protocolType?: 'HTTP' | 'WEBSOCKET';
    /** CORS configuration */
    cors?: {
        /** Allow credentials */
        allowCredentials?: boolean;
        /** Allow headers */
        allowHeaders?: string[];
        /** Allow methods */
        allowMethods?: string[];
        /** Allow origins */
        allowOrigins?: string[];
        /** Expose headers */
        exposeHeaders?: string[];
        /** Max age */
        maxAge?: number;
    };
    /** Custom domain configuration */
    domainName?: {
        /** Domain name */
        domainName: string;
        /** Certificate ARN */
        certificateArn?: string;
        /** Hosted zone ID */
        hostedZoneId?: string;
        /** Base path mappings */
        basePath?: string;
    };
    /** Default route settings */
    defaultRoute?: {
        /** Enable default route */
        enabled?: boolean;
        /** Integration type */
        integration?: {
            type: 'HTTP_PROXY' | 'AWS_PROXY' | 'MOCK';
            /** Target URI for HTTP_PROXY */
            uri?: string;
            /** Lambda function ARN for AWS_PROXY */
            lambdaFunctionArn?: string;
        };
    };
    /** Route configurations */
    routes?: Array<{
        /** Route key (e.g., 'GET /users', 'POST /orders') */
        routeKey: string;
        /** Integration configuration */
        integration: {
            type: 'HTTP_PROXY' | 'AWS_PROXY' | 'MOCK';
            /** Target URI for HTTP_PROXY */
            uri?: string;
            /** Lambda function ARN for AWS_PROXY */
            lambdaFunctionArn?: string;
            /** HTTP method for proxy */
            httpMethod?: string;
            /** Connection type */
            connectionType?: 'INTERNET' | 'VPC_LINK';
            /** VPC Link ID */
            vpcLinkId?: string;
        };
        /** Authorization configuration */
        authorization?: {
            /** Authorization type */
            authorizationType?: 'NONE' | 'AWS_IAM' | 'JWT';
            /** JWT authorizer configuration */
            jwtConfiguration?: {
                /** JWT issuer */
                issuer: string;
                /** JWT audience */
                audience?: string[];
            };
        };
    }>;
    /** Throttling configuration */
    throttling?: {
        /** Rate limit */
        rateLimit?: number;
        /** Burst limit */
        burstLimit?: number;
    };
    /** Access logging configuration */
    accessLogging?: {
        /** Enable access logging */
        enabled?: boolean;
        /** CloudWatch log group ARN */
        destinationArn?: string;
        /** Log format */
        format?: string;
    };
    /** Default stage configuration */
    defaultStage?: {
        /** Stage name */
        stageName?: string;
        /** Auto deploy */
        autoDeploy?: boolean;
        /** Throttling settings */
        throttling?: {
            rateLimit?: number;
            burstLimit?: number;
        };
    };
    /** Tags for the API */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for Modern HTTP API Gateway component
 */
export declare const API_GATEWAY_HTTP_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        apiName: {
            type: string;
            description: string;
            maxLength: number;
        };
        description: {
            type: string;
            description: string;
            maxLength: number;
        };
        protocolType: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        cors: {
            type: string;
            description: string;
            properties: {
                allowCredentials: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                allowHeaders: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                    };
                    default: string[];
                };
                allowMethods: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                    };
                    default: string[];
                };
                allowOrigins: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                    };
                    default: string[];
                };
                exposeHeaders: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                    };
                    default: never[];
                };
                maxAge: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
        };
        domainName: {
            type: string;
            description: string;
            properties: {
                domainName: {
                    type: string;
                    description: string;
                };
                certificateArn: {
                    type: string;
                    description: string;
                };
                hostedZoneId: {
                    type: string;
                    description: string;
                };
                basePath: {
                    type: string;
                    description: string;
                    default: string;
                };
            };
            required: string[];
            additionalProperties: boolean;
        };
        routes: {
            type: string;
            description: string;
            items: {
                type: string;
                properties: {
                    routeKey: {
                        type: string;
                        description: string;
                    };
                    integration: {
                        type: string;
                        properties: {
                            type: {
                                type: string;
                                enum: string[];
                            };
                            uri: {
                                type: string;
                                description: string;
                            };
                            lambdaFunctionArn: {
                                type: string;
                                description: string;
                            };
                            httpMethod: {
                                type: string;
                                description: string;
                            };
                            connectionType: {
                                type: string;
                                enum: string[];
                                default: string;
                            };
                            vpcLinkId: {
                                type: string;
                                description: string;
                            };
                        };
                        required: string[];
                        additionalProperties: boolean;
                    };
                    authorization: {
                        type: string;
                        properties: {
                            authorizationType: {
                                type: string;
                                enum: string[];
                                default: string;
                            };
                            jwtConfiguration: {
                                type: string;
                                properties: {
                                    issuer: {
                                        type: string;
                                        description: string;
                                    };
                                    audience: {
                                        type: string;
                                        description: string;
                                        items: {
                                            type: string;
                                        };
                                    };
                                };
                                required: string[];
                                additionalProperties: boolean;
                            };
                        };
                        additionalProperties: boolean;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
            default: never[];
        };
        throttling: {
            type: string;
            description: string;
            properties: {
                rateLimit: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                burstLimit: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
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
                    description: string;
                    default: boolean;
                };
                destinationArn: {
                    type: string;
                    description: string;
                };
                format: {
                    type: string;
                    description: string;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
            };
        };
        defaultStage: {
            type: string;
            description: string;
            properties: {
                stageName: {
                    type: string;
                    description: string;
                    default: string;
                };
                autoDeploy: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                throttling: {
                    type: string;
                    properties: {
                        rateLimit: {
                            type: string;
                            minimum: number;
                            maximum: number;
                        };
                        burstLimit: {
                            type: string;
                            minimum: number;
                            maximum: number;
                        };
                    };
                    additionalProperties: boolean;
                };
            };
            additionalProperties: boolean;
            default: {
                stageName: string;
                autoDeploy: boolean;
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
    defaults: {
        protocolType: string;
        routes: never[];
        accessLogging: {
            enabled: boolean;
        };
        defaultStage: {
            stageName: string;
            autoDeploy: boolean;
        };
        tags: {};
    };
};
/**
 * ConfigBuilder for Modern HTTP API Gateway component
 */
export declare class ApiGatewayHttpConfigBuilder extends ConfigBuilder<ApiGatewayHttpConfig> {
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
   * Builds the final configuration using the centralized 5-layer precedence engine
   */
    build(): Promise<ApiGatewayHttpConfig>;
    /**
     * Component-specific hardcoded fallbacks - implements Platform Configuration Standard
     */
    protected getHardcodedFallbacks(): ApiGatewayHttpConfig;
}
/**
 * Modern HTTP API Gateway Component implementing Component API Contract v1.0
 */
export declare class ApiGatewayHttpComponent extends BaseComponent {
    private httpApi?;
    private domainName?;
    private stage?;
    private accessLogGroup?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    synth(): void;
    getCapabilities(): ComponentCapabilities;
    getType(): string;
    private createAccessLogGroupIfNeeded;
    private createHttpApi;
    private mapCorsMethods;
    private createCustomDomainIfNeeded;
    private createRoutes;
    private createIntegration;
    private mapHttpMethod;
    private createAuthorizerIfNeeded;
    private createDefaultStage;
    private buildStageThrottling;
    private createDnsRecordsIfNeeded;
    private buildApiName;
    private getLogRetention;
    private getLogRemovalPolicy;
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    private buildApiCapability;
    private configureObservabilityForApi;
}
