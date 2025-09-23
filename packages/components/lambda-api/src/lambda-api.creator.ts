/**
 * Creator for LambdaApiComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { ComponentSpec, ComponentContext } from '@platform/contracts';

// Define IComponentCreator locally since it's not exported from contracts
export interface IComponentCreator {
  createComponent(spec: ComponentSpec, context: ComponentContext): any;
}
import { LambdaApiComponent } from './lambda-api.component';
import { LambdaApiConfig } from './lambda-api.builder';
import { LAMBDA_API_CONFIG_SCHEMA } from '../index';

/**
 * Creator class for LambdaApiComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class LambdaApiComponentCreator implements IComponentCreator {

  /**
   * Component type identifier
   */
  public readonly componentType = 'lambda-api';

  /**
   * Component display name
   */
  public readonly displayName = 'Lambda Api Component';

  /**
   * Component description
   */
  public readonly description = 'Lambda API Component';

  /**
   * Component category for organization
   */
  public readonly category = 'compute';

  /**
   * AWS service this component manages
   */
  public readonly awsService = 'LAMBDA';

  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'lambda-api',
    'compute',
    'aws',
    'lambda'
  ];

  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = LAMBDA_API_CONFIG_SCHEMA;

  /**
   * Factory method to create component instances
   */
  public createComponent(spec: ComponentSpec, context: ComponentContext): LambdaApiComponent {
    return new LambdaApiComponent(context.scope, spec.name, context, spec);
  }

  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec,
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as LambdaApiConfig;

    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }

    // Component-specific validations
    this.validateHandler(config, errors);
    this.validateMemoryConfiguration(config, errors);
    this.validateTimeoutConfiguration(config, errors);
    this.validateRuntimeConfiguration(config, errors);
    this.validateCodePathConfiguration(config, errors);
    this.validateEnvironmentVariables(config, errors);
    this.validateLogRetentionConfiguration(config, errors);

    // Environment-specific validations
    if (context.environment === 'prod') {
      this.validateProductionRequirements(config, context, errors);
    } else if (context.environment === 'dev') {
      this.validateDevelopmentRequirements(config, errors);
    }

    // Compliance framework validations
    if (context.complianceFramework) {
      this.validateComplianceRequirements(config, context.complianceFramework, errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates Lambda handler format and requirements
   */
  private validateHandler(config: LambdaApiConfig, errors: string[]): void {
    if (!config.handler) {
      errors.push('Handler is required for Lambda API component');
      return;
    }

    // Validate handler format: filename.functionName
    const handlerPattern = /^[a-zA-Z0-9._/-]+\.(handler|lambda_handler)$/;
    if (!handlerPattern.test(config.handler)) {
      errors.push('Handler must be in format "filename.functionName" (e.g., "index.handler", "src/api.lambda_handler")');
    }

    // Validate handler length
    if (config.handler.length > 128) {
      errors.push('Handler name cannot exceed 128 characters');
    }

    // Validate handler doesn't contain invalid characters
    if (config.handler.includes(' ') || config.handler.includes('\t')) {
      errors.push('Handler name cannot contain spaces or tabs');
    }
  }

  /**
   * Validates memory configuration
   */
  private validateMemoryConfiguration(config: LambdaApiConfig, errors: string[]): void {
    if (config.memorySize !== undefined) {
      if (config.memorySize < 128) {
        errors.push('Memory size must be at least 128 MB');
      }
      if (config.memorySize > 10240) {
        errors.push('Memory size cannot exceed 10240 MB (10 GB)');
      }
      if (config.memorySize % 64 !== 0) {
        errors.push('Memory size must be a multiple of 64 MB');
      }
    }
  }

  /**
   * Validates timeout configuration
   */
  private validateTimeoutConfiguration(config: LambdaApiConfig, errors: string[]): void {
    if (config.timeout !== undefined) {
      if (config.timeout < 1) {
        errors.push('Timeout must be at least 1 second');
      }
      if (config.timeout > 900) {
        errors.push('Timeout cannot exceed 900 seconds (15 minutes)');
      }
    }
  }

  /**
   * Validates runtime configuration
   */
  private validateRuntimeConfiguration(config: LambdaApiConfig, errors: string[]): void {
    if (config.runtime) {
      const supportedRuntimes = [
        'nodejs20.x', 'nodejs18.x', 'nodejs16.x',
        'python3.11', 'python3.10', 'python3.9', 'python3.8',
        'java17', 'java11', 'java8.al2',
        'dotnet6', 'dotnetcore3.1',
        'go1.x',
        'ruby3.2', 'ruby2.7'
      ];

      if (!supportedRuntimes.includes(config.runtime.name || config.runtime.toString())) {
        errors.push(`Unsupported runtime: ${config.runtime}. Supported runtimes: ${supportedRuntimes.join(', ')}`);
      }
    }
  }

  /**
   * Validates code path configuration
   */
  private validateCodePathConfiguration(config: LambdaApiConfig, errors: string[]): void {
    if (config.codePath) {
      // Validate code path format
      if (config.codePath.length === 0) {
        errors.push('Code path cannot be empty');
      }
      if (config.codePath.length > 255) {
        errors.push('Code path cannot exceed 255 characters');
      }

      // Validate code path doesn't contain invalid characters
      if (config.codePath.includes('..') || config.codePath.includes('//')) {
        errors.push('Code path cannot contain ".." or "//" for security reasons');
      }

      // Validate code path starts with ./ for relative paths
      if (!config.codePath.startsWith('./') && !config.codePath.startsWith('/')) {
        errors.push('Code path must start with "./" for relative paths or "/" for absolute paths');
      }
    }

    if (config.codeAssetHash) {
      // Validate asset hash format
      if (config.codeAssetHash.length === 0) {
        errors.push('Code asset hash cannot be empty');
      }
      if (config.codeAssetHash.length > 64) {
        errors.push('Code asset hash cannot exceed 64 characters');
      }
    }
  }

  /**
   * Validates environment variables
   */
  private validateEnvironmentVariables(config: LambdaApiConfig, errors: string[]): void {
    if (config.environmentVariables) {
      const envVars = config.environmentVariables;

      // Check for reserved environment variables
      const reservedVars = ['AWS_LAMBDA_FUNCTION_NAME', 'AWS_LAMBDA_FUNCTION_VERSION', 'AWS_LAMBDA_FUNCTION_MEMORY_SIZE'];
      for (const reserved of reservedVars) {
        if (envVars[reserved]) {
          errors.push(`Environment variable "${reserved}" is reserved by AWS Lambda`);
        }
      }

      // Validate environment variable names
      for (const [key, value] of Object.entries(envVars)) {
        if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
          errors.push(`Environment variable name "${key}" must contain only uppercase letters, numbers, and underscores, and start with a letter or underscore`);
        }
        if (key.length > 64) {
          errors.push(`Environment variable name "${key}" cannot exceed 64 characters`);
        }
        if (value.length > 1024) {
          errors.push(`Environment variable "${key}" value cannot exceed 1024 characters`);
        }
      }

      // Check total environment variables limit
      if (Object.keys(envVars).length > 50) {
        errors.push('Cannot exceed 50 environment variables');
      }
    }
  }

  /**
   * Validates log retention configuration
   */
  private validateLogRetentionConfiguration(config: LambdaApiConfig, errors: string[]): void {
    if (config.logRetentionDays !== undefined) {
      if (config.logRetentionDays < 1) {
        errors.push('Log retention days must be at least 1');
      }
      if (config.logRetentionDays > 3653) {
        errors.push('Log retention days cannot exceed 3653 (10 years)');
      }
    }
  }

  /**
   * Validates production-specific requirements
   */
  private validateProductionRequirements(config: LambdaApiConfig, context: ComponentContext, errors: string[]): void {
    // Production memory requirements
    if (!config.memorySize || config.memorySize < 512) {
      errors.push('Production environments require at least 512 MB memory');
    }

    // Production timeout requirements
    if (!config.timeout || config.timeout < 30) {
      errors.push('Production environments require at least 30 seconds timeout');
    }

    // Production code path requirements
    if (!config.codePath || config.codePath === './src') {
      errors.push('Production environments should use compiled code path (e.g., "./dist") instead of source path');
    }

    // Production observability requirements
    if (!context.observability?.collectorEndpoint) {
      errors.push('Production environments require observability collector endpoint configuration');
    }

    // Production environment variables validation
    if (config.environmentVariables) {
      const requiredProdVars = ['NODE_ENV', 'LOG_LEVEL'];
      for (const required of requiredProdVars) {
        if (!config.environmentVariables[required]) {
          errors.push(`Production environment requires environment variable: ${required}`);
        }
      }
    }
  }

  /**
   * Validates development-specific requirements
   */
  private validateDevelopmentRequirements(config: LambdaApiConfig, errors: string[]): void {
    // Development timeout limits
    if (config.timeout && config.timeout > 300) {
      errors.push('Development environments should not exceed 300 seconds (5 minutes) timeout');
    }

    // Development memory limits
    if (config.memorySize && config.memorySize > 2048) {
      errors.push('Development environments should not exceed 2048 MB (2 GB) memory');
    }
  }

  /**
   * Validates compliance framework requirements
   */
  private validateComplianceRequirements(config: LambdaApiConfig, framework: string, errors: string[]): void {
    if (framework.startsWith('fedramp')) {
      // FedRAMP memory requirements
      if (!config.memorySize || config.memorySize < 768) {
        errors.push('FedRAMP compliance requires at least 768 MB memory');
      }

      // FedRAMP timeout requirements
      if (!config.timeout || config.timeout < 45) {
        errors.push('FedRAMP compliance requires at least 45 seconds timeout');
      }

      // FedRAMP log retention requirements
      if (!config.logRetentionDays || config.logRetentionDays < 30) {
        errors.push('FedRAMP compliance requires at least 30 days log retention');
      }

      // FedRAMP environment variables requirements
      if (config.environmentVariables) {
        const requiredFedrampVars = ['OTEL_SERVICE_NAME'];
        for (const required of requiredFedrampVars) {
          if (!config.environmentVariables[required]) {
            errors.push(`FedRAMP compliance requires environment variable: ${required}`);
          }
        }
      }
    }

    if (framework === 'fedramp-high') {
      // FedRAMP High additional requirements
      if (!config.memorySize || config.memorySize < 1024) {
        errors.push('FedRAMP High compliance requires at least 1024 MB memory');
      }

      if (!config.timeout || config.timeout < 60) {
        errors.push('FedRAMP High compliance requires at least 60 seconds timeout');
      }
    }
  }

  /**
   * Returns the capabilities this component provides when synthesized
   */
  public getProvidedCapabilities(): string[] {
    return [
      'compute:lambda-api',
      'monitoring:lambda-api'
    ];
  }

  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [
      // Core IAM and Security capabilities (always required)
      'iam:role:lambda-execution',
      'iam:policy:lambda-basic-execution',
      'iam:policy:cloudwatch-logs',
      'iam:policy:xray-tracing',

      // Core Monitoring and Observability capabilities (always required)
      'monitoring:cloudwatch-logs',
      'monitoring:cloudwatch-metrics',
      'monitoring:xray-tracing',

      // API Gateway capabilities (required for API functionality)
      'api:apigateway-rest',

      // Compliance and Security capabilities (always required)
      'security:compliance-tags',
    ];
  }

  /**
   * Returns dynamic required capabilities based on component configuration
   */
  public getRequiredCapabilitiesForSpec(spec: ComponentSpec, context: ComponentContext): string[] {
    const baseCapabilities = this.getRequiredCapabilities();
    const dynamicCapabilities: string[] = [];
    const config = spec.config as LambdaApiConfig;

    // Add observability capabilities if observability is configured
    if (context.observability?.collectorEndpoint) {
      dynamicCapabilities.push('monitoring:adot-layer');
      dynamicCapabilities.push('monitoring:otel-collector');
    }

    // Add VPC capabilities if VPC is configured
    if (context.vpc) {
      dynamicCapabilities.push('network:vpc');
      dynamicCapabilities.push('network:security-group');
      dynamicCapabilities.push('network:subnet');
    }

    // Add secrets capabilities if environment variables reference secrets
    if (config.environmentVariables) {
      const hasSecrets = Object.values(config.environmentVariables).some(value =>
        typeof value === 'string' && value.includes('arn:aws:secretsmanager')
      );
      if (hasSecrets) {
        dynamicCapabilities.push('config:secrets-manager');
        dynamicCapabilities.push('iam:policy:secrets-manager');
      }
    }

    // Add KMS capabilities for encryption
    if (context.complianceFramework?.startsWith('fedramp')) {
      dynamicCapabilities.push('security:kms-encryption');
      dynamicCapabilities.push('iam:policy:kms');
    }

    // Add additional monitoring capabilities for production
    if (context.environment === 'prod') {
      dynamicCapabilities.push('monitoring:alarms');
      dynamicCapabilities.push('monitoring:dashboards');
    }

    // Add API Gateway HTTP API if configured
    if (config.apiType === 'http') {
      dynamicCapabilities.push('api:apigateway-http');
    }

    // Add parameter store capabilities if needed
    if (config.environmentVariables) {
      const hasParameters = Object.values(config.environmentVariables).some(value =>
        typeof value === 'string' && value.includes('ssm:')
      );
      if (hasParameters) {
        dynamicCapabilities.push('config:parameter-store');
        dynamicCapabilities.push('iam:policy:parameter-store');
      }
    }

    return [...baseCapabilities, ...dynamicCapabilities];
  }

  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return [
      'lambdaFunction',  // AWS Lambda Function construct
      'api',            // API Gateway REST API construct
      'logGroup'        // CloudWatch Log Group construct
    ];
  }
}