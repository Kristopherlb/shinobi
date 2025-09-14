/**
 * Backstage Portal Component - Main Export
 * 
 * Exports the main component class, configuration builder, and creator
 * for use by the Shinobi platform.
 */

// Export the main component class
export { BackstagePortalComponent } from './backstage-portal.component';

// Export the configuration builder and types
export { 
  BackstagePortalConfig, 
  BackstagePortalConfigBuilder, 
  BACKSTAGE_PORTAL_CONFIG_SCHEMA 
} from './backstage-portal.builder';

// Export the component creator
export { 
  BackstagePortalComponentCreator, 
  backstagePortalComponentCreator 
} from './backstage-portal.creator';

// Re-export platform contracts for convenience
export type { 
  ComponentContext, 
  ComponentSpec, 
  ComponentCapabilities 
} from '@platform/contracts';
