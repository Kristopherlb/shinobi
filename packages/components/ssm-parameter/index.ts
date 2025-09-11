/**
 * @platform/ssm-parameter - SSM Parameter Component
 * AWS Systems Manager Parameter Store for configuration management
 */

// Component exports
export { SsmParameterComponent } from './ssm-parameter.component';

// Configuration exports
export { 
  SsmParameterConfig,
  SsmParameterConfigBuilder,
  SSM_PARAMETER_CONFIG_SCHEMA
} from './ssm-parameter.builder';

// Creator exports
export { SsmParameterCreator } from './ssm-parameter.creator';