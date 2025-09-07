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
  ComponentCapabilities
} from '@platform/contracts';

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
export const LAMBDA_WORKER_CONFIG_SCHEMA = {
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
    reservedConcurrency: {
      type: 'number',
      description: 'Reserved concurrency for the function',
      minimum: 0,
      maximum: 1000
    },
    deadLetterQueue: {
      type: 'object',
      description: 'Dead letter queue configuration for failed invocations',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable dead letter queue',
          default: false
        },
        maxReceiveCount: {
          type: 'number',
          description: 'Maximum receive count before sending to DLQ',
          minimum: 1,
          maximum: 1000,
          default: 3
        }
      },
      additionalProperties: false,
      default: {
        enabled: false,
        maxReceiveCount: 3
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
    memory: 256,
    timeout: 300,
    codePath: './src',
    environmentVariables: {},
    deadLetterQueue: {
      enabled: false,
      maxReceiveCount: 3
    },
    security: {
      tools: {
        falco: false
      }
    }
  }
};

/**
 * Configuration builder for Lambda Worker component
 */
export class LambdaWorkerConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<LambdaWorkerConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): LambdaWorkerConfig {
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
    
    return resolvedConfig as LambdaWorkerConfig;
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
   * Get platform-wide defaults for Lambda Worker
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      runtime: this.getDefaultRuntime(),
      memory: this.getDefaultMemorySize(),
      timeout: this.getDefaultTimeout(),
      codePath: './src',
      environmentVariables: {},
      deadLetterQueue: {
        enabled: false,
        maxReceiveCount: 3
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
          deadLetterQueue: {
            enabled: true, // Required for audit trail
            maxReceiveCount: 1 // Immediate DLQ for compliance
          },
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
          deadLetterQueue: {
            enabled: true,
            maxReceiveCount: 1
          },
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
        return 512; // More memory for enhanced logging/monitoring
      case 'fedramp-moderate':
        return 384; // Moderate increase for compliance overhead
      default:
        return 256; // Cost-optimized for commercial
    }
  }

  /**
   * Get compliance-specific memory size
   */
  private getComplianceMemorySize(framework: string): number {
    switch (framework) {
      case 'fedramp-high':
        return 512;
      case 'fedramp-moderate':
        return 384;
      default:
        return 256;
    }
  }

  /**
   * Get default timeout based on compliance framework
   */
  private getDefaultTimeout(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 600; // Longer timeout for compliance logging
      case 'fedramp-moderate':
        return 450; // Moderate increase
      default:
        return 300; // Standard timeout for background processing
    }
  }

  /**
   * Get compliance-specific timeout
   */
  private getComplianceTimeout(framework: string): number {
    switch (framework) {
      case 'fedramp-high':
        return 600;
      case 'fedramp-moderate':
        return 450;
      default:
        return 300;
    }
  }
}

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
    // Build configuration using ConfigBuilder
    const configBuilder = new LambdaWorkerConfigBuilder(this.context, this.spec);
    this.config = configBuilder.buildSync();
    
    // Create KMS key for encryption if needed
    this.createKmsKeyIfNeeded();
    
    // Create Lambda function
    this.createLambdaFunction();
    
    // Configure observability
    this.configureObservabilityForLambda();
    
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
      tracing: ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      reservedConcurrentExecutions: this.config!.reservedConcurrency
    };

    // Apply encryption for environment variables
    if (this.kmsKey) {
      Object.assign(props, { environmentEncryption: this.kmsKey });
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
  private buildLambdaCapability(): any {
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
   * Configure OpenTelemetry observability for the Lambda function
   */
  private configureObservabilityForLambda(): void {
    if (!this.lambdaFunction) {
      return;
    }

    // Add OpenTelemetry environment variables
    this.lambdaFunction.addEnvironment('OTEL_PROPAGATORS', 'tracecontext,b3,b3multi,xray');
    this.lambdaFunction.addEnvironment('OTEL_TRACES_EXPORTER', 'xray');
    this.lambdaFunction.addEnvironment('OTEL_METRICS_EXPORTER', 'none');
    this.lambdaFunction.addEnvironment('OTEL_LOGS_EXPORTER', 'none');
    this.lambdaFunction.addEnvironment('OTEL_RESOURCE_ATTRIBUTES', `service.name=${this.spec.name},service.version=1.0.0`);
    
    // Add OpenTelemetry instrumentation layer based on runtime
    this.addOtelInstrumentationLayer();
  }

  /**
   * Add OpenTelemetry instrumentation layer based on Lambda runtime
   */
  private addOtelInstrumentationLayer(): void {
    if (!this.lambdaFunction) {
      return;
    }

    const runtime = this.config?.runtime || 'nodejs20.x';
    
    // Get the appropriate AWS-managed OTEL layer ARN for the runtime
    const layerArn = this.getOtelLayerArn(runtime);
    
    if (layerArn) {
      this.lambdaFunction.addLayers(
        lambda.LayerVersion.fromLayerVersionArn(this, 'OtelLayer', layerArn)
      );
    }
  }

  /**
   * Get OpenTelemetry layer ARN for specific runtime
   */
  private getOtelLayerArn(runtime: string): string | null {
    // AWS-managed OpenTelemetry layer ARNs (example for us-west-2)
    // In production, these would be sourced from a configuration service
    const layerMap: Record<string, string> = {
      'nodejs18.x': 'arn:aws:lambda:us-west-2:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4',
      'nodejs20.x': 'arn:aws:lambda:us-west-2:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4',
      'python3.9': 'arn:aws:lambda:us-west-2:901920570463:layer:aws-otel-python-amd64-ver-1-20-0:3',
      'python3.10': 'arn:aws:lambda:us-west-2:901920570463:layer:aws-otel-python-amd64-ver-1-20-0:3',
      'python3.11': 'arn:aws:lambda:us-west-2:901920570463:layer:aws-otel-python-amd64-ver-1-20-0:3'
    };
    
    return layerMap[runtime] || null;
  }
}