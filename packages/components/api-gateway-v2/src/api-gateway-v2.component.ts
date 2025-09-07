/**
 * API Gateway v2 (HTTP API) Component
 * 
 * AWS API Gateway v2 for modern HTTP APIs with enhanced performance and lower cost.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

/**
 * Configuration interface for API Gateway v2 component
 */
export interface ApiGatewayV2Config {
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
 * Configuration schema for API Gateway v2 component
 */
export const API_GATEWAY_V2_CONFIG_SCHEMA = {
  type: 'object',
  title: 'API Gateway v2 Configuration',
  description: 'Configuration for creating an API Gateway v2 HTTP API',
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
 * Configuration builder for API Gateway v2 component
 */
export class ApiGatewayV2ConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  public async build(): Promise<ApiGatewayV2Config> {
    return this.buildSync();
  }

  public buildSync(): ApiGatewayV2Config {
    const platformDefaults = this.getPlatformDefaults();
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    const userConfig = this.spec.config || {};
    
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as ApiGatewayV2Config;
  }

  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private getPlatformDefaults(): Record<string, any> {
    return {
      protocolType: 'HTTP',
      cors: this.getDefaultCorsConfig(),
      throttling: this.getDefaultThrottling(),
      accessLogging: {
        enabled: this.getDefaultAccessLogging()
      },
      defaultStage: {
        stageName: '$default',
        autoDeploy: true
      },
      tags: {
        'service': this.context.serviceName,
        'environment': this.context.environment,
        'api-type': 'http-v2'
      }
    };
  }

  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          cors: {
            allowOrigins: ['https://*'], // Restrict to HTTPS origins only
            allowCredentials: false // Security best practice
          },
          throttling: {
            rateLimit: 500, // Conservative rate limiting
            burstLimit: 1000
          },
          accessLogging: {
            enabled: true, // Mandatory for compliance
            format: this.getComplianceLogFormat()
          },
          tags: {
            'compliance-framework': 'fedramp-moderate',
            'access-logging': 'comprehensive',
            'throttling': 'enabled'
          }
        };
        
      case 'fedramp-high':
        return {
          cors: {
            allowOrigins: [], // No CORS for high security by default
            allowCredentials: false
          },
          throttling: {
            rateLimit: 100, // Strict rate limiting for high security
            burstLimit: 200
          },
          accessLogging: {
            enabled: true, // Mandatory comprehensive logging
            format: this.getComplianceLogFormat()
          },
          tags: {
            'compliance-framework': 'fedramp-high',
            'access-logging': 'comprehensive',
            'throttling': 'strict',
            'security-level': 'high'
          }
        };
        
      default: // commercial
        return {
          cors: {
            allowOrigins: ['*'],
            allowCredentials: false
          },
          throttling: {
            rateLimit: 1000,
            burstLimit: 2000
          }
        };
    }
  }

  private getDefaultCorsConfig(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-high':
        return {
          allowCredentials: false,
          allowHeaders: ['Content-Type', 'Authorization'],
          allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
          allowOrigins: [], // No CORS by default
          maxAge: 3600 // Shorter cache for security
        };
      case 'fedramp-moderate':
        return {
          allowCredentials: false,
          allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
          allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowOrigins: ['https://*'], // HTTPS only
          maxAge: 86400
        };
      default:
        return {
          allowCredentials: false,
          allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
          allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowOrigins: ['*'],
          maxAge: 86400
        };
    }
  }

  private getDefaultThrottling(): Record<string, number> {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return { rateLimit: 100, burstLimit: 200 };
      case 'fedramp-moderate':
        return { rateLimit: 500, burstLimit: 1000 };
      default:
        return { rateLimit: 1000, burstLimit: 2000 };
    }
  }

  private getDefaultAccessLogging(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getComplianceLogFormat(): string {
    return JSON.stringify({
      requestTime: '$requestTime',
      requestId: '$requestId',
      httpMethod: '$httpMethod',
      resourcePath: '$resourcePath',
      status: '$status',
      error: '$error.message',
      responseLength: '$responseLength',
      responseLatency: '$responseLatency',
      sourceIp: '$sourceIp',
      userAgent: '$userAgent',
      requestHeaders: '$requestHeaders',
      responseHeaders: '$responseHeaders'
    });
  }
}

/**
 * API Gateway v2 Component implementing Component API Contract v1.0
 */
export class ApiGatewayV2Component extends Component {
  private httpApi?: apigatewayv2.HttpApi;
  private domainName?: apigatewayv2.DomainName;
  private stage?: apigatewayv2.HttpStage;
  private accessLogGroup?: logs.LogGroup;
  private config?: ApiGatewayV2Config;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting API Gateway v2 component synthesis', {
      apiName: this.spec.config?.apiName,
      protocolType: this.spec.config?.protocolType
    });
    
    const startTime = Date.now();
    
    try {
      const configBuilder = new ApiGatewayV2ConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      this.logComponentEvent('config_built', 'API Gateway v2 configuration built successfully', {
        apiName: this.config.apiName,
        protocolType: this.config.protocolType,
        routesCount: this.config.routes?.length || 0
      });
      
      this.createAccessLogGroupIfNeeded();
      this.createHttpApi();
      this.createCustomDomainIfNeeded();
      this.createRoutes();
      this.createDefaultStage();
      this.createDnsRecordsIfNeeded();
      this.applyComplianceHardening();
      this.configureObservabilityForApi();
    
      this.registerConstruct('httpApi', this.httpApi!);
      if (this.domainName) {
        this.registerConstruct('domainName', this.domainName);
      }
      if (this.stage) {
        this.registerConstruct('stage', this.stage);
      }
      if (this.accessLogGroup) {
        this.registerConstruct('accessLogGroup', this.accessLogGroup);
      }
    
      this.registerCapability('api:http-v2', this.buildApiCapability());
    
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'API Gateway v2 component synthesis completed successfully', {
        apiCreated: 1,
        routesCreated: this.config.routes?.length || 0,
        customDomain: !!this.config.domainName
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'api-gateway-v2',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'api-gateway-v2';
  }

  private createAccessLogGroupIfNeeded(): void {
    if (this.config!.accessLogging?.enabled) {
      this.accessLogGroup = new logs.LogGroup(this, 'AccessLogGroup', {
        logGroupName: `/aws/apigateway/${this.buildApiName()}`,
        retention: this.getLogRetention(),
        removalPolicy: this.getLogRemovalPolicy()
      });

      this.applyStandardTags(this.accessLogGroup, {
        'log-type': 'api-access',
        'api': this.buildApiName()!,
        'retention': this.getLogRetention().toString()
      });
    }
  }

  private createHttpApi(): void {
    const apiProps: apigatewayv2.HttpApiProps = {
      apiName: this.buildApiName(),
      description: this.config!.description,
      corsPreflight: this.config!.cors ? {
        allowCredentials: this.config!.cors.allowCredentials,
        allowHeaders: this.config!.cors.allowHeaders,
        allowMethods: this.mapCorsMethods(this.config!.cors.allowMethods || []),
        allowOrigins: this.config!.cors.allowOrigins,
        exposeHeaders: this.config!.cors.exposeHeaders,
        maxAge: this.config!.cors.maxAge ? cdk.Duration.seconds(this.config!.cors.maxAge) : undefined
      } : undefined
    };

    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', apiProps);

    this.applyStandardTags(this.httpApi, {
      'api-name': this.buildApiName()!,
      'protocol-type': this.config!.protocolType!,
      'cors-enabled': (!!this.config!.cors).toString(),
      'access-logging': (this.config!.accessLogging?.enabled || false).toString()
    });

    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.httpApi!).add(key, value);
      });
    }
    
    this.logResourceCreation('api-gateway-v2', this.buildApiName()!, {
      apiName: this.buildApiName(),
      protocolType: this.config!.protocolType,
      corsEnabled: !!this.config!.cors
    });
  }

  private mapCorsMethods(methods: string[]): apigatewayv2.CorsHttpMethod[] {
    const methodMap: { [key: string]: apigatewayv2.CorsHttpMethod } = {
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

  private createCustomDomainIfNeeded(): void {
    if (!this.config!.domainName) {
      return;
    }

    const certificate = this.config!.domainName.certificateArn ? 
      certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', this.config!.domainName.certificateArn) :
      undefined;

    this.domainName = new apigatewayv2.DomainName(this, 'DomainName', {
      domainName: this.config!.domainName.domainName,
      certificate: certificate
    });

    this.applyStandardTags(this.domainName, {
      'domain-name': this.config!.domainName.domainName,
      'api': this.buildApiName()!
    });
  }

  private createRoutes(): void {
    if (!this.config!.routes || this.config!.routes.length === 0) {
      return;
    }

    this.config!.routes.forEach((routeConfig, index) => {
      const integration = this.createIntegration(routeConfig.integration);
      const authorizer = this.createAuthorizerIfNeeded(routeConfig.authorization);

      new apigatewayv2.HttpRoute(this, `Route${index}`, {
        httpApi: this.httpApi!,
        routeKey: apigatewayv2.HttpRouteKey.with(routeConfig.routeKey),
        integration: integration,
        authorizer: authorizer
      });
    });
  }

  private createIntegration(integrationConfig: any): apigatewayv2.HttpRouteIntegration {
    switch (integrationConfig.type) {
      case 'HTTP_PROXY':
        return new integrations.HttpUrlIntegration('HttpProxyIntegration', integrationConfig.uri!, {
          method: this.mapHttpMethod(integrationConfig.httpMethod)
        });

      case 'AWS_PROXY':
        const lambdaFunction = lambda.Function.fromFunctionArn(
          this, 
          `LambdaFunction${integrationConfig.lambdaFunctionArn}`, 
          integrationConfig.lambdaFunctionArn!
        );
        return new integrations.HttpLambdaIntegration('LambdaIntegration', lambdaFunction);

      case 'MOCK':
        return new integrations.HttpUrlIntegration('MockIntegration', 'http://mock.local');

      default:
        throw new Error(`Unsupported integration type: ${integrationConfig.type}`);
    }
  }

  private mapHttpMethod(method?: string): apigatewayv2.HttpMethod | undefined {
    if (!method) return undefined;

    const methodMap: { [key: string]: apigatewayv2.HttpMethod } = {
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

  private createAuthorizerIfNeeded(authConfig?: any): apigatewayv2.IHttpRouteAuthorizer | undefined {
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

  private createDefaultStage(): void {
    if (!this.config!.defaultStage) {
      return;
    }

    const stageProps: apigatewayv2.HttpStageProps = {
      httpApi: this.httpApi!,
      stageName: this.config!.defaultStage.stageName!,
      autoDeploy: this.config!.defaultStage.autoDeploy,
      throttle: this.buildStageThrottling(),
      accessLogDestination: this.accessLogGroup ? 
        new apigatewayv2.HttpApiLogDestination(this.accessLogGroup) : 
        undefined,
      accessLogFormat: this.config!.accessLogging?.format ? 
        apigatewayv2.AccessLogFormat.custom(this.config!.accessLogging.format) : 
        undefined
    };

    this.stage = new apigatewayv2.HttpStage(this, 'Stage', stageProps);

    this.applyStandardTags(this.stage, {
      'stage-name': this.config!.defaultStage.stageName!,
      'auto-deploy': (this.config!.defaultStage.autoDeploy || false).toString(),
      'throttling-enabled': (!!this.config!.defaultStage.throttling).toString()
    });

    // Create API mapping for custom domain
    if (this.domainName) {
      new apigatewayv2.ApiMapping(this, 'ApiMapping', {
        api: this.httpApi!,
        domainName: this.domainName,
        stage: this.stage,
        apiMappingKey: this.config!.domainName?.basePath
      });
    }
  }

  private buildStageThrottling(): apigatewayv2.ThrottleSettings | undefined {
    const stageThrottling = this.config!.defaultStage?.throttling || this.config!.throttling;
    
    if (!stageThrottling) {
      return undefined;
    }

    return {
      rateLimit: stageThrottling.rateLimit,
      burstLimit: stageThrottling.burstLimit
    };
  }

  private createDnsRecordsIfNeeded(): void {
    if (!this.config!.domainName || !this.domainName || !this.config!.domainName.hostedZoneId) {
      return;
    }

    const hostedZone = route53.HostedZone.fromHostedZoneId(
      this, 
      'HostedZone', 
      this.config!.domainName.hostedZoneId
    );

    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: this.config!.domainName.domainName,
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayv2DomainProperties(
        this.domainName.regionalDomainName,
        this.domainName.regionalHostedZoneId
      ))
    });
  }

  private buildApiName(): string | undefined {
    if (this.config!.apiName) {
      return this.config!.apiName;
    }
    return `${this.context.serviceName}-${this.spec.name}`;
  }

  private getLogRetention(): logs.RetentionDays {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return logs.RetentionDays.TEN_YEARS;
      case 'fedramp-moderate':
        return logs.RetentionDays.ONE_YEAR;
      default:
        return logs.RetentionDays.THREE_MONTHS;
    }
  }

  private getLogRemovalPolicy(): cdk.RemovalPolicy {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) 
      ? cdk.RemovalPolicy.RETAIN 
      : cdk.RemovalPolicy.DESTROY;
  }

  private applyComplianceHardening(): void {
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

  private applyCommercialHardening(): void {
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

  private applyFedrampModerateHardening(): void {
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

  private applyFedrampHighHardening(): void {
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

  private buildApiCapability(): any {
    return {
      apiId: this.httpApi!.httpApiId,
      apiEndpoint: this.httpApi!.url,
      customDomainName: this.config!.domainName?.domainName
    };
  }

  private configureObservabilityForApi(): void {
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const apiName = this.buildApiName()!;

    // 1. 4XX Error Rate Alarm
    const errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-high-4xx-rate`,
      alarmDescription: 'API Gateway high 4XX error rate alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGatewayV2',
        metricName: '4XXError',
        dimensionsMap: {
          ApiId: this.httpApi!.httpApiId
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
          ApiId: this.httpApi!.httpApiId
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