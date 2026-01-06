/**
 * @platform/ssm-parameter - SSM Parameter Component
 * AWS Systems Manager Parameter Store for configuration management
 */

// Component exports
export { SsmParameterComponent } from './ssm-parameter.component.js';

// Configuration exports
export type { SsmParameterComponentConfig } from './ssm-parameter.builder.js';
export {
  SsmParameterComponentConfigBuilder,
  SSM_PARAMETER_CONFIG_SCHEMA
} from './ssm-parameter.builder.js';

// Creator exports
export { SsmParameterComponentCreator } from './ssm-parameter.creator.js';
