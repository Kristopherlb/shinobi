/**
 * Lambda Logging Handler
 * 
 * Implements logging infrastructure for Lambda functions according to
 * Platform Structured Logging Standard v1.0.
 * 
 * Features:
 * - Creates dedicated CloudWatch Log Groups for Lambda functions
 * - Configures compliance-aware log retention
 * - Sets up structured logging environment variables
 * - Implements automatic PII redaction based on compliance framework
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { IComponent } from '@shinobi/core/component-interfaces';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
import { 
  ILoggingHandler, 
  LoggingHandlerResult,
  PlatformLoggerConfig 
} from '@shinobi/core/logging-interfaces';
import { LoggingService } from '../logging-service/infrastructure-logging.service';

/**
 * Logging handler for Lambda functions
 * Supports: lambda-api, lambda-worker, lambda-scheduled
 */
export class LambdaLoggingHandler implements ILoggingHandler {
  public readonly componentType = 'lambda-api';
  private readonly loggingService: LoggingService;

  constructor(loggingService: LoggingService) {
    this.loggingService = loggingService;
  }

  /**
   * Apply comprehensive logging infrastructure to a Lambda function
   */
  public apply(component: IComponent, context: PlatformServiceContext): LoggingHandlerResult {
    try {
      // Get the Lambda function from the component
      const lambdaFunction = component.getConstruct('function') as lambda.Function | undefined;
      if (!lambdaFunction) {
        return {
          success: false,
          retentionDays: 0,
          encryption: { enabled: false, managedKey: true },
          classification: 'internal',
          error: 'Lambda component has no function construct registered'
        };
      }

      // Create dedicated log group with compliance configuration
      const logGroupName = `/aws/lambda/${lambdaFunction.functionName}`;
      const logGroup = this.createLambdaLogGroup(component, logGroupName, context);
      
      // Configure Lambda logging permissions
      this.configureLambdaLogPermissions(lambdaFunction, logGroup);
      
      // Set up structured logging environment variables
      const loggerConfig = this.generateLambdaLoggerConfig(
        component.node.id,
        logGroupName,
        context
      );
      
      this.injectLoggingEnvironment(lambdaFunction, loggerConfig, context);
      
      // Apply security classification tags
      const classification = this.loggingService.getSecurityClassification('lambda');
      
      return {
        success: true,
        logGroupArn: logGroup.logGroupArn,
        retentionDays: this.loggingService.getRetentionPolicy().retentionDays,
        encryption: {
          enabled: true,
          managedKey: this.loggingService.getRetentionPolicy().encryptionLevel === 'standard'
        },
        classification,
        metadata: {
          functionName: lambdaFunction.functionName,
          functionArn: lambdaFunction.functionArn,
          logGroupName: logGroup.logGroupName,
          runtime: lambdaFunction.runtime?.name,
          structured: true,
          piiRedaction: context.complianceFramework !== 'commercial'
        }
      };
    } catch (error) {
      return {
        success: false,
        retentionDays: 0,
        encryption: { enabled: false, managedKey: true },
        classification: 'internal',
        error: `Failed to configure Lambda logging: ${(error as Error).message}`
      };
    }
  }

  /**
   * Create CloudWatch Log Group for Lambda function
   */
  private createLambdaLogGroup(
    component: IComponent, 
    logGroupName: string, 
    context: PlatformServiceContext
  ): logs.LogGroup {
    const policy = this.loggingService.getRetentionPolicy();
    const retentionEnum = this.mapRetentionToEnum(policy.retentionDays);

    return new logs.LogGroup(component, 'LambdaLogGroup', {
      logGroupName,
      retention: retentionEnum,
      removalPolicy: policy.immutable ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });
  }

  /**
   * Configure IAM permissions for Lambda to write to CloudWatch Logs
   */
  private configureLambdaLogPermissions(
    lambdaFunction: lambda.Function, 
    logGroup: logs.LogGroup
  ): void {
    // Grant Lambda function permission to create log streams and put log events
    logGroup.grantWrite(lambdaFunction);
    
    // Add explicit permissions for structured logging
    lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogGroups',
        'logs:DescribeLogStreams'
      ],
      resources: [
        logGroup.logGroupArn,
        `${logGroup.logGroupArn}:*`
      ]
    }));
  }

  /**
   * Generate platform logger configuration for Lambda
   */
  private generateLambdaLoggerConfig(
    componentName: string,
    logGroupName: string,
    context: PlatformServiceContext
  ): PlatformLoggerConfig {
    return this.loggingService.generateLoggerConfig(
      componentName,
      'lambda',
      logGroupName,
      this.loggingService.getSecurityClassification('lambda')
    );
  }

  /**
   * Inject structured logging environment variables into Lambda
   */
  private injectLoggingEnvironment(
    lambdaFunction: lambda.Function,
    loggerConfig: PlatformLoggerConfig,
    context: PlatformServiceContext
  ): void {
    const loggingEnvVars = {
      // Platform Logger Configuration
      'PLATFORM_LOGGER_NAME': loggerConfig.name,
      'PLATFORM_LOGGER_LEVEL': loggerConfig.level,
      'PLATFORM_LOG_GROUP': loggerConfig.logGroup,
      'PLATFORM_LOG_STREAM_PREFIX': loggerConfig.streamPrefix,
      
      // Service Context
      'PLATFORM_SERVICE_NAME': context.serviceName,
      'PLATFORM_ENVIRONMENT': context.environment,
      'PLATFORM_REGION': context.region,
      'PLATFORM_COMPLIANCE_FRAMEWORK': context.complianceFramework,
      
      // Security Configuration
      'PLATFORM_LOG_CLASSIFICATION': loggerConfig.security.classification,
      'PLATFORM_PII_REDACTION_ENABLED': loggerConfig.security.piiRedactionRequired.toString(),
      'PLATFORM_SECURITY_MONITORING': loggerConfig.security.securityMonitoring.toString(),
      
      // Sampling Configuration
      'PLATFORM_LOG_SAMPLING_ERROR': loggerConfig.sampling.ERROR?.toString() || '1.0',
      'PLATFORM_LOG_SAMPLING_WARN': loggerConfig.sampling.WARN?.toString() || '1.0',
      'PLATFORM_LOG_SAMPLING_INFO': loggerConfig.sampling.INFO?.toString() || '0.1',
      'PLATFORM_LOG_SAMPLING_DEBUG': loggerConfig.sampling.DEBUG?.toString() || '0.01',
      
      // Performance Configuration
      'PLATFORM_LOG_ASYNC_BATCHING': loggerConfig.asyncBatching.toString(),
      'PLATFORM_LOG_BATCH_SIZE': '100',
      'PLATFORM_LOG_BATCH_TIMEOUT': '5000',
      
      // Correlation Configuration
      'PLATFORM_CORRELATION_FIELDS': loggerConfig.correlationFields.join(','),
      
      // JSON Schema Validation
      'PLATFORM_LOG_SCHEMA_VALIDATION': 'true',
      'PLATFORM_LOG_FORMAT': 'json'
    };

    // Add environment variables to Lambda function
    Object.entries(loggingEnvVars).forEach(([key, value]) => {
      lambdaFunction.addEnvironment(key, value);
    });
  }


  /**
   * Map retention days to CloudWatch enum
   */
  private mapRetentionToEnum(days: number): logs.RetentionDays {
    if (days <= 1) return logs.RetentionDays.ONE_DAY;
    if (days <= 7) return logs.RetentionDays.ONE_WEEK;
    if (days <= 30) return logs.RetentionDays.ONE_MONTH;
    if (days <= 90) return logs.RetentionDays.THREE_MONTHS;
    if (days <= 365) return logs.RetentionDays.ONE_YEAR;
    if (days <= 1095) return logs.RetentionDays.THREE_YEARS;
    if (days <= 2555) return logs.RetentionDays.SEVEN_YEARS;
    return logs.RetentionDays.TEN_YEARS;
  }

}
