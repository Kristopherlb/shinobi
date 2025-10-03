/**
 * Container Application Component - Main Export
 * 
 * Exports the main component class, configuration builder, and creator
 * for use by the Shinobi platform.
 */

// Export the main component class
export { ContainerApplicationComponent } from './container-application.component.js';

// Export the configuration builder and schema
export {
  ContainerApplicationComponentConfigBuilder,
  ContainerApplicationComponentConfigBuilder as ContainerApplicationConfigBuilder,
  CONTAINER_APPLICATION_CONFIG_SCHEMA
} from './container-application.builder.js';
export type { ContainerApplicationConfig } from './container-application.builder.js';

// Export the component creator
export {
  ContainerApplicationComponentCreator,
  containerApplicationComponentCreator
} from './container-application.creator.js';

// Re-export platform contracts for convenience
export type {
  ComponentContext,
  ComponentSpec,
  ComponentCapabilities
} from '@shinobi/core';
