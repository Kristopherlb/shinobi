"use strict";
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
exports.ApiGatewayHttpComponent = exports.ApiGatewayHttpConfigBuilder = exports.API_GATEWAY_HTTP_CONFIG_SCHEMA = void 0;
const apigatewayv2 = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const authorizers = __importStar(require("aws-cdk-lib/aws-apigatewayv2-authorizers"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const certificatemanager = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const cdk = __importStar(require("aws-cdk-lib"));
const component_1 = require("../../../src/platform/contracts/component");
const config_builder_1 = require("../../../src/platform/contracts/config-builder");
/**
 * Configuration schema for Modern HTTP API Gateway component
 */
exports.API_GATEWAY_HTTP_CONFIG_SCHEMA = {
    type: 'object',
    title: 'HTTP API Gateway Configuration',
    description: 'Configuration for creating a modern HTTP API Gateway with enhanced performance and cost optimization',
    properties: {
        apiName: {
            type: 'string',
            description: 'Name of the API (will be auto-generated if not provided)',
            maxLength: 128
        },
        description: {
            type: 'string',
            description: 'Description of the API',
            maxLength: 1024
        },
        protocolType: {
            type: 'string',
            description: 'Protocol type for the API',
            enum: ['HTTP', 'WEBSOCKET'],
            default: 'HTTP'
        },
        cors: {
            type: 'object',
            description: 'CORS configuration',
            properties: {
                allowCredentials: {
                    type: 'boolean',
                    description: 'Allow credentials',
                    default: false
                },
                allowHeaders: {
                    type: 'array',
                    description: 'Allowed headers',
                    items: { type: 'string' },
                    default: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key']
                },
                allowMethods: {
                    type: 'array',
                    description: 'Allowed methods',
                    items: { type: 'string' },
                    default: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
                },
                allowOrigins: {
                    type: 'array',
                    description: 'Allowed origins',
                    items: { type: 'string' },
                    default: ['*']
                },
                exposeHeaders: {
                    type: 'array',
                    description: 'Exposed headers',
                    items: { type: 'string' },
                    default: []
                },
                maxAge: {
                    type: 'number',
                    description: 'Max age in seconds',
                    minimum: 0,
                    maximum: 86400,
                    default: 86400
                }
            },
            additionalProperties: false
        },
        domainName: {
            type: 'object',
            description: 'Custom domain configuration',
            properties: {
                domainName: {
                    type: 'string',
                    description: 'Custom domain name'
                },
                certificateArn: {
                    type: 'string',
                    description: 'ACM certificate ARN'
                },
                hostedZoneId: {
                    type: 'string',
                    description: 'Route53 hosted zone ID'
                },
                basePath: {
                    type: 'string',
                    description: 'Base path for API mapping',
                    default: ''
                }
            },
            required: ['domainName'],
            additionalProperties: false
        },
        routes: {
            type: 'array',
            description: 'Route configurations',
            items: {
                type: 'object',
                properties: {
                    routeKey: {
                        type: 'string',
                        description: 'Route key (e.g., GET /users)'
                    },
                    integration: {
                        type: 'object',
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['HTTP_PROXY', 'AWS_PROXY', 'MOCK']
                            },
                            uri: {
                                type: 'string',
                                description: 'Target URI for HTTP_PROXY'
                            },
                            lambdaFunctionArn: {
                                type: 'string',
                                description: 'Lambda function ARN for AWS_PROXY'
                            },
                            httpMethod: {
                                type: 'string',
                                description: 'HTTP method for proxy integration'
                            },
                            connectionType: {
                                type: 'string',
                                enum: ['INTERNET', 'VPC_LINK'],
                                default: 'INTERNET'
                            },
                            vpcLinkId: {
                                type: 'string',
                                description: 'VPC Link ID for VPC_LINK connection'
                            }
                        },
                        required: ['type'],
                        additionalProperties: false
                    },
                    authorization: {
                        type: 'object',
                        properties: {
                            authorizationType: {
                                type: 'string',
                                enum: ['NONE', 'AWS_IAM', 'JWT'],
                                default: 'NONE'
                            },
                            jwtConfiguration: {
                                type: 'object',
                                properties: {
                                    issuer: {
                                        type: 'string',
                                        description: 'JWT issuer URL'
                                    },
                                    audience: {
                                        type: 'array',
                                        description: 'JWT audience',
                                        items: { type: 'string' }
                                    }
                                },
                                required: ['issuer'],
                                additionalProperties: false
                            }
                        },
                        additionalProperties: false
                    }
                },
                required: ['routeKey', 'integration'],
                additionalProperties: false
            },
            default: []
        },
        throttling: {
            type: 'object',
            description: 'API-level throttling configuration',
            properties: {
                rateLimit: {
                    type: 'number',
                    description: 'Rate limit (requests per second)',
                    minimum: 1,
                    maximum: 10000,
                    default: 1000
                },
                burstLimit: {
                    type: 'number',
                    description: 'Burst limit',
                    minimum: 1,
                    maximum: 5000,
                    default: 2000
                }
            },
            additionalProperties: false
        },
        accessLogging: {
            type: 'object',
            description: 'Access logging configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable access logging',
                    default: false
                },
                destinationArn: {
                    type: 'string',
                    description: 'CloudWatch log group ARN'
                },
                format: {
                    type: 'string',
                    description: 'Log format string'
                }
            },
            additionalProperties: false,
            default: { enabled: false }
        },
        defaultStage: {
            type: 'object',
            description: 'Default stage configuration',
            properties: {
                stageName: {
                    type: 'string',
                    description: 'Stage name',
                    default: '$default'
                },
                autoDeploy: {
                    type: 'boolean',
                    description: 'Auto deploy changes',
                    default: true
                },
                throttling: {
                    type: 'object',
                    properties: {
                        rateLimit: {
                            type: 'number',
                            minimum: 1,
                            maximum: 10000
                        },
                        burstLimit: {
                            type: 'number',
                            minimum: 1,
                            maximum: 5000
                        }
                    },
                    additionalProperties: false
                }
            },
            additionalProperties: false,
            default: { stageName: '$default', autoDeploy: true }
        },
        tags: {
            type: 'object',
            description: 'Tags for the API',
            additionalProperties: { type: 'string' },
            default: {}
        }
    },
    additionalProperties: false,
    defaults: {
        protocolType: 'HTTP',
        routes: [],
        accessLogging: { enabled: false },
        defaultStage: { stageName: '$default', autoDeploy: true },
        tags: {}
    }
};
/**
 * ConfigBuilder for Modern HTTP API Gateway component
 */
class ApiGatewayHttpConfigBuilder extends config_builder_1.ConfigBuilder {
    constructor(context, spec) {
        const builderContext = { context, spec };
        super(builderContext, exports.API_GATEWAY_HTTP_CONFIG_SCHEMA);
    }
    /**
   * Builds the final configuration using the centralized 5-layer precedence engine
   */
    async build() {
        return this.buildSync();
    }
    /**
     * Component-specific hardcoded fallbacks - implements Platform Configuration Standard
     */
    getHardcodedFallbacks() {
        const framework = this.builderContext.context.complianceFramework;
        return {
            protocolType: 'HTTP',
            description: `Modern HTTP API Gateway for ${this.builderContext.spec.name}`,
            cors: {
                allowOrigins: [], // CORS origins MUST be configured per environment - no hardcoded defaults
                allowMethods: ['GET', 'POST', 'OPTIONS'], // Minimal safe methods as fallback only
                allowHeaders: ['Content-Type', 'Authorization'], // Minimal safe headers as fallback only
                allowCredentials: false // Always false for security - never override
            },
            throttling: {
                burstLimit: 100, // Very conservative fallback - real limits come from environment config
                rateLimit: 50 // Very conservative fallback - real limits come from environment config  
            },
            accessLogging: {
                enabled: framework !== 'commercial',
                format: JSON.stringify({
                    requestId: '$context.requestId',
                    ip: '$context.identity.sourceIp',
                    requestTime: '$context.requestTime',
                    httpMethod: '$context.httpMethod',
                    routeKey: '$context.routeKey',
                    status: '$context.status',
                    protocol: '$context.protocol',
                    responseLength: '$context.responseLength'
                })
            }
        };
    }
}
exports.ApiGatewayHttpConfigBuilder = ApiGatewayHttpConfigBuilder;
/**
 * Modern HTTP API Gateway Component implementing Component API Contract v1.0
 */
class ApiGatewayHttpComponent extends component_1.BaseComponent {
    httpApi;
    domainName;
    stage;
    accessLogGroup;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    synth() {
        try {
            // Build configuration using ConfigBuilder - follows Platform Configuration Standard
            const configBuilder = new ApiGatewayHttpConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Create HTTP API Gateway
            this.createAccessLogGroupIfNeeded();
            this.createHttpApi();
            this.createCustomDomainIfNeeded();
            this.createRoutes();
            this.createDefaultStage();
            this.createDnsRecordsIfNeeded();
            this.applyComplianceHardening();
            // Register constructs
            this.registerConstruct('httpApi', this.httpApi);
            if (this.domainName) {
                this.registerConstruct('domainName', this.domainName);
            }
            if (this.stage) {
                this.registerConstruct('stage', this.stage);
            }
            if (this.accessLogGroup) {
                this.registerConstruct('accessLogGroup', this.accessLogGroup);
            }
            // Register capabilities
            this.registerCapability('api:http-v2', this.buildApiCapability());
        }
        catch (error) {
            throw error;
        }
    }
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    getType() {
        return 'api-gateway-http';
    }
    createAccessLogGroupIfNeeded() {
        if (this.config.accessLogging?.enabled) {
            this.accessLogGroup = new logs.LogGroup(this, 'AccessLogGroup', {
                logGroupName: `/aws/apigateway/${this.buildApiName()}`,
                retention: this.getLogRetention(),
                removalPolicy: this.getLogRemovalPolicy()
            });
            this.applyStandardTags(this.accessLogGroup, {
                'log-type': 'api-access',
                'api': this.buildApiName(),
                'retention': this.getLogRetention().toString()
            });
        }
    }
    createHttpApi() {
        const apiProps = {
            apiName: this.buildApiName(),
            description: this.config.description,
            corsPreflight: this.config.cors ? {
                allowCredentials: this.config.cors.allowCredentials,
                allowHeaders: this.config.cors.allowHeaders,
                allowMethods: this.mapCorsMethods(this.config.cors.allowMethods || []),
                allowOrigins: this.config.cors.allowOrigins,
                exposeHeaders: this.config.cors.exposeHeaders,
                maxAge: this.config.cors.maxAge ? cdk.Duration.seconds(this.config.cors.maxAge) : undefined
            } : undefined
        };
        this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', apiProps);
        this.applyStandardTags(this.httpApi, {
            'api-name': this.buildApiName(),
            'protocol-type': this.config.protocolType,
            'cors-enabled': (!!this.config.cors).toString(),
            'access-logging': (this.config.accessLogging?.enabled || false).toString()
        });
        if (this.config.tags) {
            Object.entries(this.config.tags).forEach(([key, value]) => {
                cdk.Tags.of(this.httpApi).add(key, value);
            });
        }
        this.logResourceCreation('api-gateway-v2', this.buildApiName(), {
            apiName: this.buildApiName(),
            protocolType: this.config.protocolType,
            corsEnabled: !!this.config.cors
        });
    }
    mapCorsMethods(methods) {
        const methodMap = {
            'GET': apigatewayv2.CorsHttpMethod.GET,
            'POST': apigatewayv2.CorsHttpMethod.POST,
            'PUT': apigatewayv2.CorsHttpMethod.PUT,
            'DELETE': apigatewayv2.CorsHttpMethod.DELETE,
            'PATCH': apigatewayv2.CorsHttpMethod.PATCH,
            'HEAD': apigatewayv2.CorsHttpMethod.HEAD,
            'OPTIONS': apigatewayv2.CorsHttpMethod.OPTIONS,
            '*': apigatewayv2.CorsHttpMethod.ANY
        };
        return methods.map(method => methodMap[method.toUpperCase()]).filter(Boolean);
    }
    createCustomDomainIfNeeded() {
        if (!this.config.domainName || !this.config.domainName.certificateArn) {
            return;
        }
        const certificate = certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', this.config.domainName.certificateArn);
        this.domainName = new apigatewayv2.DomainName(this, 'DomainName', {
            domainName: this.config.domainName.domainName,
            certificate: certificate
        });
        this.applyStandardTags(this.domainName, {
            'domain-name': this.config.domainName.domainName,
            'api': this.buildApiName()
        });
    }
    createRoutes() {
        if (!this.config.routes || this.config.routes.length === 0) {
            return;
        }
        this.config.routes.forEach((routeConfig, index) => {
            const integration = this.createIntegration(routeConfig.integration);
            const authorizer = this.createAuthorizerIfNeeded(routeConfig.authorization);
            new apigatewayv2.HttpRoute(this, `Route${index}`, {
                httpApi: this.httpApi,
                routeKey: apigatewayv2.HttpRouteKey.with(routeConfig.routeKey),
                integration: integration,
                authorizer: authorizer
            });
        });
    }
    createIntegration(integrationConfig) {
        switch (integrationConfig.type) {
            case 'HTTP_PROXY':
                return new integrations.HttpUrlIntegration('HttpProxyIntegration', integrationConfig.uri, {
                    method: this.mapHttpMethod(integrationConfig.httpMethod)
                });
            case 'AWS_PROXY':
                const lambdaFunction = lambda.Function.fromFunctionArn(this, `LambdaFunction${integrationConfig.lambdaFunctionArn}`, integrationConfig.lambdaFunctionArn);
                return new integrations.HttpLambdaIntegration('LambdaIntegration', lambdaFunction);
            case 'MOCK':
                return new integrations.HttpUrlIntegration('MockIntegration', 'http://mock.local');
            default:
                throw new Error(`Unsupported integration type: ${integrationConfig.type}`);
        }
    }
    mapHttpMethod(method) {
        if (!method)
            return undefined;
        const methodMap = {
            'GET': apigatewayv2.HttpMethod.GET,
            'POST': apigatewayv2.HttpMethod.POST,
            'PUT': apigatewayv2.HttpMethod.PUT,
            'DELETE': apigatewayv2.HttpMethod.DELETE,
            'PATCH': apigatewayv2.HttpMethod.PATCH,
            'HEAD': apigatewayv2.HttpMethod.HEAD,
            'OPTIONS': apigatewayv2.HttpMethod.OPTIONS
        };
        return methodMap[method.toUpperCase()];
    }
    createAuthorizerIfNeeded(authConfig) {
        if (!authConfig || authConfig.authorizationType === 'NONE') {
            return undefined;
        }
        switch (authConfig.authorizationType) {
            case 'AWS_IAM':
                return new authorizers.HttpIamAuthorizer();
            case 'JWT':
                if (!authConfig.jwtConfiguration) {
                    throw new Error('JWT configuration is required for JWT authorization');
                }
                return new authorizers.HttpJwtAuthorizer('JwtAuthorizer', authConfig.jwtConfiguration.issuer, {
                    jwtAudience: authConfig.jwtConfiguration.audience
                });
            default:
                return undefined;
        }
    }
    createDefaultStage() {
        if (!this.config.defaultStage) {
            return;
        }
        const stageProps = {
            httpApi: this.httpApi,
            stageName: this.config.defaultStage.stageName,
            autoDeploy: this.config.defaultStage.autoDeploy,
            throttle: this.buildStageThrottling()
        };
        // Note: API Gateway v2 HTTP API access logging is configured differently than REST API
        // It uses CloudWatch integration directly rather than stage-level properties
        this.stage = new apigatewayv2.HttpStage(this, 'Stage', stageProps);
        this.applyStandardTags(this.stage, {
            'stage-name': this.config.defaultStage.stageName,
            'auto-deploy': (this.config.defaultStage.autoDeploy || false).toString(),
            'throttling-enabled': (!!this.config.defaultStage.throttling).toString()
        });
        // Create API mapping for custom domain
        if (this.domainName) {
            new apigatewayv2.ApiMapping(this, 'ApiMapping', {
                api: this.httpApi,
                domainName: this.domainName,
                stage: this.stage,
                apiMappingKey: this.config.domainName?.basePath
            });
        }
    }
    buildStageThrottling() {
        const stageThrottling = this.config.defaultStage?.throttling || this.config.throttling;
        if (!stageThrottling) {
            return undefined;
        }
        return {
            rateLimit: stageThrottling.rateLimit,
            burstLimit: stageThrottling.burstLimit
        };
    }
    createDnsRecordsIfNeeded() {
        if (!this.config.domainName || !this.domainName || !this.config.domainName.hostedZoneId) {
            return;
        }
        const hostedZone = route53.HostedZone.fromHostedZoneId(this, 'HostedZone', this.config.domainName.hostedZoneId);
        new route53.ARecord(this, 'AliasRecord', {
            zone: hostedZone,
            recordName: this.config.domainName.domainName,
            target: route53.RecordTarget.fromAlias(new targets.ApiGatewayv2DomainProperties(this.domainName.regionalDomainName, this.domainName.regionalHostedZoneId))
        });
    }
    buildApiName() {
        if (this.config.apiName) {
            return this.config.apiName;
        }
        return `${this.context.serviceName}-${this.spec.name}`;
    }
    getLogRetention() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return logs.RetentionDays.TEN_YEARS;
            case 'fedramp-moderate':
                return logs.RetentionDays.ONE_YEAR;
            default:
                return logs.RetentionDays.THREE_MONTHS;
        }
    }
    getLogRemovalPolicy() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY;
    }
    applyComplianceHardening() {
        switch (this.context.complianceFramework) {
            case 'fedramp-moderate':
                this.applyFedrampModerateHardening();
                break;
            case 'fedramp-high':
                this.applyFedrampHighHardening();
                break;
            default:
                this.applyCommercialHardening();
                break;
        }
    }
    applyCommercialHardening() {
        // Basic security monitoring
        if (this.httpApi) {
            const securityLogGroup = new logs.LogGroup(this, 'SecurityLogGroup', {
                logGroupName: `/aws/apigateway/${this.buildApiName()}/security`,
                retention: logs.RetentionDays.THREE_MONTHS,
                removalPolicy: cdk.RemovalPolicy.DESTROY
            });
            this.applyStandardTags(securityLogGroup, {
                'log-type': 'security',
                'retention': '3-months'
            });
        }
    }
    applyFedrampModerateHardening() {
        this.applyCommercialHardening();
        if (this.httpApi) {
            const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
                logGroupName: `/aws/apigateway/${this.buildApiName()}/compliance`,
                retention: logs.RetentionDays.ONE_YEAR,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            this.applyStandardTags(complianceLogGroup, {
                'log-type': 'compliance',
                'retention': '1-year',
                'compliance': 'fedramp-moderate'
            });
        }
    }
    applyFedrampHighHardening() {
        this.applyFedrampModerateHardening();
        if (this.httpApi) {
            const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
                logGroupName: `/aws/apigateway/${this.buildApiName()}/audit`,
                retention: logs.RetentionDays.TEN_YEARS,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            this.applyStandardTags(auditLogGroup, {
                'log-type': 'audit',
                'retention': '10-years',
                'compliance': 'fedramp-high'
            });
        }
    }
    buildApiCapability() {
        return {
            apiId: this.httpApi.httpApiId,
            apiEndpoint: this.httpApi.url,
            customDomainName: this.config.domainName?.domainName
        };
    }
    configureObservabilityForApi() {
        if (this.context.complianceFramework === 'commercial') {
            return;
        }
        const apiName = this.buildApiName();
        // 1. 4XX Error Rate Alarm
        const errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-high-4xx-rate`,
            alarmDescription: 'API Gateway high 4XX error rate alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApiGatewayV2',
                metricName: '4XXError',
                dimensionsMap: {
                    ApiId: this.httpApi.httpApiId
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 10, // 10 4XX errors in 5 minutes
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.applyStandardTags(errorRateAlarm, {
            'alarm-type': 'high-4xx-rate',
            'metric-type': 'reliability',
            'threshold': '10'
        });
        // 2. High Latency Alarm
        const latencyAlarm = new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-high-latency`,
            alarmDescription: 'API Gateway high latency alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApiGatewayV2',
                metricName: 'IntegrationLatency',
                dimensionsMap: {
                    ApiId: this.httpApi.httpApiId
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 5000, // 5 second latency threshold
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.applyStandardTags(latencyAlarm, {
            'alarm-type': 'high-latency',
            'metric-type': 'performance',
            'threshold': '5-seconds'
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to API Gateway v2', {
            alarmsCreated: 2,
            apiName: apiName,
            monitoringEnabled: true
        });
    }
}
exports.ApiGatewayHttpComponent = ApiGatewayHttpComponent;
