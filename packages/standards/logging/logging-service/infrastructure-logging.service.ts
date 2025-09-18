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

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cdk from 'aws-cdk-lib';
import { 
  IPlatformService, 
  PlatformServiceContext 
} from '@shinobi/core/platform-services';
import { IComponent } from '@shinobi/core/component-interfaces';
import { 
  ILoggingHandler, 
  LoggingHandlerResult,
  LogRetentionPolicy,
  LogSecurityConfig,
  PlatformLoggerConfig
} from '@shinobi/core/logging-interfaces';
import { LoggingConfig } from './src/logging-config.interface';

// Import concrete handlers
import { LambdaLoggingHandler } from '../logging-handlers/lambda-logging.handler';
import { VpcLoggingHandler } from '../logging-handlers/vpc-logging.handler';
import { EcsLoggingHandler } from '../logging-handlers/ecs-logging.handler';
import { S3LoggingHandler } from '../logging-handlers/s3-logging.handler';
import { RdsLoggingHandler } from '../logging-handlers/rds-logging.handler';
import { SqsLoggingHandler } from '../logging-handlers/sqs-logging.handler';

/**
 * Platform Logging Service implementing Platform Service Injector Standard v1.0
 * Uses the Handler Pattern for extensible, component-specific logging logic
 */
export class LoggingService implements IPlatformService {
  public readonly name = 'LoggingService';
  private readonly handlers = new Map<string, ILoggingHandler>();
  private readonly context: PlatformServiceContext;
  private readonly loggingConfig: LoggingConfig;

  constructor(context: PlatformServiceContext) {
    this.context = context;
    
    // Load centralized logging configuration from platform configuration
    this.loggingConfig = this.loadLoggingConfig();
    
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
      new LambdaLoggingHandler(this),
      new VpcLoggingHandler(this),
      new EcsLoggingHandler(this),
      new S3LoggingHandler(this),
      new RdsLoggingHandler(this),
      new SqsLoggingHandler(this)
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
   * Load logging configuration from centralized platform configuration
   * Implements Platform Configuration Standard v1.0 Layer 2
   */
  private loadLoggingConfig(): LoggingConfig {
    const framework = this.context.complianceFramework;
    const configPath = this.getPlatformConfigPath(framework);
    
    try {
      if (!fs.existsSync(configPath)) {
        this.context.logger.warn(`Platform configuration file not found: ${configPath}, using fallback defaults`, {
          service: this.name,
          framework,
          configPath
        });
        return this.getFallbackLoggingConfig();
      }
      
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const platformConfig = yaml.load(fileContents) as any;
      
      // Extract logging configuration for this compliance framework
      if (platformConfig?.defaults?.logging) {
        const config = platformConfig.defaults.logging;
        return {
          retentionPolicies: config.retentionPolicies || this.getFallbackLoggingConfig().retentionPolicies,
          securityClassifications: config.securityClassifications || this.getFallbackLoggingConfig().securityClassifications,
          samplingRates: config.samplingRates || this.getFallbackLoggingConfig().samplingRates,
          logLevels: config.logLevels || this.getFallbackLoggingConfig().logLevels,
          redactionRules: config.redactionRules || this.getFallbackLoggingConfig().redactionRules,
          correlationFields: config.correlationFields || this.getFallbackLoggingConfig().correlationFields
        };
      }
      
      this.context.logger.warn(`No logging configuration found in ${configPath}, using fallback defaults`, {
        service: this.name,
        framework,
        configPath
      });
      return this.getFallbackLoggingConfig();
      
    } catch (error) {
      this.context.logger.error(`Failed to load platform configuration for framework '${framework}': ${(error as Error).message}`, {
        service: this.name,
        framework,
        configPath,
        error: (error as Error).message
      });
      return this.getFallbackLoggingConfig();
    }
  }

  /**
   * Get the file path for platform configuration based on compliance framework
   */
  private getPlatformConfigPath(framework: string): string {
    const configDir = path.join(process.cwd(), 'config');
    return path.join(configDir, `${framework}.yml`);
  }

  /**
   * Get fallback logging configuration when platform configuration is not available
   */
  private getFallbackLoggingConfig(): LoggingConfig {
    return {
      retentionPolicies: {
        default: {
          retentionDays: 365,
          immutable: false,
          encryptionLevel: 'standard',
          auditRequired: false,
          maxSamplingRate: 0.1
        }
      },
      securityClassifications: {
        default: 'internal',
        lambda: 'internal',
        ecs: 'internal',
        rds: 'internal',
        s3: 'internal',
        sqs: 'internal',
        vpc: 'internal'
      },
      samplingRates: {
        ERROR: 1.0,
        WARN: 1.0,
        INFO: 0.1,
        DEBUG: 0.01,
        TRACE: 0.001
      },
      logLevels: {
        default: 'INFO',
        lambda: 'INFO',
        ecs: 'INFO',
        rds: 'INFO',
        s3: 'INFO',
        sqs: 'INFO',
        vpc: 'INFO'
      },
      redactionRules: {
        base: ['email', 'ssn', 'creditCard', 'phoneNumber'],
        phi: ['medicalRecordNumber', 'insuranceId', 'prescriptionData', 'diagnosticData'],
        cui: ['governmentId', 'securityClearance', 'contractorInfo']
      },
      correlationFields: ['traceId', 'spanId', 'requestId', 'userId', 'sessionId', 'operationId']
    };
  }

  /**
   * Get retention policy for the current compliance framework
   */
  public getRetentionPolicy(policyName: string = 'default'): LogRetentionPolicy {
    const policy = this.loggingConfig.retentionPolicies[policyName as keyof typeof this.loggingConfig.retentionPolicies];
    if (!policy) {
      throw new Error(`Unknown retention policy: ${policyName}`);
    }
    return policy;
  }

  /**
   * Create a standardized CloudWatch Log Group with compliance-appropriate configuration
   */
  public createLogGroup(
    scope: IComponent, 
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
    
    // Get component-specific log level from configuration
    const logLevel = this.loggingConfig.logLevels[componentType as keyof typeof this.loggingConfig.logLevels] || 
                    this.loggingConfig.logLevels.default;
    
    return {
      name: `${this.context.serviceName}.${componentName}`,
      level: logLevel,
      logGroup: logGroupName,
      streamPrefix: `${componentType}/${componentName}`,
      sampling: this.loggingConfig.samplingRates,
      security: {
        classification,
        piiRedactionRequired: policy.auditRequired,
        securityMonitoring: policy.auditRequired,
        redactionRules: this.getRedactionRules(classification),
        securityAlertsEnabled: policy.auditRequired
      },
      asyncBatching: true,
      correlationFields: this.loggingConfig.correlationFields
    };
  }

  /**
   * Get PII redaction rules based on classification level
   */
  private getRedactionRules(classification: LogSecurityConfig['classification']): string[] {
    const baseRules = this.loggingConfig.redactionRules.base;

    switch (classification) {
      case 'phi':
        return [
          ...baseRules,
          ...this.loggingConfig.redactionRules.phi
        ];
      
      case 'cui':
        return [
          ...baseRules,
          ...this.loggingConfig.redactionRules.cui
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

  /**
   * Get security classification for a component type
   */
  public getSecurityClassification(componentType: string): LogSecurityConfig['classification'] {
    return this.loggingConfig.securityClassifications[componentType as keyof typeof this.loggingConfig.securityClassifications] || 
           this.loggingConfig.securityClassifications.default;
  }

  /**
   * Get the current logging configuration
   */
  public getLoggingConfig(): Readonly<LoggingConfig> {
    return this.loggingConfig;
  }
}
