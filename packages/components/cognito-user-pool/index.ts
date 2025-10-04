/**
 * @platform/cognito-user-pool - CognitoUserPoolComponent Component
 * Cognito User Pool Component implementing Component API Contract v1.0
 */

// Component exports
export { CognitoUserPoolComponent } from './src/cognito-user-pool.component.ts';

// Configuration exports
export {
  CognitoUserPoolConfig,
  CognitoUserPoolComponentConfigBuilder,
  COGNITO_USER_POOL_CONFIG_SCHEMA
} from './src/cognito-user-pool.builder.ts';

// Creator exports
export { CognitoUserPoolComponentCreator } from './src/cognito-user-pool.creator.ts';
