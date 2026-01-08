/**
 * @platform/secrets-manager - SecretsManagerComponent Component
 * Secrets Manager Component
 */

// Component exports
export { SecretsManagerComponentComponent } from './secrets-manager.component.js';

// Configuration exports
export type { SecretsManagerConfig } from './secrets-manager.builder.js';
export { 
  SecretsManagerComponentConfigBuilder,
  SECRETS_MANAGER_CONFIG_SCHEMA
} from './secrets-manager.builder.js';

// Creator exports
export { SecretsManagerComponentCreator } from './secrets-manager.creator.js';