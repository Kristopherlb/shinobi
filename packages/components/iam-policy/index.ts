/**
 * @platform/iam-policy - IamPolicyComponent Component
 * IAM Policy Component
 */

// Component exports
export { IamPolicyComponent } from './iam-policy.component.js';

// Configuration exports
export { 
  IamPolicyComponentConfigBuilder,
  IAM_POLICY_CONFIG_SCHEMA
} from './iam-policy.builder.js';
export type { IamPolicyConfig } from './iam-policy.builder.js';

// Creator exports
export { IamPolicyComponentCreator } from './iam-policy.creator.js';