/**
 * Observability Handler Interface
 * 
 * Defines the contract for component-specific observability handlers.
 * Each handler is responsible for applying OpenTelemetry instrumentation
 * and CloudWatch alarms for a specific component type.
 */

import { BaseComponent } from '../../platform/contracts/component';

export interface ObservabilityHandlerResult {
  instrumentationApplied: boolean;
  alarmsCreated: number;
  executionTimeMs: number;
}

/**
 * Centralized observability configuration from platform config files
 */
export interface ObservabilityConfig {
  traceSamplingRate: number;
  metricsInterval: number;
  logsRetentionDays: number;
  alarmThresholds: {
    ec2: {
      cpuUtilization: number;
      statusCheckFailed: number;
      networkIn: number;
    };
    rds: {
      freeStorageSpace: number;
      cpuUtilization: number;
      connectionCount: number;
    };
    lambda: {
      errorRate: number;
      duration: number;
      throttles: number;
    };
    alb: {
      responseTime: number;
      http5xxErrors: number;
      unhealthyTargets: number;
    };
    sqs: {
      messageAge: number;
      deadLetterMessages: number;
    };
    ecs: {
      cpuUtilization: number;
      memoryUtilization: number;
      taskCount: number;
    };
  };
  otelEnvironmentTemplate: Record<string, string>;
  ec2OtelUserDataTemplate: string;
}

/**
 * Interface for observability handlers that apply OpenTelemetry instrumentation
 * and CloudWatch alarms to specific component types.
 */
export interface IObservabilityHandler {
  /**
   * The component type this handler supports
   */
  readonly supportedComponentType: string;

  /**
   * Apply OpenTelemetry instrumentation and CloudWatch alarms to the component
   * @param component The component to instrument
   * @param config Centralized observability configuration from platform config
   * @returns Result containing instrumentation and alarm creation details
   */
  apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult;
}
