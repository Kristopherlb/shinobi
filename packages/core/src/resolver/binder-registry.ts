/**
 * Binder Registry - Manages concrete binding strategy implementations
 * Part of the Strategy pattern for component binding
 */

import { BinderStrategy, ComponentBinder, BinderRegistry as BaseBinderRegistry } from '../core-engine/binding-strategies';
import { LambdaToSqsBinderStrategy, LambdaToRdsBinderStrategy, LambdaToS3BucketBinderStrategy } from './binders/concrete-binders';

/**
 * Extended Binder Registry with resolver-specific strategies
 * Inherits base registry and adds enterprise-specific binders
 */
export class ResolverBinderRegistry extends BaseBinderRegistry {
  constructor() {
    super();
    this.registerEnterpriseStrategies();
  }

  /**
   * Register enterprise and compliance-specific binding strategies
   */
  private registerEnterpriseStrategies(): void {
    // Core binding strategies
    this.register(new LambdaToSqsBinderStrategy());
    this.register(new LambdaToRdsBinderStrategy());
    this.register(new LambdaToS3BucketBinderStrategy());

    // Enterprise-specific strategies could be added here
    // this.registerStrategy(new LambdaToSecretsManagerBinderStrategy());
    // this.registerStrategy(new LambdaToParameterStoreBinderStrategy());
    // this.registerStrategy(new ApiGatewayToLambdaBinderStrategy());
  }

  /**
   * Get binding compatibility matrix for documentation/validation
   */
  getBindingMatrix(): Array<{
    sourceType: string;
    targetCapability: string;
    description: string;
    supported: boolean;
  }> {
    return [
      {
        sourceType: 'lambda-api',
        targetCapability: 'queue:sqs',
        description: 'Lambda function can send messages to SQS queue',
        supported: true
      },
      {
        sourceType: 'lambda-worker',
        targetCapability: 'queue:sqs',
        description: 'Lambda worker can consume messages from SQS queue',
        supported: true
      },
      {
        sourceType: 'lambda-api',
        targetCapability: 'db:postgres',
        description: 'Lambda function can connect to PostgreSQL database',
        supported: true
      },
      {
        sourceType: 'lambda-worker',
        targetCapability: 'db:postgres',
        description: 'Lambda worker can connect to PostgreSQL database',
        supported: true
      },
      {
        sourceType: 'lambda-api',
        targetCapability: 'bucket:s3',
        description: 'Lambda function can read/write to S3 bucket',
        supported: true
      },
      {
        sourceType: 'lambda-worker',
        targetCapability: 'bucket:s3',
        description: 'Lambda worker can read/write to S3 bucket',
        supported: true
      }
    ];
  }

  /**
   * Validate that a proposed binding is supported
   */
  validateBinding(sourceType: string, targetCapability: string): {
    valid: boolean;
    reason?: string;
    suggestion?: string;
  } {
    const strategy = this.findStrategy(sourceType, targetCapability);

    if (strategy) {
      return { valid: true };
    }

    const availableTargets = this.getBindingMatrix()
      .filter(binding => binding.sourceType === sourceType && binding.supported)
      .map(binding => binding.targetCapability);

    if (availableTargets.length === 0) {
      return {
        valid: false,
        reason: `No binding strategies available for source type '${sourceType}'`,
        suggestion: `Supported source types: ${this.getSupportedSourceTypes().join(', ')}`
      };
    }

    return {
      valid: false,
      reason: `No binding strategy for '${sourceType}' -> '${targetCapability}'`,
      suggestion: `Available targets for '${sourceType}': ${availableTargets.join(', ')}`
    };
  }

  /**
   * Get all supported source types
   */
  private getSupportedSourceTypes(): string[] {
    return [...new Set(this.getBindingMatrix().map(binding => binding.sourceType))];
  }
}