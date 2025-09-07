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
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  ConfigBuilder,
  ComponentConfigSchema,
  LambdaFunctionCapability,
  ApiRestCapability
} from '../../contracts';

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
export const LAMBDA_API_CONFIG_SCHEMA: ComponentConfigSchema = {
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
    }
  },
  additionalProperties: false,
  defaults: {
    runtime: 'nodejs20.x',
    memory: 512,
    timeout: 30,
    codePath: './src'
  }
};

/**
 * Configuration builder for Lambda API component
 */
export class LambdaApiConfigBuilder extends ConfigBuilder<LambdaApiConfig> {
  constructor(context: any) {
    super(context, LAMBDA_API_CONFIG_SCHEMA);
  }

  async build(): Promise<LambdaApiConfig> {
    // Apply schema defaults
    let config = { ...LAMBDA_API_CONFIG_SCHEMA.defaults, ...this.context.spec.config };
    
    // Apply compliance defaults
    config = this.applyComplianceDefaults(config);
    
    // Resolve environment interpolations
    config = this.resolveEnvironmentInterpolations(config);
    
    // Validate final configuration
    const validationResult = this.validateConfiguration(config);
    if (!validationResult.valid) {
      throw new Error(`Invalid Lambda API configuration: ${validationResult.errors?.map(e => e.message).join(', ')}`);
    }
    
    return config as LambdaApiConfig;
  }

  // Using inherited applyComplianceDefaults from ConfigBuilder base class
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
    // Build configuration
    this.config = this.buildConfigSync();
    
    // Create KMS key for encryption if needed
    this.createKmsKeyIfNeeded();
    
    // Create Lambda function
    this.createLambdaFunction();
    
    // Create API Gateway
    this.createApiGateway();
    
    // Apply compliance hardening
    this.applyComplianceHardening();
    
    // Register constructs
    this.registerConstruct('lambdaFunction', this.lambdaFunction!);
    this.registerConstruct('api', this.api!);
    if (this.kmsKey) {
      this.registerConstruct('kmsKey', this.kmsKey);
    }
    
    // Register capabilities
    this.registerCapability('lambda:function', this.buildLambdaCapability());
    this.registerCapability('api:rest', this.buildApiCapability());
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
      tracing: this.shouldEnableXRayTracing() ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED
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
  private buildLambdaCapability(): LambdaFunctionCapability {
    return {
      functionArn: this.lambdaFunction!.functionArn,
      functionName: this.lambdaFunction!.functionName,
      roleArn: this.lambdaFunction!.role!.roleArn
    };
  }

  /**
   * Build API REST capability data shape
   */
  private buildApiCapability(): ApiRestCapability {
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

  private shouldEnableXRayTracing(): boolean {
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
   * Simplified config building for demo purposes
   */
  private buildConfigSync(): LambdaApiConfig {
    const config: LambdaApiConfig = {
      handler: this.spec.config?.handler || 'index.handler',
      runtime: this.spec.config?.runtime || 'nodejs20.x',
      memory: this.spec.config?.memory || 512,
      timeout: this.spec.config?.timeout || 30,
      codePath: this.spec.config?.codePath || './src',
      environmentVariables: this.spec.config?.environmentVariables || {},
      api: this.spec.config?.api || {},
      security: this.spec.config?.security || {}
    };

    return config;
  }
}