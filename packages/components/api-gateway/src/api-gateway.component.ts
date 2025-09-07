/**
 * Standalone API Gateway Component implementing Component API Contract v1.0
 * 
 * A powerful, standalone API Gateway for advanced use cases with Cognito authentication.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '../../../platform/contracts/src';

/**
 * Configuration interface for Standalone API Gateway component
 */
export interface ApiGatewayConfig {
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
  
  /** Logging configuration */
  logging?: {
    accessLogging?: {
      enabled?: boolean;
      destinationArn?: string;
      format?: string;
    };
    executionLogging?: {
      enabled?: boolean;
      level?: 'OFF' | 'ERROR' | 'INFO';
      dataTrace?: boolean;
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
  
  /** Monitoring configuration */
  monitoring?: {
    enabled?: boolean;
    alarms?: {
      error5xxThreshold?: number;
      latencyP90Threshold?: number;
      countThreshold?: number;
    };
  };
  
  /** Tags for the API */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for API Gateway configuration
 */
export const API_GATEWAY_CONFIG_SCHEMA = {
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
    logging: {
      type: 'object',
      properties: {
        accessLogging: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            destinationArn: { type: 'string' },
            format: { type: 'string' }
          }
        },
        executionLogging: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            level: {
              type: 'string',
              enum: ['OFF', 'ERROR', 'INFO']
            },
            dataTrace: { type: 'boolean' }
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
    monitoring: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        alarms: {
          type: 'object',
          properties: {
            error5xxThreshold: { type: 'number', minimum: 0 },
            latencyP90Threshold: { type: 'number', minimum: 0 },
            countThreshold: { type: 'number', minimum: 0 }
          }
        }
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
 * ConfigBuilder for API Gateway component
 */
export class ApiGatewayConfigBuilder {
  constructor(private context: ComponentContext, private spec: ComponentSpec) {}

  /**
   * Asynchronous build method - delegates to synchronous implementation
   */
  public async build(): Promise<ApiGatewayConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): ApiGatewayConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as ApiGatewayConfig;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
  private mergeConfigs(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
    const result = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = this.mergeConfigs(result[key] || {}, value);
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  /**
   * Get platform-wide defaults with intelligent configuration
   */
  private getPlatformDefaults(): Partial<ApiGatewayConfig> {
    return {
      deploymentStage: this.context.environment,
      description: `Standalone API Gateway for ${this.spec.name}`,
      cors: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
        allowCredentials: false
      },
      logging: {
        accessLogging: {
          enabled: this.shouldEnableAccessLogging()
        },
        executionLogging: {
          enabled: this.shouldEnableExecutionLogging(),
          level: this.getDefaultLogLevel(),
          dataTrace: this.shouldEnableDataTrace()
        }
      },
      tracing: {
        xrayEnabled: this.shouldEnableXRayTracing()
      },
      throttling: {
        burstLimit: this.getDefaultBurstLimit(),
        rateLimit: this.getDefaultRateLimit()
      },
      monitoring: {
        enabled: true,
        alarms: {
          error5xxThreshold: 10,
          latencyP90Threshold: 5000,
          countThreshold: 100
        }
      }
    };
  }

  /**
   * Get compliance framework-specific defaults
   */
  private getComplianceFrameworkDefaults(): Partial<ApiGatewayConfig> {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return {
          logging: {
            accessLogging: {
              enabled: true // Mandatory for FedRAMP High
            },
            executionLogging: {
              enabled: true,
              level: 'INFO', // Detailed logging
              dataTrace: true
            }
          },
          tracing: {
            xrayEnabled: true // Mandatory X-Ray tracing
          },
          throttling: {
            burstLimit: 500, // Conservative limits
            rateLimit: 100
          },
          monitoring: {
            enabled: true,
            alarms: {
              error5xxThreshold: 5, // More sensitive monitoring
              latencyP90Threshold: 3000,
              countThreshold: 50
            }
          }
        };
        
      case 'fedramp-moderate':
        return {
          logging: {
            accessLogging: {
              enabled: true // Recommended for FedRAMP Moderate
            },
            executionLogging: {
              enabled: true,
              level: 'INFO',
              dataTrace: false
            }
          },
          tracing: {
            xrayEnabled: true // Recommended X-Ray tracing
          },
          throttling: {
            burstLimit: 1000,
            rateLimit: 200
          },
          monitoring: {
            enabled: true,
            alarms: {
              error5xxThreshold: 8,
              latencyP90Threshold: 4000,
              countThreshold: 75
            }
          }
        };
        
      default: // commercial
        return {
          logging: {
            accessLogging: {
              enabled: false // Optional for commercial
            },
            executionLogging: {
              enabled: false,
              level: 'OFF'
            }
          },
          tracing: {
            xrayEnabled: false // Optional for commercial
          },
          throttling: {
            burstLimit: 2000,
            rateLimit: 500
          },
          monitoring: {
            enabled: false // Optional monitoring
          }
        };
    }
  }

  /**
   * Determine if access logging should be enabled by default
   */
  private shouldEnableAccessLogging(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  /**
   * Determine if execution logging should be enabled by default
   */
  private shouldEnableExecutionLogging(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  /**
   * Get default log level based on compliance framework
   */
  private getDefaultLogLevel(): 'OFF' | 'ERROR' | 'INFO' {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
      case 'fedramp-moderate':
        return 'INFO';
      default:
        return 'OFF';
    }
  }

  /**
   * Determine if data trace should be enabled by default
   */
  private shouldEnableDataTrace(): boolean {
    return this.context.complianceFramework === 'fedramp-high';
  }

  /**
   * Determine if X-Ray tracing should be enabled by default
   */
  private shouldEnableXRayTracing(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  /**
   * Get default burst limit based on compliance framework
   */
  private getDefaultBurstLimit(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 500; // Conservative
      case 'fedramp-moderate':
        return 1000; // Moderate
      default:
        return 2000; // Generous
    }
  }

  /**
   * Get default rate limit based on compliance framework
   */
  private getDefaultRateLimit(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 100; // Conservative
      case 'fedramp-moderate':
        return 200; // Moderate
      default:
        return 500; // Generous
    }
  }
}

/**
 * Standalone API Gateway Component implementing Component API Contract v1.0
 */
export class ApiGatewayComponent extends Component {
  private api?: apigateway.RestApi;
  private deployment?: apigateway.Deployment;
  private stage?: apigateway.Stage;
  private authorizer?: apigateway.CognitoUserPoolsAuthorizer;
  private logGroup?: logs.LogGroup;
  private config?: ApiGatewayConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create standalone API Gateway with advanced configuration
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting API Gateway synthesis');
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new ApiGatewayConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Create log group if logging is enabled
      this.createLogGroupIfNeeded();
      
      // Create API Gateway
      this.createApiGateway();
      
      // Create Cognito authorizer if configured
      this.createCognitoAuthorizerIfNeeded();
      
      // Configure logging
      this.configureLogging();
      
      // Configure tracing
      this.configureTracing();
      
      // Configure observability
      this.configureApiGatewayObservability();
      
      // Apply compliance hardening
      this.applyComplianceHardening();
      
      // Register constructs
      this.registerConstruct('api', this.api!);
      this.registerConstruct('stage', this.stage!);
      if (this.authorizer) {
        this.registerConstruct('authorizer', this.authorizer);
      }
      if (this.logGroup) {
        this.registerConstruct('logGroup', this.logGroup);
      }
      
      // Register capabilities
      this.registerCapability('api:rest', this.buildApiCapability());
      
      this.logComponentEvent('synthesis_complete', 'API Gateway synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'API Gateway synthesis');
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'api-gateway';
  }

  /**
   * Create CloudWatch log group if logging is enabled
   */
  private createLogGroupIfNeeded(): void {
    if (!this.config!.logging?.accessLogging?.enabled && !this.config!.logging?.executionLogging?.enabled) {
      return;
    }

    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/apigateway/${this.context.serviceName}-${this.spec.name}`,
      retention: this.getLogRetention(),
      removalPolicy: this.context.complianceFramework.startsWith('fedramp') ? 
        cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Apply standard tags
    this.applyStandardTags(this.logGroup, {
      'log-type': 'api-gateway'
    });

    this.logResourceCreation('log-group', this.logGroup.logGroupName, {
      retention: this.getLogRetention()
    });
  }

  /**
   * Create API Gateway REST API
   */
  private createApiGateway(): void {
    const apiName = this.config!.apiName || `${this.context.serviceName}-${this.spec.name}`;

    this.api = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: apiName,
      description: this.config!.description,
      deployOptions: {
        stageName: this.config!.deploymentStage || 'prod',
        throttlingBurstLimit: this.config!.throttling?.burstLimit,
        throttlingRateLimit: this.config!.throttling?.rateLimit,
        tracingEnabled: this.config!.tracing?.xrayEnabled
      },
      defaultCorsPreflightOptions: this.config!.cors ? {
        allowOrigins: this.config!.cors.allowOrigins || [],
        allowMethods: this.config!.cors.allowMethods || [],
        allowHeaders: this.config!.cors.allowHeaders || [],
        allowCredentials: this.config!.cors.allowCredentials
      } : undefined,
      apiKeySourceType: this.config!.authentication?.apiKey?.required ? 
        apigateway.ApiKeySourceType.HEADER : undefined
    });

    // Get the deployment stage
    this.stage = this.api.deploymentStage;

    // Apply standard tags
    this.applyStandardTags(this.api, {
      'api-type': 'rest',
      'deployment-stage': this.config!.deploymentStage || 'prod'
    });

    this.logResourceCreation('api-gateway', apiName, {
      stageName: this.config!.deploymentStage,
      corsEnabled: !!this.config!.cors,
      tracingEnabled: this.config!.tracing?.xrayEnabled
    });
  }

  /**
   * Create Cognito User Pool authorizer if configured
   */
  private createCognitoAuthorizerIfNeeded(): void {
    if (!this.config!.authentication?.cognito?.userPoolArn) {
      return;
    }

    const userPool = cognito.UserPool.fromUserPoolArn(
      this, 
      'UserPool', 
      this.config!.authentication!.cognito!.userPoolArn!
    );

    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: `${this.spec.name}-cognito-authorizer`,
      identitySource: 'method.request.header.Authorization'
    });

    this.logResourceCreation('cognito-authorizer', this.authorizer.authorizerArn, {
      userPoolArn: this.config!.authentication!.cognito!.userPoolArn,
      scopes: this.config!.authentication!.cognito!.scopes
    });
  }

  /**
   * Configure API Gateway logging
   */
  private configureLogging(): void {
    if (!this.config!.logging?.accessLogging?.enabled && !this.config!.logging?.executionLogging?.enabled) {
      return;
    }

    const cfnStage = this.stage!.node.defaultChild as apigateway.CfnStage;

    // Configure access logging
    if (this.config!.logging?.accessLogging?.enabled && this.logGroup) {
      cfnStage.accessLogSetting = {
        destinationArn: this.logGroup.logGroupArn,
        format: this.config!.logging.accessLogging.format || JSON.stringify({
          requestId: '$context.requestId',
          ip: '$context.identity.sourceIp',
          user: '$context.identity.user',
          requestTime: '$context.requestTime',
          httpMethod: '$context.httpMethod',
          resourcePath: '$context.resourcePath',
          status: '$context.status',
          protocol: '$context.protocol',
          responseLength: '$context.responseLength'
        })
      };
    }

    // Configure execution logging
    if (this.config!.logging?.executionLogging?.enabled) {
      cfnStage.methodSettings = [{
        resourcePath: '/*/*',
        httpMethod: '*',
        loggingLevel: this.config!.logging.executionLogging.level || 'INFO',
        dataTraceEnabled: this.config!.logging.executionLogging.dataTrace || false,
        metricsEnabled: true
      }];
    }

    this.logComponentEvent('logging_configured', 'API Gateway logging configured', {
      accessLogging: this.config!.logging?.accessLogging?.enabled,
      executionLogging: this.config!.logging?.executionLogging?.enabled,
      level: this.config!.logging?.executionLogging?.level
    });
  }

  /**
   * Configure X-Ray tracing
   */
  private configureTracing(): void {
    if (!this.config!.tracing?.xrayEnabled) {
      return;
    }

    // X-Ray tracing is already configured in deployOptions during API creation
    this.logComponentEvent('tracing_configured', 'X-Ray tracing enabled for API Gateway', {
      xrayEnabled: true
    });
  }

  /**
   * Configure CloudWatch observability for API Gateway
   */
  private configureApiGatewayObservability(): void {
    if (!this.config!.monitoring?.enabled) {
      return;
    }

    const apiName = this.api!.restApiName;
    const stageName = this.config!.deploymentStage || 'prod';

    // 1. 5XX Error Rate Alarm
    new cloudwatch.Alarm(this, 'Error5xxAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-5xx-errors`,
      alarmDescription: 'API Gateway 5XX error rate alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiName: apiName,
          Stage: stageName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: this.config!.monitoring!.alarms?.error5xxThreshold || 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 2. P90 Latency Alarm
    new cloudwatch.Alarm(this, 'LatencyP90Alarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-latency-p90`,
      alarmDescription: 'API Gateway P90 latency alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: {
          ApiName: apiName,
          Stage: stageName
        },
        statistic: 'p90',
        period: cdk.Duration.minutes(5)
      }),
      threshold: this.config!.monitoring!.alarms?.latencyP90Threshold || 5000,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 3. Request Count Alarm (detect traffic drops)
    new cloudwatch.Alarm(this, 'RequestCountAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-request-count`,
      alarmDescription: 'API Gateway request count monitoring',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Count',
        dimensionsMap: {
          ApiName: apiName,
          Stage: stageName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: this.config!.monitoring!.alarms?.countThreshold || 100,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to API Gateway', {
      alarmsCreated: 3,
      apiName: apiName,
      stageName: stageName,
      monitoringEnabled: true
    });
  }

  /**
   * Apply compliance hardening based on framework
   */
  private applyComplianceHardening(): void {
    if (!this.api) return;

    switch (this.context.complianceFramework) {
      case 'fedramp-high':
      case 'fedramp-moderate':
        // For FedRAMP environments, ensure API has proper logging and security
        const cfnApi = this.api.node.defaultChild as apigateway.CfnRestApi;
        cfnApi.addMetadata('ComplianceFramework', this.context.complianceFramework);
        
        this.logComponentEvent('compliance_hardening_applied', 'FedRAMP compliance hardening applied', {
          framework: this.context.complianceFramework,
          loggingEnabled: this.config!.logging?.accessLogging?.enabled,
          tracingEnabled: this.config!.tracing?.xrayEnabled
        });
        break;
        
      default:
        // No special hardening needed for commercial
        break;
    }
  }

  /**
   * Build API Gateway capability descriptor
   */
  private buildApiCapability(): any {
    return {
      type: 'api:rest',
      apiName: this.api!.restApiName,
      apiId: this.api!.restApiId,
      rootResourceId: this.api!.restApiRootResourceId,
      stageName: this.config!.deploymentStage || 'prod',
      endpoint: this.api!.url,
      cognitoAuthorizer: this.authorizer ? {
        authorizerArn: this.authorizer.authorizerArn,
        userPoolArn: this.config!.authentication?.cognito?.userPoolArn
      } : undefined
    };
  }

  /**
   * Get log retention period based on compliance framework
   */
  private getLogRetention(): logs.RetentionDays {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return logs.RetentionDays.ONE_YEAR;
      case 'fedramp-moderate':
        return logs.RetentionDays.THREE_MONTHS;
      default:
        return logs.RetentionDays.ONE_MONTH;
    }
  }
}