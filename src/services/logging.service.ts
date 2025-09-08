/**
 * Platform Logging Service
 * 
 * Implements the Platform Structured Logging Standard v1.0 using the Service Injector Pattern.
 * Automatically provisions logging infrastructure and instruments components with standardized loggers.
 * 
 * Features:
 * - Compliance-aware log retention (1yr commercial, 3yr FedRAMP Moderate, 7yr FedRAMP High)
 * - Automatic encryption and security classification
 * - PII detection and redaction based on compliance framework
 * - Structured JSON logging with automatic correlation
 * - CloudWatch Log Groups provisioning and configuration
 */

import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cdk from 'aws-cdk-lib';
import { 
  IPlatformService, 
  PlatformServiceContext 
} from '../platform/contracts/platform-services';
import { IComponent } from '../platform/contracts/component-interfaces';
import { 
  ILoggingHandler, 
  LoggingHandlerResult,
  LogRetentionPolicy,
  LogSecurityConfig,
  PlatformLoggerConfig
} from '../platform/contracts/logging-interfaces';

// Import concrete handlers
import { LambdaLoggingHandler } from './logging-handlers/lambda-logging.handler';
import { VpcLoggingHandler } from './logging-handlers/vpc-logging.handler';
import { EcsLoggingHandler } from './logging-handlers/ecs-logging.handler';
import { S3LoggingHandler } from './logging-handlers/s3-logging.handler';
import { RdsLoggingHandler } from './logging-handlers/rds-logging.handler';
import { SqsLoggingHandler } from './logging-handlers/sqs-logging.handler';

/**
 * Platform Logging Service implementing Platform Service Injector Standard v1.0
 * Uses the Handler Pattern for extensible, component-specific logging logic
 */
export class LoggingService implements IPlatformService {
  public readonly name = 'LoggingService';
  private readonly handlers = new Map<string, ILoggingHandler>();
  private readonly context: PlatformServiceContext;
  private readonly retentionPolicies = new Map<string, LogRetentionPolicy>();

  constructor(context: PlatformServiceContext) {
    this.context = context;
    
    // Initialize compliance-based retention policies
    this.initializeRetentionPolicies();
    
    // Register all available logging handlers
    this.registerHandlers();
  }

  /**
   * Apply logging infrastructure to a component using the appropriate handler
   */
  public apply(component: IComponent): void {
    const componentType = component.getType();
    const handler = this.handlers.get(componentType);
    
    if (!handler) {
      // Safely ignore components that don't have specific logging requirements
      this.context.logger.debug(`No specific logging handler for component type: ${componentType}`, {
        service: this.name,
        componentType,
        componentName: component.node.id
      });
      return;
    }

    try {
      const startTime = Date.now();
      
      this.context.logger.info(`Applying logging infrastructure for ${componentType}`, {
        service: this.name,
        componentType,
        componentName: component.node.id,
        handler: handler.constructor.name
      });

      const result = handler.apply(component, this.context);
      const executionTime = Date.now() - startTime;

      if (result.success) {
        this.context.logger.info('Logging infrastructure applied successfully', {
          service: this.name,
          componentType,
          componentName: component.node.id,
          logGroupArn: result.logGroupArn,
          retentionDays: result.retentionDays,
          encryption: result.encryption,
          classification: result.classification,
          executionTimeMs: executionTime
        });
      } else {
        this.context.logger.error('Failed to apply logging infrastructure', {
          service: this.name,
          componentType,
          componentName: component.node.id,
          error: result.error,
          executionTimeMs: executionTime
        });
      }
    } catch (error) {
      this.context.logger.error('Logging service encountered an error', {
        service: this.name,
        componentType,
        componentName: component.node.id,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  }

  /**
   * Register all available logging handlers
   */
  private registerHandlers(): void {
    const handlers = [
      new LambdaLoggingHandler(),
      new VpcLoggingHandler(),
      new EcsLoggingHandler(),
      new S3LoggingHandler(),
      new RdsLoggingHandler(),
      new SqsLoggingHandler()
    ];

    handlers.forEach(handler => {
      this.handlers.set(handler.componentType, handler);
      
      this.context.logger.debug(`Registered logging handler for ${handler.componentType}`, {
        service: this.name,
        handlerType: handler.componentType,
        handlerClass: handler.constructor.name
      });
    });

    this.context.logger.info(`Initialized LoggingService with ${handlers.length} handlers`, {
      service: this.name,
      handlersCount: handlers.length,
      supportedTypes: Array.from(this.handlers.keys())
    });
  }

  /**
   * Initialize compliance-based retention policies
   */
  private initializeRetentionPolicies(): void {
    const framework = this.context.complianceFramework;

    switch (framework) {
      case 'fedramp-high':
        this.retentionPolicies.set('default', {
          retentionDays: 2555, // 7 years
          immutable: true,
          encryptionLevel: 'customer-managed',
          auditRequired: true,
          maxSamplingRate: 1.0 // 100% sampling for compliance
        });
        break;

      case 'fedramp-moderate':
        this.retentionPolicies.set('default', {
          retentionDays: 1095, // 3 years
          immutable: true,
          encryptionLevel: 'enhanced',
          auditRequired: true,
          maxSamplingRate: 1.0 // 100% sampling for compliance
        });
        break;

      default: // commercial
        this.retentionPolicies.set('default', {
          retentionDays: 365, // 1 year
          immutable: false,
          encryptionLevel: 'standard',
          auditRequired: false,
          maxSamplingRate: 0.1 // 10% sampling for cost optimization
        });
        break;
    }

    this.context.logger.info('Initialized log retention policies', {
      service: this.name,
      complianceFramework: framework,
      defaultRetentionDays: this.retentionPolicies.get('default')?.retentionDays,
      encryptionLevel: this.retentionPolicies.get('default')?.encryptionLevel
    });
  }

  /**
   * Get retention policy for the current compliance framework
   */
  public getRetentionPolicy(policyName: string = 'default'): LogRetentionPolicy {
    const policy = this.retentionPolicies.get(policyName);
    if (!policy) {
      throw new Error(`Unknown retention policy: ${policyName}`);
    }
    return policy;
  }

  /**
   * Create a standardized CloudWatch Log Group with compliance-appropriate configuration
   */
  public createLogGroup(
    scope: Component, 
    logGroupName: string, 
    classification: LogSecurityConfig['classification'] = 'internal'
  ): { logGroup: logs.LogGroup; result: LoggingHandlerResult } {
    const policy = this.getRetentionPolicy();
    
    // Create KMS key for encryption if required
    let encryptionKey: kms.IKey | undefined;
    let managedKey = true;

    if (policy.encryptionLevel === 'customer-managed') {
      encryptionKey = new kms.Key(scope, `${logGroupName}EncryptionKey`, {
        description: `Encryption key for log group ${logGroupName}`,
        enableKeyRotation: true,
        alias: `alias/logs/${this.context.serviceName}/${logGroupName}`
      });
      managedKey = false;
    }

    // Create log group with compliance configuration
    const logGroup = new logs.LogGroup(scope, `${logGroupName}LogGroup`, {
      logGroupName: `/platform/${this.context.serviceName}/${logGroupName}`,
      retention: this.mapRetentionDays(policy.retentionDays),
      encryptionKey: encryptionKey,
      removalPolicy: policy.immutable ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Apply standard platform tags
    cdk.Tags.of(logGroup).add('log-classification', classification);
    cdk.Tags.of(logGroup).add('compliance-framework', this.context.complianceFramework);
    cdk.Tags.of(logGroup).add('retention-days', policy.retentionDays.toString());
    cdk.Tags.of(logGroup).add('encryption-level', policy.encryptionLevel);

    const result: LoggingHandlerResult = {
      success: true,
      logGroupArn: logGroup.logGroupArn,
      retentionDays: policy.retentionDays,
      encryption: {
        enabled: true,
        kmsKeyId: encryptionKey?.keyArn,
        managedKey
      },
      classification,
      metadata: {
        logGroupName: logGroup.logGroupName,
        immutableStorage: policy.immutable,
        auditRequired: policy.auditRequired
      }
    };

    return { logGroup, result };
  }

  /**
   * Generate platform logger configuration for component instrumentation
   */
  public generateLoggerConfig(
    componentName: string,
    componentType: string,
    logGroupName: string,
    classification: LogSecurityConfig['classification'] = 'internal'
  ): PlatformLoggerConfig {
    const policy = this.getRetentionPolicy();
    
    return {
      name: `${this.context.serviceName}.${componentName}`,
      level: this.context.complianceFramework === 'commercial' ? 'INFO' : 'DEBUG',
      logGroup: logGroupName,
      streamPrefix: `${componentType}/${componentName}`,
      sampling: {
        'ERROR': 1.0,   // 100% of error logs
        'WARN': 1.0,    // 100% of warning logs  
        'INFO': policy.maxSamplingRate,   // Based on compliance framework
        'DEBUG': policy.maxSamplingRate * 0.1, // 10% of max sampling
        'TRACE': policy.maxSamplingRate * 0.01  // 1% of max sampling
      },
      security: {
        classification,
        piiRedactionRequired: this.context.complianceFramework !== 'commercial',
        securityMonitoring: policy.auditRequired,
        redactionRules: this.getRedactionRules(classification),
        securityAlertsEnabled: policy.auditRequired
      },
      asyncBatching: true,
      correlationFields: [
        'traceId',
        'spanId',
        'requestId',
        'userId',
        'sessionId',
        'operationId'
      ]
    };
  }

  /**
   * Get PII redaction rules based on classification level
   */
  private getRedactionRules(classification: LogSecurityConfig['classification']): string[] {
    const baseRules = [
      'email',
      'ssn',
      'creditCard',
      'phoneNumber'
    ];

    switch (classification) {
      case 'phi':
        return [
          ...baseRules,
          'medicalRecordNumber',
          'insuranceId',
          'prescriptionData',
          'diagnosticData'
        ];
      
      case 'cui':
        return [
          ...baseRules,
          'governmentId',
          'securityClearance',
          'contractorInfo'
        ];
      
      default:
        return baseRules;
    }
  }

  /**
   * Map retention days to CloudWatch LogGroup retention enum
   */
  private mapRetentionDays(days: number): logs.RetentionDays {
    if (days <= 1) return logs.RetentionDays.ONE_DAY;
    if (days <= 3) return logs.RetentionDays.THREE_DAYS;
    if (days <= 5) return logs.RetentionDays.FIVE_DAYS;
    if (days <= 7) return logs.RetentionDays.ONE_WEEK;
    if (days <= 14) return logs.RetentionDays.TWO_WEEKS;
    if (days <= 30) return logs.RetentionDays.ONE_MONTH;
    if (days <= 60) return logs.RetentionDays.TWO_MONTHS;
    if (days <= 90) return logs.RetentionDays.THREE_MONTHS;
    if (days <= 120) return logs.RetentionDays.FOUR_MONTHS;
    if (days <= 150) return logs.RetentionDays.FIVE_MONTHS;
    if (days <= 180) return logs.RetentionDays.SIX_MONTHS;
    if (days <= 365) return logs.RetentionDays.ONE_YEAR;
    if (days <= 400) return logs.RetentionDays.THIRTEEN_MONTHS;
    if (days <= 545) return logs.RetentionDays.EIGHTEEN_MONTHS;
    if (days <= 730) return logs.RetentionDays.TWO_YEARS;
    if (days <= 1095) return logs.RetentionDays.THREE_YEARS;
    if (days <= 1827) return logs.RetentionDays.FIVE_YEARS;
    if (days <= 2192) return logs.RetentionDays.SIX_YEARS;
    if (days <= 2555) return logs.RetentionDays.SEVEN_YEARS;
    if (days <= 2922) return logs.RetentionDays.EIGHT_YEARS;
    if (days <= 3287) return logs.RetentionDays.NINE_YEARS;
    
    return logs.RetentionDays.TEN_YEARS;
  }

  /**
   * Get supported component types
   */
  public getSupportedTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a component type is supported
   */
  public isSupported(componentType: string): boolean {
    return this.handlers.has(componentType);
  }
}
