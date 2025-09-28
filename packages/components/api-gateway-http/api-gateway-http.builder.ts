/**
 * Configuration Builder for Modern HTTP API Gateway Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext, ComponentContext, ComponentSpec } from '@shinobi/core';
import configSchema from './Config.schema.json';

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
    /** Hosted zone name (if different from domain) */
    hostedZoneName?: string;
    /** Security policy */
    securityPolicy?: 'TLS_1_2';
    /** Endpoint type */
    endpointType?: 'EDGE' | 'REGIONAL';
    /** Base path mapping */
    basePath?: string;
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
    /** Route key (e.g., 'GET /users', 'POST /orders') */
    routeKey: string;
    /** Integration configuration */
    integration: {
      /** Integration type */
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
    /** Retain log group on stack deletion */
    retainOnDelete?: boolean;
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

  /** OpenTelemetry configuration */
  observability?: {
    /** Enable OpenTelemetry tracing */
    tracingEnabled?: boolean;
    /** OTLP endpoint for traces */
    otlpEndpoint?: string;
    /** Service name for traces */
    serviceName?: string;
    /** Resource attributes */
    resourceAttributes?: Record<string, string>;
    /** Enable metrics export */
    metricsEnabled?: boolean;
    /** Enable logs export */
    logsEnabled?: boolean;
  };

  /** Tags for the API */
  tags?: Record<string, string>;
  security?: {
    enableWaf?: boolean;
    enableApiKey?: boolean;
    requireAuthorization?: boolean;
    webAclArn?: string;
  };
}

export const API_GATEWAY_HTTP_CONFIG_SCHEMA = configSchema;

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
  protected context: ComponentContext;
  protected spec: ComponentSpec;

  constructor(context: ComponentContext, spec: ComponentSpec) {
    if (!context) {
      throw new Error('ComponentContext is required');
    }
    if (!spec) {
      throw new Error('ComponentSpec is required');
    }
    super({ context, spec } as ConfigBuilderContext, API_GATEWAY_HTTP_CONFIG_SCHEMA as any);
    this.context = context;
    this.spec = spec;
  }

  /**
   * Build the final configuration using the 5-layer precedence chain
   * This method is inherited from ConfigBuilder and provides the complete
   * configuration merging logic. We only need to implement the abstract methods.
   */
  public buildSync(): ApiGatewayHttpConfig {
    const hardcoded = this.getHardcodedFallbacks();
    const resolved = super.buildSync() as ApiGatewayHttpConfig;
    const complianceDefaults = this.getComplianceDefaults();
    const userOverrides = (this.spec.config ?? {}) as Record<string, any>;
    const merged = this.applyComplianceDefaults(resolved, hardcoded, complianceDefaults, userOverrides) as ApiGatewayHttpConfig;
    return this.normaliseConfig(merged);
  }

  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  public getHardcodedFallbacks(): Record<string, any> {
    return {
      protocolType: 'HTTP',
      description: `HTTP API for ${this.spec.name}`,
      cors: {
        allowOrigins: [],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowCredentials: false,
        maxAge: 300
      },
      throttling: {
        rateLimit: 50,
        burstLimit: 100
      },
      accessLogging: {
        enabled: true,
        retentionInDays: 90,
        retainOnDelete: false
      },
      monitoring: {
        detailedMetrics: true,
        tracingEnabled: true,
        alarms: {
          errorRate4xx: 5,
          errorRate5xx: 1,
          highLatency: 2000,
          lowThroughput: 1
        }
      },
      apiSettings: {
        disableExecuteApiEndpoint: false,
        apiKeySource: 'HEADER'
      },
      security: {
        enableWaf: false,
        enableApiKey: false,
        requireAuthorization: true
      }
    };
  }

  private getComplianceDefaults(): Partial<ApiGatewayHttpConfig> {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return {
          throttling: {
            rateLimit: 25,
            burstLimit: 50
          },
          accessLogging: {
            enabled: true,
            retentionInDays: 365,
            retainOnDelete: true,
            includeExecutionData: true,
            includeRequestResponseData: true
          },
          monitoring: {
            detailedMetrics: true,
            tracingEnabled: true,
            alarms: {
              errorRate4xx: 1.0,
              errorRate5xx: 0.1,
              highLatency: 2000,
              lowThroughput: 2
            }
          },
          security: {
            enableWaf: true,
            enableApiKey: true,
            requireAuthorization: true
          }
        };
      case 'fedramp-moderate':
        return {
          throttling: {
            rateLimit: 50,
            burstLimit: 100
          },
          accessLogging: {
            enabled: true,
            retentionInDays: 90,
            retainOnDelete: true,
            includeExecutionData: false,
            includeRequestResponseData: false
          },
          monitoring: {
            detailedMetrics: true,
            tracingEnabled: true,
            alarms: {
              errorRate4xx: 2.0,
              errorRate5xx: 0.5,
              highLatency: 3000,
              lowThroughput: 5
            }
          },
          security: {
            enableWaf: true,
            enableApiKey: true,
            requireAuthorization: true
          }
        };
      default:
        return {
          throttling: {
            rateLimit: 1000,
            burstLimit: 2000
          },
          accessLogging: {
            retentionInDays: 90,
            retainOnDelete: false,
            includeExecutionData: false,
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
          security: {
            enableWaf: false,
            enableApiKey: false,
            requireAuthorization: true
          }
        };
    }
  }

  private normaliseConfig(config: ApiGatewayHttpConfig): ApiGatewayHttpConfig {
    const normalised: ApiGatewayHttpConfig = { ...config };

    const throttling = normalised.throttling ?? { rateLimit: 50, burstLimit: 100 };
    throttling.rateLimit = throttling.rateLimit && throttling.rateLimit > 0 ? throttling.rateLimit : 50;
    throttling.burstLimit = throttling.burstLimit && throttling.burstLimit > 0 ? throttling.burstLimit : 100;
    normalised.throttling = throttling;

    normalised.defaultStage = {
      stageName: normalised.defaultStage?.stageName ?? this.context.environment ?? '$default',
      autoDeploy: normalised.defaultStage?.autoDeploy ?? true,
      throttling: normalised.defaultStage?.throttling ?? throttling
    };

    if (normalised.cors) {
      const cors = { ...normalised.cors };
      cors.allowHeaders = cors.allowHeaders && cors.allowHeaders.length > 0 ? cors.allowHeaders : ['Content-Type', 'Authorization'];
      cors.allowMethods = cors.allowMethods && cors.allowMethods.length > 0 ? cors.allowMethods : ['GET', 'POST', 'OPTIONS'];
      cors.allowOrigins = cors.allowOrigins ?? [];
      cors.allowCredentials = cors.allowCredentials ?? false;
      cors.maxAge = cors.maxAge ?? 300;
      normalised.cors = cors;
    }

    normalised.accessLogging = {
      ...normalised.accessLogging,
      enabled: normalised.accessLogging?.enabled ?? true,
      retentionInDays: normalised.accessLogging?.retentionInDays ?? 90,
      retainOnDelete: normalised.accessLogging?.retainOnDelete ?? false
    };

    const monitoring = normalised.monitoring ?? {};
    normalised.monitoring = {
      ...monitoring,
      detailedMetrics: monitoring.detailedMetrics ?? true,
      tracingEnabled: monitoring.tracingEnabled ?? true,
      alarms: monitoring.alarms ? { ...monitoring.alarms } : undefined
    };

    const security = normalised.security ?? {};
    normalised.security = {
      ...security,
      enableWaf: security.enableWaf ?? false,
      enableApiKey: security.enableApiKey ?? false,
      requireAuthorization: security.requireAuthorization ?? true
    };

    normalised.apiSettings = {
      disableExecuteApiEndpoint: normalised.apiSettings?.disableExecuteApiEndpoint ?? false,
      apiKeySource: normalised.apiSettings?.apiKeySource ?? 'HEADER'
    };

    normalised.observability = {
      tracingEnabled: normalised.observability?.tracingEnabled ?? true,
      metricsEnabled: normalised.observability?.metricsEnabled ?? true,
      logsEnabled: normalised.observability?.logsEnabled ?? true,
      otlpEndpoint: normalised.observability?.otlpEndpoint,
      serviceName: normalised.observability?.serviceName,
      resourceAttributes: normalised.observability?.resourceAttributes
    };

    return normalised;
  }

  private applyComplianceDefaults(
    resolved: Record<string, any>,
    fallback: Record<string, any>,
    compliance: Record<string, any>,
    overrides: Record<string, any>
  ): Record<string, any> {
    const result = { ...resolved };

    for (const [key, complianceValue] of Object.entries(compliance)) {
      const fallbackValue = fallback ? fallback[key] : undefined;
      const currentValue = result[key];
      const overrideValue = overrides ? overrides[key] : undefined;

      if (Array.isArray(complianceValue)) {
        if (
          currentValue === undefined ||
          (overrideValue === undefined && this.valuesEqual(currentValue, fallbackValue))
        ) {
          result[key] = complianceValue;
        }
        continue;
      }

      if (complianceValue !== null && typeof complianceValue === 'object') {
        result[key] = this.applyComplianceDefaults(
          currentValue || {},
          (fallbackValue as Record<string, any>) || {},
          complianceValue as Record<string, any>,
          (overrideValue as Record<string, any>) || {}
        );
        continue;
      }

      if (
        currentValue === undefined ||
        (overrideValue === undefined && this.valuesEqual(currentValue, fallbackValue))
      ) {
        result[key] = complianceValue;
      }
    }

    return result;
  }

  private valuesEqual(a: any, b: any): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      return a.every((value, index) => this.valuesEqual(value, b[index]));
    }

    if (typeof a === 'object' || typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    return a === b;
  }

  // Add build method for async compatibility
  public async build(): Promise<ApiGatewayHttpConfig> {
    return this.buildSync();
  }

  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return API_GATEWAY_HTTP_CONFIG_SCHEMA;
  }
}
