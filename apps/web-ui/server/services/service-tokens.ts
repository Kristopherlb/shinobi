/**
 * Service Tokens
 * 
 * Type-safe service identification tokens for dependency injection.
 * Follows the Shinobi platform's service identification patterns.
 */

export const SERVICE_TOKENS = {
  // Logging Services
  LOGGER_SERVICE: 'loggerService',
  SHINOBI_LOGGER: 'shinobiLogger',
  
  // Storage Services
  STORAGE_SERVICE: 'storageService',
  
  // Local Development Services
  LOCAL_DEV_SERVICE: 'localDevService',
  
  // Validation Services
  VALIDATION_SERVICE: 'validationService',
  
  // Notification Services
  NOTIFICATION_SERVICE: 'notificationService',
  
  // Feature Flag Services
  FEATURE_FLAG_SERVICE: 'featureFlagService',
  SHINOBI_FEATURE_FLAG_SERVICE: 'shinobiFeatureFlagService',
  
  // Security Services
  SECURITY_SERVICE: 'securityService',
  
  // Audit Services
  AUDIT_SERVICE: 'auditService'
} as const;

/**
 * Service interface definitions for type safety
 */
export interface WebUIServices {
  loggerService?: any;
  shinobiLogger?: any;
  storageService?: any;
  localDevService?: any;
  validationService?: any;
  notificationService?: any;
  featureFlagService?: any;
  shinobiFeatureFlagService?: any;
  securityService?: any;
  auditService?: any;
}

/**
 * Type for service tokens
 */
export type ServiceToken = keyof typeof SERVICE_TOKENS;
