/**
 * @cdk-lib/observability-service
 * 
 * Centralized observability service for CDK-Lib platform components.
 * Provides OpenTelemetry instrumentation and CloudWatch alarms across all component types.
 */

export { ObservabilityService } from './observability.service.ts';
export type { IPlatformService } from '@shinobi/core';
export type { PlatformServiceContext } from '@shinobi/core';

// Re-export handler interfaces for convenience
export type { 
  IObservabilityHandler, 
  ObservabilityHandlerResult, 
  ObservabilityConfig 
} from '@cdk-lib/observability-handlers';

// Export cache management utilities
export const ObservabilityServiceUtils = {
  clearConfigCache: () => ObservabilityService.clearConfigCache(),
  getCacheStats: () => ObservabilityService.getCacheStats()
};
