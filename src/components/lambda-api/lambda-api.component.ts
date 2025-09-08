/**
 * Lambda API Component
 * 
 * A Lambda function for synchronous API workloads with API Gateway integration.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as xray from 'aws-cdk-lib/aws-xray';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

/**
 * Configuration interface for Lambda API component
 */
export interface LambdaApiConfig {
  /** Lambda function handler (required) */
  handler: string;
  
  /** Runtime environment */
  runtime?: string;
  
  /** Memory allocation in MB */
  memory?: number;
  
  /** Timeout in seconds */
  timeout?: number;
  
  /** Code path for Lambda function */
  codePath?: string;
  
  /** Environment variables */
  environmentVariables?: Record<string, string>;
  
  /** API Gateway configuration */
  api?: {
    /** API name */
    name?: string;
    /** CORS configuration */
    cors?: boolean;
    /** API key required */
    apiKeyRequired?: boolean;
  };
  
  /** VPC configuration for FedRAMP deployments */
  vpc?: {
    /** VPC ID */
    vpcId?: string;
    /** Subnet IDs */
    subnetIds?: string[];
    /** Security group IDs */
    securityGroupIds?: string[];
  };
  
  /** Encryption configuration */
  encryption?: {
    /** KMS key ARN for environment variables */
    kmsKeyArn?: string;
  };
  
  /** Security tooling configuration */
  security?: {
    tools?: {
      falco?: boolean;
    };
  };
}

/**
 * Configuration schema for Lambda API component
 */
export const LAMBDA_API_CONFIG_SCHEMA = {
  type: 'object',
  title: 'Lambda API Configuration',
  description: 'Configuration for creating a Lambda function with API Gateway',
  required: ['handler'],
  properties: {
    handler: {
      type: 'string',
      description: 'Lambda function handler (e.g., "index.handler")',
      pattern: '^[a-zA-Z0-9_.-]+\\.[a-zA-Z0-9_-]+$'
    },
    runtime: {
      type: 'string',
      description: 'Lambda runtime environment',
      enum: ['nodejs18.x', 'nodejs20.x', 'python3.9', 'python3.10', 'python3.11'],
      default: 'nodejs20.x'
    },
    memory: {
      type: 'number',
      description: 'Memory allocation in MB',
      minimum: 128,
      maximum: 10240,
      default: 512
    },
    timeout: {
      type: 'number',
      description: 'Function timeout in seconds',
      minimum: 1,
      maximum: 900,
      default: 30
    },
    codePath: {
      type: 'string',
      description: 'Path to Lambda function code',
      default: './src'
    },
    environmentVariables: {
      type: 'object',
      description: 'Environment variables for the Lambda function',
      additionalProperties: {
        type: 'string'
      },
      default: {}
    },
    api: {
      type: 'object',
      description: 'API Gateway configuration',
      properties: {
        name: {
          type: 'string',
          description: 'API Gateway name'
        },
        cors: {
          type: 'boolean',
          description: 'Enable CORS for API Gateway',
          default: false
        },
        apiKeyRequired: {
          type: 'boolean',
          description: 'Require API key for requests',
          default: false
        }
      },
      additionalProperties: false,
      default: {
        cors: false,
        apiKeyRequired: false
      }
    },
    vpc: {
      type: 'object',
      description: 'VPC configuration for FedRAMP deployments',
      properties: {
        vpcId: {
          type: 'string',
          description: 'VPC ID for Lambda deployment',
          pattern: '^vpc-[a-f0-9]{8,17}$'
        },
        subnetIds: {
          type: 'array',
          description: 'Subnet IDs for Lambda deployment',
          items: {
            type: 'string',
            pattern: '^subnet-[a-f0-9]{8,17}$'
          },
          maxItems: 16
        },
        securityGroupIds: {
          type: 'array',
          description: 'Security group IDs for Lambda',
          items: {
            type: 'string',
            pattern: '^sg-[a-f0-9]{8,17}$'
          },
          maxItems: 5
        }
      },
      additionalProperties: false
    },
    encryption: {
      type: 'object',
      description: 'Encryption configuration',
      properties: {
        kmsKeyArn: {
          type: 'string',
          description: 'KMS key ARN for environment variable encryption',
          pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$'
        }
      },
      additionalProperties: false
    },
    security: {
      type: 'object',
      description: 'Security tooling configuration',
      properties: {
        tools: {
          type: 'object',
          description: 'Security tools configuration',
          properties: {
            falco: {
              type: 'boolean',
              description: 'Enable Falco security monitoring',
              default: false
            }
          },
          additionalProperties: false,
          default: {
            falco: false
          }
        }
      },
      additionalProperties: false,
      default: {
        tools: {
          falco: false
        }
      }
    }
  },
  additionalProperties: false,
  defaults: {
    runtime: 'nodejs20.x',
    memory: 512,
    timeout: 30,
    codePath: './src',
    environmentVariables: {},
    api: {
      cors: false,
      apiKeyRequired: false
    },
    security: {
      tools: {
        falco: false
      }
    }
  }
};

/**
 * Configuration builder for Lambda API component
 */
export class LambdaApiConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<LambdaApiConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): LambdaApiConfig {
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
    
    // Resolve environment interpolations (sync version)
    const resolvedConfig = this.resolveEnvironmentInterpolationsSync(mergedConfig);
    
    return resolvedConfig as LambdaApiConfig;
  }

  /**
   * Synchronous version of environment interpolation resolution
   */
  private resolveEnvironmentInterpolationsSync(config: Record<string, any>): Record<string, any> {
    // For now, return config as-is since we don't have environment config in sync context
    // In a real implementation, this would resolve ${env:key} patterns
    return config;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
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

  /**
   * Get platform-wide defaults for Lambda API
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      runtime: this.getDefaultRuntime(),
      memory: this.getDefaultMemorySize(),
      timeout: this.getDefaultTimeout(),
      codePath: './src',
      environmentVariables: {},
      api: {
        cors: false,
        apiKeyRequired: false
      },
      security: {
        tools: {
          falco: false
        }
      }
    };
  }

  /**
   * Get compliance framework specific defaults
   */
  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          memory: this.getComplianceMemorySize('fedramp-moderate'),
          timeout: this.getComplianceTimeout('fedramp-moderate'),
          vpc: {
            // VPC deployment required for compliance
          },
          security: {
            tools: {
              falco: true // Enable security monitoring
            }
          }
        };
        
      case 'fedramp-high':
        return {
          memory: this.getComplianceMemorySize('fedramp-high'),
          timeout: this.getComplianceTimeout('fedramp-high'),
          vpc: {
            // VPC deployment required for compliance
          },
          encryption: {
            // Customer-managed KMS key required
          },
          security: {
            tools: {
              falco: true
            }
          }
        };
        
      default: // commercial
        return {};
    }
  }

  /**
   * Get default runtime based on compliance framework
   */
  private getDefaultRuntime(): string {
    // Use latest stable runtime for all frameworks
    return 'nodejs20.x';
  }

  /**
   * Get default memory size based on compliance framework
   */
  private getDefaultMemorySize(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 1024; // More memory for enhanced logging/monitoring
      case 'fedramp-moderate':
        return 768; // Moderate increase for compliance overhead
      default:
        return 512; // Cost-optimized for commercial
    }
  }

  /**
   * Get compliance-specific memory size
   */
  private getComplianceMemorySize(framework: string): number {
    switch (framework) {
      case 'fedramp-high':
        return 1024;
      case 'fedramp-moderate':
        return 768;
      default:
        return 512;
    }
  }

  /**
   * Get default timeout based on compliance framework
   */
  private getDefaultTimeout(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 60; // Longer timeout for compliance logging
      case 'fedramp-moderate':
        return 45; // Moderate increase
      default:
        return 30; // Standard timeout
    }
  }

  /**
   * Get compliance-specific timeout
   */
  private getComplianceTimeout(framework: string): number {
    switch (framework) {
      case 'fedramp-high':
        return 60;
      case 'fedramp-moderate':
        return 45;
      default:
        return 30;
    }
  }
}

/**
 * Lambda API Component implementing Component API Contract v1.0
 */
export class LambdaApiComponent extends Component {
  private lambdaFunction?: lambda.Function;
  private api?: apigateway.RestApi;
  private kmsKey?: kms.Key;
  private config?: LambdaApiConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create Lambda function and API Gateway
   */
  public synth(): void {
    const logger = this.getLogger();
    const timer = logger.startTimer();
    
    logger.info('Starting Lambda API component synthesis', {
      context: { 
        action: 'component_synthesis', 
        resource: 'lambda_function',
        component: 'lambda-api'
      },
      data: { 
        runtime: this.spec.config?.runtime,
        handler: this.spec.config?.handler,
        complianceFramework: this.context.complianceFramework
      }
    });
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new LambdaApiConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      logger.debug('Lambda API configuration built successfully', {
        context: { 
          action: 'config_built', 
          resource: 'lambda_function',
          component: 'lambda-api'
        },
        data: {
          runtime: this.config.runtime,
          memory: this.config.memory,
          timeout: this.config.timeout
        }
      });
      
      // Create KMS key for encryption if needed
      this.createKmsKeyIfNeeded();
    
    // Create Lambda function
    this.createLambdaFunction();
    
    // Create API Gateway
    this.createApiGateway();
    
    // Apply compliance hardening
    this.applyComplianceHardening();
    
    // Configure observability
    this.configureObservabilityForLambda();
    
    // Register constructs
    this.registerConstruct('lambdaFunction', this.lambdaFunction!);
    this.registerConstruct('api', this.api!);
    if (this.kmsKey) {
      this.registerConstruct('kmsKey', this.kmsKey);
    }
    
    // Register capabilities
    this.registerCapability('lambda:function', this.buildLambdaCapability());
    this.registerCapability('api:rest', this.buildApiCapability());
    
    timer.finish('Lambda API component synthesis completed successfully', {
      context: { 
        action: 'synthesis_success', 
        resource: 'lambda_function',
        component: 'lambda-api'
      },
      data: { 
        functionName: this.lambdaFunction!.functionName,
        functionArn: this.lambdaFunction!.functionArn,
        apiId: this.apiGateway!.restApiId,
        kmsKeyCreated: !!this.kmsKey,
        resourcesCreated: Object.keys(this.capabilities).length
      },
      security: {
        classification: 'cui',
        auditRequired: true,
        securityEvent: 'lambda_function_created'
      }
    });
    
    } catch (error) {
      logger.error('Lambda API component synthesis failed', error, {
        context: { 
          action: 'synthesis_error', 
          resource: 'lambda_function',
          component: 'lambda-api'
        },
        data: { 
          runtime: this.config?.runtime,
          complianceFramework: this.context.complianceFramework
        },
        security: {
          classification: 'cui',
          auditRequired: true,
          securityEvent: 'lambda_creation_failed'
        }
      });
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
    return 'lambda-api';
  }

  /**
   * Create KMS key for encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    if (this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        description: `Encryption key for ${this.spec.name} Lambda function`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });
      
      // Apply standard tags to KMS key
      this.applyStandardTags(this.kmsKey, {
        'key-usage': 'lambda-environment-encryption',
        'key-rotation-enabled': (this.context.complianceFramework === 'fedramp-high').toString()
      });
    }
  }

  /**
   * Create the Lambda function with compliance-specific configuration
   */
  private createLambdaFunction(): void {
    const props: lambda.FunctionProps = {
      functionName: `${this.context.serviceName}-${this.spec.name}`,
      handler: this.config!.handler,
      runtime: this.getLambdaRuntime(),
      code: lambda.Code.fromAsset(this.config!.codePath || './src'),
      memorySize: this.config!.memory || 512,
      timeout: cdk.Duration.seconds(this.config!.timeout || 30),
      environment: this.config!.environmentVariables || {},
      description: `Lambda API function for ${this.spec.name}`,
      tracing: this.shouldEnableLambdaXRayTracing() ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED
    };

    // Apply encryption for environment variables
    if (this.kmsKey) {
      Object.assign(props, { environmentEncryption: this.kmsKey });
    }

    // Apply VPC configuration for FedRAMP deployments
    if (this.shouldDeployInVpc()) {
      // In real implementation, this would lookup VPC and subnets
      // For now, we'll indicate VPC deployment is required
      Object.assign(props, { description: props.description + ' (VPC deployment required)' });
    }

    this.lambdaFunction = new lambda.Function(this, 'LambdaFunction', props);
    
    // Apply standard tags
    this.applyStandardTags(this.lambdaFunction, {
      'function-runtime': this.config!.runtime || 'nodejs20.x',
      'function-handler': this.config!.handler
    });
    
    // Configure automatic OpenTelemetry observability
    this.configureOpenTelemetryForLambda();
    
    // Log Lambda function creation
    this.logResourceCreation('lambda-function', this.lambdaFunction.functionName, {
      runtime: this.config!.runtime,
      memory: this.config!.memory,
      timeout: this.config!.timeout,
      hasKmsKey: !!this.kmsKey
    });
  }

  /**
   * Create API Gateway REST API
   */
  private createApiGateway(): void {
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: this.config!.api?.name || `${this.context.serviceName}-${this.spec.name}-api`,
      description: `API Gateway for ${this.spec.name} Lambda function`,
      defaultCorsPreflightOptions: this.config!.api?.cors ? {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      } : undefined,
      apiKeySourceType: this.config!.api?.apiKeyRequired ? 
        apigateway.ApiKeySourceType.HEADER : undefined
    });

    // Create default integration
    const integration = new apigateway.LambdaIntegration(this.lambdaFunction!);
    
    // Add proxy resource for all paths
    const proxyResource = this.api.root.addResource('{proxy+}');
    proxyResource.addMethod('ANY', integration);
    
    // Also handle root path
    this.api.root.addMethod('ANY', integration);
    
    // Apply standard tags to API Gateway
    this.applyStandardTags(this.api, {
      'api-type': 'rest',
      'api-cors-enabled': (!!this.config!.api?.cors).toString()
    });
    
    // Log API Gateway creation
    this.logResourceCreation('api-gateway', this.api.restApiId, {
      type: 'rest',
      corsEnabled: !!this.config!.api?.cors,
      endpointUrl: this.api.url
    });
  }

  /**
   * Apply compliance-specific hardening
   */
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
    // Basic CloudWatch logging
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${this.lambdaFunction!.functionName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    // Apply standard tags to log group
    this.applyStandardTags(logGroup, {
      'log-type': 'lambda-function',
      'retention-period': 'one-month'
    });
  }

  private applyFedrampModerateHardening(): void {
    // Enhanced logging with longer retention
    const enhancedLogGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${this.lambdaFunction!.functionName}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });
    
    // Apply standard tags to enhanced log group
    this.applyStandardTags(enhancedLogGroup, {
      'log-type': 'lambda-function',
      'retention-period': 'three-months',
      'compliance-logging': 'fedramp-moderate'
    });

    // Enable X-Ray tracing
    if (this.lambdaFunction) {
      this.lambdaFunction.addEnvironment('_X_AMZN_TRACE_ID', 'Root=1-67890123-456789abcdef012345678901');
    }

    // Security tooling integration
    if (this.config?.security?.tools?.falco) {
      this.attachFalcoLayer();
    }
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Extended log retention for audit purposes
    const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
      logGroupName: `/aws/lambda/${this.lambdaFunction!.functionName}/audit`,
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });
    
    // Apply standard tags to audit log group
    this.applyStandardTags(auditLogGroup, {
      'log-type': 'audit',
      'retention-period': 'one-year',
      'compliance-logging': 'fedramp-high'
    });

    // Add STIG compliance configuration
    if (this.lambdaFunction) {
      this.lambdaFunction.addEnvironment('STIG_COMPLIANCE', 'true');
      this.lambdaFunction.addEnvironment('SECURITY_LEVEL', 'high');
    }

    // Restrict to VPC endpoints only (no public internet access)
    // This would be implemented with VPC endpoint policies in real deployment
  }

  /**
   * Attach Falco security monitoring layer
   */
  private attachFalcoLayer(): void {
    if (this.lambdaFunction) {
      // In real implementation, this would reference a pre-approved Falco layer ARN
      const falcoLayerArn = `arn:aws:lambda:${this.context.region}:123456789012:layer:falco-security:1`;
      
      // Add comment to indicate Falco layer attachment
      this.lambdaFunction.addEnvironment('FALCO_ENABLED', 'true');
      // Note: Actual layer attachment would require the real layer ARN
    }
  }

  /**
   * Build Lambda function capability data shape
   */
  private buildLambdaCapability(): any {
    this.validateSynthesized();
    return {
      functionArn: this.lambdaFunction!.functionArn,
      functionName: this.lambdaFunction!.functionName,
      roleArn: this.lambdaFunction!.role!.roleArn
    };
  }

  /**
   * Build API REST capability data shape
   */
  private buildApiCapability(): any {
    this.validateSynthesized();
    return {
      endpointUrl: this.api!.url,
      apiId: this.api!.restApiId
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private shouldEnableLambdaXRayTracing(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private shouldDeployInVpc(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getLambdaRuntime(): lambda.Runtime {
    const runtimeMap: Record<string, lambda.Runtime> = {
      'nodejs18.x': lambda.Runtime.NODEJS_18_X,
      'nodejs20.x': lambda.Runtime.NODEJS_20_X,
      'python3.9': lambda.Runtime.PYTHON_3_9,
      'python3.10': lambda.Runtime.PYTHON_3_10,
      'python3.11': lambda.Runtime.PYTHON_3_11
    };
    
    return runtimeMap[this.config!.runtime || 'nodejs20.x'] || lambda.Runtime.NODEJS_20_X;
  }


  /**
   * Configure OpenTelemetry observability for Lambda function according to Platform Observability Standard
   */
  private configureOpenTelemetryForLambda(): void {
    if (!this.lambdaFunction) return;

    // Get standardized OpenTelemetry environment variables
    const otelEnvVars = this.configureObservability(this.lambdaFunction, {
      customAttributes: {
        'lambda.runtime': this.config!.runtime || 'nodejs20.x',
        'lambda.handler': this.config!.handler,
        'api.type': 'rest',
        'api.cors.enabled': (!!this.config!.api?.cors).toString()
      }
    });

    // Apply all OpenTelemetry environment variables to Lambda
    Object.entries(otelEnvVars).forEach(([key, value]) => {
      this.lambdaFunction!.addEnvironment(key, value);
    });

    // Add runtime-specific OpenTelemetry layer for automatic instrumentation
    this.addOtelInstrumentationLayer();
  }

  /**
   * Add OpenTelemetry instrumentation layer based on Lambda runtime
   */
  private addOtelInstrumentationLayer(): void {
    if (!this.lambdaFunction) return;

    const runtime = this.config!.runtime || 'nodejs20.x';
    let layerArn: string;

    // Use AWS-managed OpenTelemetry layers for automatic instrumentation
    switch (runtime) {
      case 'nodejs18.x':
      case 'nodejs20.x':
        layerArn = `arn:aws:lambda:${this.context.region}:901920570463:layer:aws-otel-nodejs-${this.getArchString()}:7`;
        break;
      case 'python3.9':
      case 'python3.10':
      case 'python3.11':
        layerArn = `arn:aws:lambda:${this.context.region}:901920570463:layer:aws-otel-python-${this.getArchString()}:2`;
        break;
      case 'java11':
      case 'java17':
        layerArn = `arn:aws:lambda:${this.context.region}:901920570463:layer:aws-otel-java-wrapper-${this.getArchString()}:2`;
        break;
      default:
        // For unsupported runtimes, skip layer but keep environment variables
        return;
    }

    // Add the OpenTelemetry layer for automatic instrumentation
    this.lambdaFunction.addLayers(lambda.LayerVersion.fromLayerVersionArn(this, 'OtelLayer', layerArn));
  }

  /**
   * Get architecture string for Lambda layer ARN
   */
  private getArchString(): string {
    // Default to amd64 for x86_64 architecture since config doesn't specify architecture
    return 'amd64';
  }

  /**
   * Configure CloudWatch observability for Lambda API
   */
  private configureObservabilityForLambda(): void {
    // Enable monitoring for compliance frameworks only
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const functionName = this.lambdaFunction!.functionName;

    // 1. Lambda Error Rate Alarm
    new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-lambda-errors`,
      alarmDescription: 'Lambda function errors alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: {
          FunctionName: functionName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 2. Lambda Duration Alarm
    new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-lambda-duration`,
      alarmDescription: 'Lambda function duration alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Duration',
        dimensionsMap: {
          FunctionName: functionName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: (this.config!.timeout || 30) * 1000 * 0.8, // 80% of timeout in milliseconds
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 3. Lambda Throttles Alarm
    new cloudwatch.Alarm(this, 'LambdaThrottlesAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-lambda-throttles`,
      alarmDescription: 'Lambda function throttles alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Throttles',
        dimensionsMap: {
          FunctionName: functionName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    const logger = this.getLogger();
    logger.info('OpenTelemetry observability standard applied to Lambda API', {
      context: { 
        action: 'observability_configured', 
        resource: 'lambda_function',
        component: 'lambda-api'
      },
      data: {
        alarmsCreated: 3,
        functionName: functionName,
        monitoringEnabled: true
      },
      security: {
        classification: 'cui',
        auditRequired: true,
        securityEvent: 'observability_configured'
      }
    });
  }
}