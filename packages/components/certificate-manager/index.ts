/**
 * @platform/certificate-manager - CertificateManagerComponent Component
 * Certificate Manager Component
 */

// Component exports
export { CertificateManagerComponent } from './src/certificate-manager.component.js';

// Configuration exports
export {
  CertificateManagerComponentConfigBuilder,
  CERTIFICATE_MANAGER_CONFIG_SCHEMA
} from './src/certificate-manager.builder.js';

// Type exports
export type { CertificateManagerConfig } from './src/certificate-manager.builder.js';

// Schema exports
export { default as CERTIFICATE_MANAGER_CONFIG_JSON_SCHEMA } from './Config.schema.json' with { type: 'json' };

// Creator exports
export { CertificateManagerComponentCreator } from './src/certificate-manager.creator.js';
