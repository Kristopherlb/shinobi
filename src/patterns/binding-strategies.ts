/**
 * Strategy Pattern Implementation for Component Binding
 * Handles different binding types between components cleanly
 */

import { Component, ComponentCapabilities } from './component-factory';

export interface BindingDirective {
  to?: string;
  select?: {
    type: string;
    withLabels?: Record<string, string>;
  };
  capability: string;
  access: 'read' | 'write' | 'readwrite' | 'admin';
  env?: Record<string, string>;
  options?: Record<string, any>;
}

export interface BindingContext {
  source: Component;
  target: Component;
  directive: BindingDirective;
  environment: string;
  complianceFramework: string;
}

export interface BindingResult {
  environmentVariables: Record<string, string>;
  // Note: iamPolicies, securityGroupRules, and additionalConfig removed since CDK L2 constructs
  // handle IAM permissions, security group connections, and configuration directly during binding
}

/**
 * Strategy interface for different binding types
 */
export abstract class BinderStrategy {
  abstract canHandle(sourceType: string, targetCapability: string): boolean;
  abstract bind(context: BindingContext): BindingResult;
  
  protected generateSecureDescription(context: BindingContext): string {
    return `${context.source.getType()}-${context.source.getId()} -> ${context.target.getType()}-${context.target.getId()} (${context.directive.capability})`;
  }
}

/**
 * Lambda to SQS binding strategy
 */
export class LambdaToSqsBinderStrategy extends BinderStrategy {
  canHandle(sourceType: string, targetCapability: string): boolean {
    return sourceType === 'lambda-api' && targetCapability === 'queue:sqs';
  }

  bind(context: BindingContext): BindingResult {
    const targetCapabilities = context.target.getCapabilities();
    const sqsCapability = targetCapabilities['queue:sqs'];
    
    if (!sqsCapability) {
      throw new Error(`Target component ${context.target.getId()} does not provide queue:sqs capability`);
    }

    const actions = this.getActionsForAccess(context.directive.access);
    
    // TODO: Refactor this strategy to use CDK L2 constructs like RDS and S3 binders
    return {
      environmentVariables: {
        [context.directive.env?.queueUrl || 'QUEUE_URL']: sqsCapability.queueUrl,
        [context.directive.env?.queueArn || 'QUEUE_ARN']: sqsCapability.queueArn
      }
    };
  }

  private getActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'];
      case 'write':
        return ['sqs:SendMessage', 'sqs:GetQueueAttributes'];
      case 'readwrite':
        return ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:SendMessage', 'sqs:GetQueueAttributes'];
      case 'admin':
        return ['sqs:*'];
      default:
        throw new Error(`Invalid access level: ${access}`);
    }
  }

  private buildConditions(context: BindingContext): Record<string, any> | undefined {
    // Add FedRAMP-specific conditions
    if (context.complianceFramework.startsWith('fedramp')) {
      return {
        'StringEquals': {
          'aws:SecureTransport': 'true'
        },
        'IpAddress': {
          'aws:SourceIp': context.complianceFramework === 'fedramp-high' ? 
            ['10.0.0.0/8'] : // Restrict to VPC for FedRAMP High
            undefined
        }
      };
    }
    return undefined;
  }
}

/**
 * Lambda to RDS binding strategy
 */
export class LambdaToRdsBinderStrategy extends BinderStrategy {
  canHandle(sourceType: string, targetCapability: string): boolean {
    return sourceType === 'lambda-api' && targetCapability === 'db:postgres';
  }

  bind(context: BindingContext): BindingResult {
    const targetCapabilities = context.target.getCapabilities();
    const dbCapability = targetCapabilities['db:postgres'];
    
    if (!dbCapability) {
      throw new Error(`Target component ${context.target.getId()} does not provide db:postgres capability`);
    }

    // TODO: Refactor this strategy to use CDK L2 constructs like the concrete binders
    return {
      environmentVariables: {
        [context.directive.env?.host || 'DB_HOST']: dbCapability.host,
        [context.directive.env?.port || 'DB_PORT']: dbCapability.port.toString(),
        [context.directive.env?.dbName || 'DB_NAME']: dbCapability.dbName,
        [context.directive.env?.secretArn || 'DB_SECRET_ARN']: dbCapability.secretArn
      }
    };
  }
}

/**
 * Lambda to S3 binding strategy
 */
export class LambdaToS3BucketBinderStrategy extends BinderStrategy {
  canHandle(sourceType: string, targetCapability: string): boolean {
    return sourceType === 'lambda-api' && targetCapability === 'bucket:s3';
  }

  bind(context: BindingContext): BindingResult {
    const targetCapabilities = context.target.getCapabilities();
    const s3Capability = targetCapabilities['bucket:s3'];
    
    if (!s3Capability) {
      throw new Error(`Target component ${context.target.getId()} does not provide bucket:s3 capability`);
    }

    const actions = this.getS3ActionsForAccess(context.directive.access);

    // TODO: Refactor this strategy to use CDK L2 constructs like the concrete binders
    return {
      environmentVariables: {
        [context.directive.env?.bucketName || 'BUCKET_NAME']: s3Capability.bucketName,
        [context.directive.env?.bucketArn || 'BUCKET_ARN']: s3Capability.bucketArn
      }
    };
  }

  private getS3ActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return ['s3:GetObject', 's3:ListBucket'];
      case 'write':
        return ['s3:PutObject', 's3:PutObjectAcl'];
      case 'readwrite':
        return ['s3:GetObject', 's3:PutObject', 's3:ListBucket', 's3:DeleteObject'];
      case 'admin':
        return ['s3:*'];
      default:
        throw new Error(`Invalid access level: ${access}`);
    }
  }
}

/**
 * Binder Registry - Manages available binding strategies
 */
export class BinderRegistry {
  private strategies: BinderStrategy[] = [];

  constructor() {
    // Register default strategies
    this.registerStrategy(new LambdaToSqsBinderStrategy());
    this.registerStrategy(new LambdaToRdsBinderStrategy());
    this.registerStrategy(new LambdaToS3BucketBinderStrategy());
  }

  registerStrategy(strategy: BinderStrategy): void {
    this.strategies.push(strategy);
  }

  findStrategy(sourceType: string, targetCapability: string): BinderStrategy | null {
    return this.strategies.find(strategy => 
      strategy.canHandle(sourceType, targetCapability)
    ) || null;
  }

  getAvailableBindings(): Array<{sourceType: string, targetCapability: string}> {
    // This would typically be more sophisticated, analyzing all registered strategies
    return [
      { sourceType: 'lambda-api', targetCapability: 'queue:sqs' },
      { sourceType: 'lambda-api', targetCapability: 'db:postgres' },
      { sourceType: 'lambda-api', targetCapability: 'bucket:s3' }
    ];
  }
}

/**
 * Binder Service - Orchestrates the binding process using strategies
 */
export class ComponentBinder {
  constructor(private registry: BinderRegistry = new BinderRegistry()) {}

  /**
   * Execute a binding between two components using appropriate strategy
   */
  bind(context: BindingContext): BindingResult {
    const strategy = this.registry.findStrategy(
      context.source.getType(), 
      context.directive.capability
    );

    if (!strategy) {
      throw new Error(
        `No binding strategy found for ${context.source.getType()} -> ${context.directive.capability}. ` +
        `Available bindings: ${this.registry.getAvailableBindings().map(b => `${b.sourceType} -> ${b.targetCapability}`).join(', ')}`
      );
    }

    return strategy.bind(context);
  }

  /**
   * Validate that a binding is possible before execution
   */
  canBind(sourceType: string, targetCapability: string): boolean {
    return this.registry.findStrategy(sourceType, targetCapability) !== null;
  }

  /**
   * Get all possible binding targets for a source component type
   */
  getCompatibleTargets(sourceType: string): string[] {
    return this.registry.getAvailableBindings()
      .filter(binding => binding.sourceType === sourceType)
      .map(binding => binding.targetCapability);
  }
}