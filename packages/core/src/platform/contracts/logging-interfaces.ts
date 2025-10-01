/**
 * Platform Logging Interfaces
 * 
 * Defines the standard interface for all logging handlers and related types.
 * Implements the Handler Pattern for component-specific logging infrastructure.
 */

import { IComponent } from './component-interfaces.js';
import { PlatformServiceContext } from './platform-services.js';

/**
 * Standard interface for all component-specific logging handlers
 * 
 * Each handler is responsible for:
 * - Provisioning CloudWatch Log Groups with compliance-appropriate configuration
 * - Setting up log retention policies based on compliance framework
 * - Configuring encryption and access controls
 * - Instrumenting components with structured logging capabilities
 */
export interface ILoggingHandler {
  /** The component type this handler supports (e.g., 'lambda-api', 'vpc', 'ecs-fargate-service') */
  readonly componentType: string;

  /**
   * Apply logging infrastructure and instrumentation to a component
   * @param component The component to apply logging to
   * @param context Platform service context with compliance and environment information
   */
  apply(component: IComponent, context: PlatformServiceContext): LoggingHandlerResult;
}

/**
 * Result of applying a logging handler to a component
 */
export interface LoggingHandlerResult {
  /** Whether logging was successfully applied */
  success: boolean;

  /** CloudWatch Log Group ARN that was created or configured */
  logGroupArn?: string;

  /** Log retention period in days based on compliance framework */
  retentionDays: number;

  /** Encryption configuration applied */
  encryption: {
    enabled: boolean;
    kmsKeyId?: string;
    managedKey: boolean;
  };

  /** Security classification applied to logs */
  classification: 'public' | 'internal' | 'confidential' | 'cui' | 'phi';

  /** Any error that occurred during logging setup */
  error?: string;

  /** Metadata about the logging configuration */
  metadata?: Record<string, any>;
}

/**
 * Log retention policies based on compliance framework
 */
export interface LogRetentionPolicy {
  /** Retention period in days */
  retentionDays: number;

  /** Whether immutable (write-once, read-many) storage is required */
  immutable: boolean;

  /** Required encryption level */
  encryptionLevel: 'standard' | 'enhanced' | 'customer-managed';

  /** Whether audit trails are required for all access */
  auditRequired: boolean;

  /** Maximum allowed log sampling rate (1.0 = 100%, 0.1 = 10%) */
  maxSamplingRate: number;
}

/**
 * Security classification configuration for logs
 */
export interface LogSecurityConfig {
  /** Data classification level */
  classification: 'public' | 'internal' | 'confidential' | 'cui' | 'phi';

  /** Whether PII detection and redaction is required */
  piiRedactionRequired: boolean;

  /** Whether real-time security monitoring is enabled */
  securityMonitoring: boolean;

  /** Custom redaction rules for this classification level */
  redactionRules: string[];

  /** Whether logs should trigger security alerts */
  securityAlertsEnabled: boolean;
}

/**
 * Platform logger configuration for component instrumentation
 */
export interface PlatformLoggerConfig {
  /** Logger name (typically service.component format) */
  name: string;

  /** Minimum log level to capture */
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

  /** CloudWatch Log Group to send logs to */
  logGroup: string;

  /** Log stream prefix */
  streamPrefix: string;

  /** Sampling configuration by log level */
  sampling: Record<string, number>;

  /** Security configuration for this logger */
  security: LogSecurityConfig;

  /** Whether to enable async batching for performance */
  asyncBatching: boolean;

  /** Correlation fields to automatically inject */
  correlationFields: string[];
}
