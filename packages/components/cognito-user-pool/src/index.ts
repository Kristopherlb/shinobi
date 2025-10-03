/**
 * @platform/cognito-user-pool - CognitoUserPoolComponent Component
 * Cognito User Pool Component implementing Component API Contract v1.0
 */

// Component exports
export { CognitoUserPoolComponent } from './cognito-user-pool.component.js';

// Configuration exports
export {
  CognitoUserPoolConfig,
  CognitoUserPoolComponentConfigBuilder,
  COGNITO_USER_POOL_CONFIG_SCHEMA
} from './cognito-user-pool.builder.js';

// Creator exports
export { CognitoUserPoolComponentCreator } from './cognito-user-pool.creator.js';
