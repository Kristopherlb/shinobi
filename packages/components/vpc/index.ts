/**
 * @platform/vpc - VPC Component
 * AWS Virtual Private Cloud component for network isolation with compliance-aware configurations
 */

// Component exports
export { VpcComponent } from './vpc.component.ts';

// Configuration exports
export { 
  VpcConfig,
  VpcConfigBuilder,
  VPC_CONFIG_SCHEMA
} from './vpc.builder.ts';

// Creator exports
export { VpcCreator } from './vpc.creator.ts';