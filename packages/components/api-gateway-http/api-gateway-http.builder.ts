/**
 * Configuration Builder for Modern HTTP API Gateway Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../../../src/platform/contracts/config-builder';

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
export const API_GATEWAY_HTTP_CONFIG_SCHEMA = {
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
export class ApiGatewayHttpConfigBuilder extends ConfigBuilder<ApiGatewayHttpConfig> {
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<ApiGatewayHttpConfig> {
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
  protected getComplianceFrameworkDefaults(): Partial<ApiGatewayHttpConfig> {
    const framework = this.context.complianceFramework;
    
    const baseCompliance: Partial<ApiGatewayHttpConfig> = {
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
  public getSchema(): any {
    return API_GATEWAY_HTTP_CONFIG_SCHEMA;
  }
}
