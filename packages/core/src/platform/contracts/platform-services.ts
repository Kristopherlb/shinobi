/**
 * Platform Services Contract
 * 
 * Defines the standard interface for all cross-cutting platform services.
 * These services are applied to components after synthesis to handle
 * concerns like observability, security scanning, cost management, etc.
 */

import type { BaseComponent } from './component.ts';

/**
 * Standard interface for all platform services that operate on components
 * after synthesis to apply cross-cutting concerns.
 * 
 * This interface follows the Platform Service Injector Standard v1.0
 */
export interface IPlatformService {
  /**
   * The name of the service, used for logging and identification.
   */
  readonly name: string;

  /**
   * The core method that applies the service's logic to a component
   * after it has been fully synthesized.
   * @param component The fully synthesized component instance.
   */
  apply(component: BaseComponent): void;
}

/**
 * Configuration for platform services
 */
export interface PlatformServiceConfig {
  /** Whether this service is enabled */
  enabled: boolean;
  
  /** Service-specific configuration */
  config?: Record<string, any>;
}

/**
 * Registry of all available platform services
 */
/**
 * Registry of all available platform services, including feature flag support,
 * logging standard, and IAM audit capabilities.
 */
export interface PlatformServiceRegistry {
  /** Observability service for creating CloudWatch alarms and monitoring */
  observability?: PlatformServiceConfig;

  /** Cost management service for cost optimization recommendations */
  costManagement?: PlatformServiceConfig;

  /** Security scanning service for compliance and vulnerability detection */
  securityScanning?: PlatformServiceConfig;

  /** Backup and disaster recovery service */
  backupRecovery?: PlatformServiceConfig;

  /** Performance optimization service */
  performanceOptimization?: PlatformServiceConfig;

  /** Feature flag service using OpenFeature standard */
  featureFlag?: PlatformServiceConfig;

  /** Logging service for enforcing platform logging standards */
  logging?: PlatformServiceConfig;

  /** IAM audit service for access and permissions auditing */
  audit?: PlatformServiceConfig;
}

/**
 * Context passed to platform services during application
 */
export interface PlatformServiceContext {
  /** The service name and metadata */
  serviceName: string;
  environment: string;
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  region: string;
  
  /** Platform logger instance for structured logging */
  logger: {
    info(message: string, metadata?: Record<string, any>): void;
    warn(message: string, metadata?: Record<string, any>): void;
    error(message: string, metadata?: Record<string, any>): void;
    debug(message: string, metadata?: Record<string, any>): void;
  };
  
  /** Service-specific labels and metadata */
  serviceLabels?: Record<string, string>;
  
  /** Registry of enabled services and their configurations */
  serviceRegistry: PlatformServiceRegistry;
}

/**
 * Result of applying a platform service
 */
export interface PlatformServiceResult {
  /** Name of the service that was applied */
  serviceName: string;
  
  /** The component type that was processed */
  componentType: string;
  
  /** The component name that was processed */
  componentName: string;
  
  /** Whether the service was successfully applied */
  success: boolean;
  
  /** Any error that occurred during application */
  error?: string;
  
  /** Metadata about what was applied (e.g., number of alarms created) */
  metadata?: Record<string, any>;
  
  /** Execution time in milliseconds */
  executionTimeMs: number;
}
