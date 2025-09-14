/**
 * Container Application Component - Main Export
 * 
 * Exports the main component class, configuration builder, and creator
 * for use by the Shinobi platform.
 */

// Export the main component class
export { ContainerApplicationComponent } from './container-application.component';

// Export the configuration builder and types
export { 
  ContainerApplicationConfig, 
  ContainerApplicationConfigBuilder, 
  CONTAINER_APPLICATION_CONFIG_SCHEMA 
} from './container-application.builder';

// Export the component creator
export { 
  ContainerApplicationComponentCreator, 
  containerApplicationComponentCreator 
} from './container-application.creator';

// Re-export platform contracts for convenience
export type { 
  ComponentContext, 
  ComponentSpec, 
  ComponentCapabilities 
} from '@platform/contracts';
