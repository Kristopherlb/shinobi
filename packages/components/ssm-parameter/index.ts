/**
 * @platform/ssm-parameter - SSM Parameter Component
 * AWS Systems Manager Parameter Store for configuration management
 */

// Component exports
export { SsmParameterComponent } from './ssm-parameter.component.js';

// Configuration exports
export {
  SsmParameterComponentConfig,
  SsmParameterComponentConfigBuilder,
  SSM_PARAMETER_CONFIG_SCHEMA
} from './ssm-parameter.builder.js';

// Creator exports
export { SsmParameterCreator } from './ssm-parameter.creator.js';
