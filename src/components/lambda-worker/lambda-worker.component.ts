/**
 * Lambda Worker Component
 * 
 * A Lambda function for asynchronous background processing workloads.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
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
  LambdaFunctionCapability
} from '../../contracts';

/**
 * Configuration interface for Lambda Worker component
 */
export interface LambdaWorkerConfig {
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
  
  /** Reserved concurrency */
  reservedConcurrency?: number;
  
  /** Dead letter queue configuration */
  deadLetterQueue?: {
    enabled: boolean;
    maxReceiveCount?: number;
  };
  
  /** VPC configuration for FedRAMP deployments */
  vpc?: {
    vpcId?: string;
    subnetIds?: string[];
    securityGroupIds?: string[];
  };
  
  /** Encryption configuration */
  encryption?: {
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
 * Configuration schema for Lambda Worker component
 */
export const LAMBDA_WORKER_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  title: 'Lambda Worker Configuration',
  description: 'Configuration for creating a Lambda function for background processing',
  required: ['handler'],
  properties: {
    handler: {
      type: 'string',
      description: 'Lambda function handler (e.g., "worker.handler")',
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
      default: 256
    },
    timeout: {
      type: 'number',
      description: 'Function timeout in seconds',
      minimum: 1,
      maximum: 900,
      default: 300
    },
    reservedConcurrency: {
      type: 'number',
      description: 'Reserved concurrency for the function',
      minimum: 0,
      maximum: 1000
    }
  },
  additionalProperties: false,
  defaults: {
    runtime: 'nodejs20.x',
    memory: 256,
    timeout: 300,
    codePath: './src'
  }
};

/**
 * Lambda Worker Component implementing Component API Contract v1.0
 */
export class LambdaWorkerComponent extends Component {
  private lambdaFunction?: lambda.Function;
  private kmsKey?: kms.Key;
  private config?: LambdaWorkerConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create Lambda function for background processing
   */
  public synth(): void {
    // Build configuration
    this.config = this.buildConfigSync();
    
    // Create KMS key for encryption if needed
    this.createKmsKeyIfNeeded();
    
    // Create Lambda function
    this.createLambdaFunction();
    
    // Apply compliance hardening
    this.applyComplianceHardening();
    
    // Register constructs
    this.registerConstruct('lambdaFunction', this.lambdaFunction!);
    if (this.kmsKey) {
      this.registerConstruct('kmsKey', this.kmsKey);
    }
    
    // Register capabilities
    this.registerCapability('lambda:function', this.buildLambdaCapability());
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
    return 'lambda-worker';
  }

  /**
   * Create KMS key for encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    if (this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        description: `Encryption key for ${this.spec.name} Lambda worker`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
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
      memorySize: this.config!.memory || 256,
      timeout: cdk.Duration.seconds(this.config!.timeout || 300),
      environment: this.config!.environmentVariables || {},
      description: `Lambda worker function for ${this.spec.name}`,
      tracing: this.shouldEnableXRayTracing() ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      reservedConcurrentExecutions: this.config!.reservedConcurrency
    };

    // Apply encryption for environment variables
    if (this.kmsKey) {
      props.environmentEncryption = this.kmsKey;
    }

    this.lambdaFunction = new lambda.Function(this, 'LambdaFunction', props);
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
    new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${this.lambdaFunction!.functionName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
  }

  private applyFedrampModerateHardening(): void {
    // Enhanced logging with longer retention
    new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${this.lambdaFunction!.functionName}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Enable X-Ray tracing for auditability
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
    new logs.LogGroup(this, 'AuditLogGroup', {
      logGroupName: `/aws/lambda/${this.lambdaFunction!.functionName}/audit`,
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Add STIG compliance configuration
    if (this.lambdaFunction) {
      this.lambdaFunction.addEnvironment('STIG_COMPLIANCE', 'true');
      this.lambdaFunction.addEnvironment('SECURITY_LEVEL', 'high');
    }

    // Restrict network access to VPC endpoints only
    // This would be implemented with VPC endpoint policies in real deployment
  }

  /**
   * Attach Falco security monitoring layer
   */
  private attachFalcoLayer(): void {
    if (this.lambdaFunction) {
      // In real implementation, this would reference a pre-approved Falco layer ARN
      this.lambdaFunction.addEnvironment('FALCO_ENABLED', 'true');
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
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private shouldEnableXRayTracing(): boolean {
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
  private buildConfigSync(): LambdaWorkerConfig {
    const config: LambdaWorkerConfig = {
      handler: this.spec.config?.handler || 'worker.handler',
      runtime: this.spec.config?.runtime || 'nodejs20.x',
      memory: this.spec.config?.memory || 256,
      timeout: this.spec.config?.timeout || 300,
      codePath: this.spec.config?.codePath || './src',
      environmentVariables: this.spec.config?.environmentVariables || {},
      reservedConcurrency: this.spec.config?.reservedConcurrency,
      security: this.spec.config?.security || {}
    };

    return config;
  }
}