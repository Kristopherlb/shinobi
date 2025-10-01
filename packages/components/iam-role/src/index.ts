/**
 * IAM Role Component Package
 * 
 * Exports all IAM role component classes and interfaces.
 */

// Main component class
export { IamRoleComponent } from './iam-role.component.js';

// Configuration builder and interfaces
export { 
  IamRoleConfig, 
  IamRoleConfigBuilder, 
  IAM_ROLE_CONFIG_SCHEMA 
} from './iam-role.builder.js';

// Component creator factory
export { IamRoleCreator } from './iam-role.creator.js';
