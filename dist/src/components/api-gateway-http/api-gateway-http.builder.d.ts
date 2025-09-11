/**
 * Configuration Builder for Modern HTTP API Gateway Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
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
        /** Allowed origins */
        allowOrigins?: string[];
        /** Allowed headers */
        allowHeaders?: string[];
        /** Allowed methods */
        allowMethods?: string[];
        /** Allow credentials */
        allowCredentials?: boolean;
        /** Max age for preflight requests */
        maxAge?: number;
        /** Expose headers */
        exposeHeaders?: string[];
    };
    /** Custom domain configuration */
    customDomain?: {
        /** Domain name */
        domainName: string;
        /** Certificate ARN or auto-generate */
        certificateArn?: string;
        /** Auto-generate certificate */
        autoGenerateCertificate?: boolean;
        /** Route 53 hosted zone ID for DNS */
        hostedZoneId?: string;
        /** Security policy */
        securityPolicy?: string;
        /** Endpoint type */
        endpointType?: 'EDGE' | 'REGIONAL';
    };
    /** Authentication and authorization */
    auth?: {
        /** JWT authorizers */
        jwt?: {
            /** JWT issuer URL */
            issuer: string;
            /** JWT audience */
            audience: string[];
            /** Identity sources */
            identitySource?: string[];
            /** JWT claims to validate */
            jwtConfiguration?: {
                /** Audience claim */
                audience?: string[];
                /** Issuer claim */
                issuer?: string;
            };
        }[];
        /** Lambda authorizers */
        lambda?: {
            /** Authorizer name */
            name: string;
            /** Lambda function ARN */
            functionArn: string;
            /** Authorizer type */
            type?: 'REQUEST' | 'TOKEN';
            /** Identity sources */
            identitySource?: string[];
            /** Result TTL in seconds */
            authorizerResultTtlInSeconds?: number;
            /** Enable simple responses */
            enableSimpleResponses?: boolean;
        }[];
    };
    /** Route configuration */
    routes?: {
        /** HTTP method */
        method: string;
        /** Route path */
        path: string;
        /** Integration configuration */
        integration: {
            /** Integration type */
            type: 'LAMBDA' | 'HTTP_PROXY' | 'AWS_PROXY' | 'MOCK';
            /** Target ARN or URI */
            target?: string;
            /** Integration method */
            integrationMethod?: string;
            /** Request parameters */
            requestParameters?: Record<string, string>;
            /** Request templates */
            requestTemplates?: Record<string, string>;
            /** Response parameters */
            responseParameters?: Record<string, Record<string, string>>;
            /** Timeout in milliseconds */
            timeoutInMillis?: number;
            /** Connection type */
            connectionType?: 'INTERNET' | 'VPC_LINK';
            /** Connection ID for VPC Link */
            connectionId?: string;
        };
        /** Authorizer reference */
        authorizerId?: string;
        /** Authorization scopes */
        authorizationScopes?: string[];
        /** API key required */
        apiKeyRequired?: boolean;
        /** Request validator */
        requestValidator?: string;
        /** Request models */
        requestModels?: Record<string, string>;
    }[];
    /** Throttling configuration */
    throttling?: {
        /** Rate limit (requests per second) */
        rateLimit?: number;
        /** Burst limit */
        burstLimit?: number;
    };
    /** Access logging configuration */
    accessLogging?: {
        /** Enable access logging */
        enabled?: boolean;
        /** CloudWatch log group name */
        logGroupName?: string;
        /** Log retention in days */
        retentionInDays?: number;
        /** Log format */
        format?: string;
        /** Include execution data */
        includeExecutionData?: boolean;
        /** Include request/response data */
        includeRequestResponseData?: boolean;
    };
    /** Monitoring and observability */
    monitoring?: {
        /** Enable detailed metrics */
        detailedMetrics?: boolean;
        /** Enable X-Ray tracing */
        tracingEnabled?: boolean;
        /** Custom metrics */
        customMetrics?: {
            /** Metric name */
            name: string;
            /** Metric namespace */
            namespace?: string;
            /** Dimensions */
            dimensions?: Record<string, string>;
        }[];
        /** CloudWatch alarms */
        alarms?: {
            /** 4xx error rate threshold */
            errorRate4xx?: number;
            /** 5xx error rate threshold */
            errorRate5xx?: number;
            /** High latency threshold (ms) */
            highLatency?: number;
            /** Low throughput threshold */
            lowThroughput?: number;
        };
    };
    /** VPC configuration for private APIs */
    vpc?: {
        /** VPC Link ID */
        vpcLinkId?: string;
        /** Create new VPC Link */
        createVpcLink?: boolean;
        /** VPC Link configuration */
        vpcLinkConfig?: {
            /** VPC Link name */
            name: string;
            /** Target network load balancer ARNs */
            targets: string[];
            /** Security group IDs */
            securityGroupIds?: string[];
            /** Subnet IDs */
            subnetIds?: string[];
        };
    };
    /** WebSocket specific configuration */
    websocket?: {
        /** Connect route integration */
        connectRoute?: {
            /** Integration type */
            integrationType: 'LAMBDA' | 'HTTP_PROXY' | 'AWS_PROXY';
            /** Integration target */
            target: string;
        };
        /** Disconnect route integration */
        disconnectRoute?: {
            /** Integration type */
            integrationType: 'LAMBDA' | 'HTTP_PROXY' | 'AWS_PROXY';
            /** Integration target */
            target: string;
        };
        /** Default route integration */
        defaultRoute?: {
            /** Integration type */
            integrationType: 'LAMBDA' | 'HTTP_PROXY' | 'AWS_PROXY';
            /** Integration target */
            target: string;
        };
        /** Custom routes */
        customRoutes?: {
            /** Route key */
            routeKey: string;
            /** Integration type */
            integrationType: 'LAMBDA' | 'HTTP_PROXY' | 'AWS_PROXY';
            /** Integration target */
            target: string;
        }[];
    };
    /** API Gateway specific settings */
    apiSettings?: {
        /** Disable execute API endpoint */
        disableExecuteApiEndpoint?: boolean;
        /** API key source */
        apiKeySource?: 'HEADER' | 'AUTHORIZER';
        /** Binary media types */
        binaryMediaTypes?: string[];
        /** Minimum compression size */
        minimumCompressionSize?: number;
    };
    /** Resource policy for API access control */
    resourcePolicy?: {
        /** Policy document */
        document?: any;
        /** Allow from specific VPCs */
        allowFromVpcs?: string[];
        /** Allow from specific IP ranges */
        allowFromIpRanges?: string[];
        /** Deny from specific IP ranges */
        denyFromIpRanges?: string[];
    };
}
/**
 * JSON Schema for API Gateway HTTP configuration validation
 */
export declare const API_GATEWAY_HTTP_CONFIG_SCHEMA: {
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
 * ConfigBuilder for API Gateway HTTP component
 *
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config)
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export declare class ApiGatewayHttpConfigBuilder extends ConfigBuilder<ApiGatewayHttpConfig> {
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    protected getHardcodedFallbacks(): Partial<ApiGatewayHttpConfig>;
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations
     */
    protected getComplianceFrameworkDefaults(): Partial<ApiGatewayHttpConfig>;
    /**
     * Get the JSON Schema for validation
     */
    getSchema(): any;
}
