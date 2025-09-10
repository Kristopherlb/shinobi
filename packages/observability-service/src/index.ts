/**
 * @cdk-lib/observability-service
 * 
 * Centralized observability service for CDK-Lib platform components.
 * Provides OpenTelemetry instrumentation and CloudWatch alarms across all component types.
 */

export { ObservabilityService } from './observability.service';
export type { IPlatformService } from '@cdk-lib/platform-contracts';
export type { PlatformServiceContext } from '@cdk-lib/platform-contracts';

// Re-export handler interfaces for convenience
export type { 
  IObservabilityHandler, 
  ObservabilityHandlerResult, 
  ObservabilityConfig 
} from '@cdk-lib/observability-handlers';
