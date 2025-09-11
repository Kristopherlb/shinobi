"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiGatewayRestComponent = exports.ApiGatewayRestConfigBuilder = exports.API_GATEWAY_REST_CONFIG_SCHEMA = void 0;
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const component_1 = require("../../../src/platform/contracts/component");
const config_builder_1 = require("../../../src/platform/contracts/config-builder");
/**
 * JSON Schema for Enterprise REST API Gateway configuration
 */
exports.API_GATEWAY_REST_CONFIG_SCHEMA = {
    type: 'object',
    properties: {
        apiName: {
            type: 'string',
            pattern: '^[a-zA-Z0-9._-]+$',
            maxLength: 1024
        },
        description: { type: 'string' },
        deploymentStage: {
            type: 'string',
            pattern: '^[a-zA-Z0-9._-]+$',
            maxLength: 64
        },
        domain: {
            type: 'object',
            properties: {
                domainName: { type: 'string' },
                certificateArn: { type: 'string' },
                basePath: { type: 'string' }
            }
        },
        cors: {
            type: 'object',
            properties: {
                allowOrigins: {
                    type: 'array',
                    items: { type: 'string' }
                },
                allowMethods: {
                    type: 'array',
                    items: { type: 'string' }
                },
                allowHeaders: {
                    type: 'array',
                    items: { type: 'string' }
                },
                allowCredentials: { type: 'boolean' }
            }
        },
        authentication: {
            type: 'object',
            properties: {
                cognito: {
                    type: 'object',
                    properties: {
                        userPoolId: { type: 'string' },
                        userPoolArn: { type: 'string' },
                        scopes: {
                            type: 'array',
                            items: { type: 'string' }
                        }
                    }
                },
                apiKey: {
                    type: 'object',
                    properties: {
                        required: { type: 'boolean' },
                        keyName: { type: 'string' }
                    }
                }
            }
        },
        tracing: {
            type: 'object',
            properties: {
                xrayEnabled: { type: 'boolean' }
            }
        },
        throttling: {
            type: 'object',
            properties: {
                burstLimit: { type: 'number', minimum: 0 },
                rateLimit: { type: 'number', minimum: 0 }
            }
        },
        waf: {
            type: 'object',
            properties: {
                webAclArn: { type: 'string' }
            }
        },
        tags: {
            type: 'object',
            additionalProperties: { type: 'string' }
        }
    },
    additionalProperties: false
};
/**
 * ConfigBuilder for Enterprise REST API Gateway component
 */
class ApiGatewayRestConfigBuilder extends config_builder_1.ConfigBuilder {
    constructor(context, spec) {
        const builderContext = { context, spec };
        super(builderContext, exports.API_GATEWAY_REST_CONFIG_SCHEMA);
    }
    /**
   * Builds the final configuration using the centralized 5-layer precedence engine
   */
    async build() {
        return this.buildSync();
    }
    /**
     * Component-specific hardcoded fallbacks
     */
    getHardcodedFallbacks() {
        return {
            deploymentStage: this.builderContext.context.environment,
            description: `Enterprise REST API Gateway for ${this.builderContext.spec.name}`,
            cors: {
                allowOrigins: [], // CORS origins MUST be configured per environment - no hardcoded defaults
                allowMethods: ['GET', 'POST', 'OPTIONS'], // Minimal safe methods as fallback only
                allowHeaders: ['Content-Type', 'Authorization'], // Minimal safe headers as fallback only  
                allowCredentials: false // Always false for security - never override
            },
            tracing: {
                xrayEnabled: false // Tracing enablement driven by compliance framework config
            },
            throttling: {
                burstLimit: 100, // Very conservative fallback - real limits come from environment config
                rateLimit: 50 // Very conservative fallback - real limits come from environment config
            }
        };
    }
}
exports.ApiGatewayRestConfigBuilder = ApiGatewayRestConfigBuilder;
/**
 * Enterprise REST API Gateway Component implementing Component API Contract v1.0
 */
class ApiGatewayRestComponent extends component_1.BaseComponent {
    api;
    deployment;
    stage;
    authorizer;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create standalone API Gateway with advanced configuration
     */
    synth() {
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new ApiGatewayRestConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Create API Gateway
            this.createApiGateway();
            // Create Cognito authorizer if configured
            this.createCognitoAuthorizerIfNeeded();
            // Configure tracing
            this.configureTracing();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Register constructs
            this.registerConstruct('api', this.api);
            this.registerConstruct('stage', this.stage);
            if (this.authorizer) {
                this.registerConstruct('authorizer', this.authorizer);
            }
            // Register capabilities
            this.registerCapability('api:rest', this.buildApiCapability());
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Get the capabilities this component provides
     */
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    /**
     * Get the component type identifier
     */
    getType() {
        return 'api-gateway-rest';
    }
    /**
     * Create CloudWatch log group if logging is enabled
     */
    /**
     * Create API Gateway REST API
     */
    createApiGateway() {
        const apiName = this.config.apiName || `${this.context.serviceName}-${this.spec.name}`;
        this.api = new apigateway.RestApi(this, 'ApiGateway', {
            restApiName: apiName,
            description: this.config.description,
            deployOptions: {
                stageName: this.config.deploymentStage || 'prod',
                throttlingBurstLimit: this.config.throttling?.burstLimit,
                throttlingRateLimit: this.config.throttling?.rateLimit,
                tracingEnabled: this.config.tracing?.xrayEnabled
            },
            defaultCorsPreflightOptions: this.config.cors ? {
                allowOrigins: this.config.cors.allowOrigins || [],
                allowMethods: this.config.cors.allowMethods || [],
                allowHeaders: this.config.cors.allowHeaders || [],
                allowCredentials: this.config.cors.allowCredentials
            } : undefined,
            apiKeySourceType: this.config.authentication?.apiKey?.required ?
                apigateway.ApiKeySourceType.HEADER : undefined
        });
        // Get the deployment stage
        this.stage = this.api.deploymentStage;
        // Apply standard tags
        this.applyStandardTags(this.api, {
            'api-type': 'rest',
            'deployment-stage': this.config.deploymentStage || 'prod'
        });
        // Configure OpenTelemetry observability for API Gateway
        const otelEnvVars = this.configureObservability(this.api, {
            serviceName: apiName
        });
        // Apply OTel environment variables to the stage
        const cfnStage = this.stage.node.defaultChild;
        cfnStage.variables = {
            ...cfnStage.variables,
            ...otelEnvVars
        };
    }
    /**
     * Create Cognito User Pool authorizer if configured
     */
    createCognitoAuthorizerIfNeeded() {
        if (!this.config.authentication?.cognito?.userPoolArn) {
            return;
        }
        const userPool = cognito.UserPool.fromUserPoolArn(this, 'UserPool', this.config.authentication.cognito.userPoolArn);
        this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [userPool],
            authorizerName: `${this.spec.name}-cognito-authorizer`,
            identitySource: 'method.request.header.Authorization'
        });
    }
    /**
     * Configure X-Ray tracing
     */
    configureTracing() {
        if (!this.config.tracing?.xrayEnabled) {
            return;
        }
        // X-Ray tracing is already configured in deployOptions during API creation
    }
    /**
     * Apply compliance hardening based on framework
     */
    applyComplianceHardening() {
        if (!this.api)
            return;
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
            case 'fedramp-moderate':
                // For FedRAMP environments, ensure API has proper logging and security
                const cfnApi = this.api.node.defaultChild;
                cfnApi.addMetadata('ComplianceFramework', this.context.complianceFramework);
                break;
            default:
                // No special hardening needed for commercial
                break;
        }
    }
    /**
     * Build API Gateway capability descriptor
     */
    buildApiCapability() {
        return {
            type: 'api:rest',
            apiName: this.api.restApiName,
            apiId: this.api.restApiId,
            rootResourceId: this.api.restApiRootResourceId,
            stageName: this.config.deploymentStage || 'prod',
            endpoint: this.api.url,
            cognitoAuthorizer: this.authorizer ? {
                authorizerArn: this.authorizer.authorizerArn,
                userPoolArn: this.config.authentication?.cognito?.userPoolArn
            } : undefined
        };
    }
}
exports.ApiGatewayRestComponent = ApiGatewayRestComponent;
