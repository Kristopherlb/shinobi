"use strict";
/**
 * Configuration Builder for Modern HTTP API Gateway Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiGatewayHttpConfigBuilder = exports.API_GATEWAY_HTTP_CONFIG_SCHEMA = void 0;
const config_builder_1 = require("../../../src/platform/contracts/config-builder");
/**
 * JSON Schema for API Gateway HTTP configuration validation
 */
exports.API_GATEWAY_HTTP_CONFIG_SCHEMA = {
    type: 'object',
    properties: {
        apiName: {
            type: 'string',
            description: 'API name (optional, will be auto-generated from component name)',
            pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
            maxLength: 128
        },
        description: {
            type: 'string',
            description: 'API description for documentation',
            maxLength: 1024
        },
        protocolType: {
            type: 'string',
            enum: ['HTTP', 'WEBSOCKET'],
            default: 'HTTP',
            description: 'Protocol type for the API Gateway'
        },
        cors: {
            type: 'object',
            description: 'CORS configuration for cross-origin requests',
            properties: {
                allowOrigins: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Allowed origins for CORS requests'
                },
                allowHeaders: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Allowed headers for CORS requests'
                },
                allowMethods: {
                    type: 'array',
                    items: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] },
                    description: 'Allowed HTTP methods for CORS requests'
                },
                allowCredentials: {
                    type: 'boolean',
                    description: 'Whether to allow credentials in CORS requests'
                },
                maxAge: {
                    type: 'number',
                    minimum: 0,
                    maximum: 86400,
                    description: 'Max age for preflight requests in seconds'
                },
                exposeHeaders: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Headers to expose to the client'
                }
            },
            additionalProperties: false
        },
        customDomain: {
            type: 'object',
            description: 'Custom domain configuration',
            properties: {
                domainName: {
                    type: 'string',
                    description: 'Custom domain name for the API',
                    pattern: '^[a-zA-Z0-9][a-zA-Z0-9-\\.]*[a-zA-Z0-9]$'
                },
                certificateArn: {
                    type: 'string',
                    description: 'ARN of the SSL certificate'
                },
                autoGenerateCertificate: {
                    type: 'boolean',
                    default: false,
                    description: 'Whether to auto-generate SSL certificate'
                },
                hostedZoneId: {
                    type: 'string',
                    description: 'Route 53 hosted zone ID for DNS configuration'
                },
                securityPolicy: {
                    type: 'string',
                    enum: ['TLS_1_0', 'TLS_1_2'],
                    default: 'TLS_1_2',
                    description: 'Security policy for the domain'
                },
                endpointType: {
                    type: 'string',
                    enum: ['EDGE', 'REGIONAL'],
                    default: 'REGIONAL',
                    description: 'Endpoint type for the custom domain'
                }
            },
            required: ['domainName'],
            additionalProperties: false
        },
        throttling: {
            type: 'object',
            description: 'API throttling configuration',
            properties: {
                rateLimit: {
                    type: 'number',
                    minimum: 1,
                    description: 'Rate limit in requests per second'
                },
                burstLimit: {
                    type: 'number',
                    minimum: 1,
                    description: 'Burst limit for request spikes'
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
                    default: true,
                    description: 'Whether to enable access logging'
                },
                logGroupName: {
                    type: 'string',
                    description: 'CloudWatch log group name'
                },
                retentionInDays: {
                    type: 'number',
                    enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653],
                    description: 'Log retention period in days'
                },
                format: {
                    type: 'string',
                    description: 'Access log format'
                }
            },
            additionalProperties: false
        },
        monitoring: {
            type: 'object',
            description: 'Monitoring and observability configuration',
            properties: {
                detailedMetrics: {
                    type: 'boolean',
                    default: false,
                    description: 'Enable detailed CloudWatch metrics'
                },
                tracingEnabled: {
                    type: 'boolean',
                    default: false,
                    description: 'Enable AWS X-Ray tracing'
                }
            },
            additionalProperties: false
        }
    },
    additionalProperties: false
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
class ApiGatewayHttpConfigBuilder extends config_builder_1.ConfigBuilder {
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    getHardcodedFallbacks() {
        return {
            protocolType: 'HTTP',
            cors: {
                allowOrigins: ['https://localhost:3000'], // Safe default for local development
                allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
                allowMethods: ['GET', 'POST', 'OPTIONS'],
                allowCredentials: false,
                maxAge: 300
            },
            throttling: {
                rateLimit: 100,
                burstLimit: 200
            },
            accessLogging: {
                enabled: true,
                retentionInDays: 7,
                format: '$requestId $requestTime $httpMethod $resourcePath $status $responseLength $requestTime'
            },
            monitoring: {
                detailedMetrics: false,
                tracingEnabled: false
            },
            apiSettings: {
                disableExecuteApiEndpoint: false,
                apiKeySource: 'HEADER'
            }
        };
    }
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations
     */
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        const baseCompliance = {
            cors: {
                allowOrigins: [], // Must be explicitly configured
                allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
                allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowCredentials: true,
                maxAge: 86400
            },
            throttling: {
                rateLimit: 1000,
                burstLimit: 2000
            },
            accessLogging: {
                enabled: true,
                retentionInDays: 30,
                includeExecutionData: true,
                includeRequestResponseData: false
            },
            monitoring: {
                detailedMetrics: true,
                tracingEnabled: true,
                alarms: {
                    errorRate4xx: 5.0,
                    errorRate5xx: 1.0,
                    highLatency: 5000,
                    lowThroughput: 10
                }
            },
            customDomain: {
                securityPolicy: 'TLS_1_2',
                endpointType: 'REGIONAL'
            }
        };
        if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
            return {
                ...baseCompliance,
                cors: {
                    ...baseCompliance.cors,
                    allowOrigins: [], // Must be explicitly configured - no wildcards
                    allowCredentials: true
                },
                accessLogging: {
                    ...baseCompliance.accessLogging,
                    enabled: true, // Mandatory for FedRAMP
                    retentionInDays: framework === 'fedramp-high' ? 365 : 90,
                    includeExecutionData: true,
                    includeRequestResponseData: true // Required for audit trail
                },
                monitoring: {
                    ...baseCompliance.monitoring,
                    detailedMetrics: true, // Mandatory for FedRAMP
                    tracingEnabled: true,
                    alarms: {
                        errorRate4xx: 2.0, // Stricter thresholds
                        errorRate5xx: 0.5,
                        highLatency: 3000,
                        lowThroughput: 5
                    }
                },
                throttling: {
                    rateLimit: 500, // More conservative for security
                    burstLimit: 1000
                },
                apiSettings: {
                    disableExecuteApiEndpoint: true, // Security requirement
                    apiKeySource: 'HEADER'
                },
                resourcePolicy: {
                    // Will be populated with VPC/IP restrictions
                    allowFromVpcs: [], // Must be explicitly configured
                    denyFromIpRanges: ['0.0.0.0/0'] // Deny all by default, must be overridden
                }
            };
        }
        return baseCompliance;
    }
    /**
     * Get the JSON Schema for validation
     */
    getSchema() {
        return exports.API_GATEWAY_HTTP_CONFIG_SCHEMA;
    }
}
exports.ApiGatewayHttpConfigBuilder = ApiGatewayHttpConfigBuilder;
