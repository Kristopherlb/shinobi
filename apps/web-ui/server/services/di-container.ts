/**
 * Dependency Injection Container
 * 
 * Implements a lightweight DI container that follows the Shinobi platform's
 * constructor injection patterns. Provides service registration, resolution,
 * and lifecycle management.
 */

import { SERVICE_TOKENS, WebUIServices } from './service-tokens.js';

/**
 * DI Container for WebUI services
 * 
 * Provides centralized service registration and resolution following
 * the platform's constructor injection patterns.
 */
export class WebUIDIContainer {
  private services = new Map<string, any>();
  private singletons = new Map<string, any>();

  /**
   * Register a service in the container
   * 
   * @param token Service token
   * @param implementation Service implementation or factory function
   * @param singleton Whether this should be a singleton instance
   */
  register<T>(token: string, implementation: T | (() => T) | (() => Promise<T>), singleton = false): this {
    this.services.set(token, { implementation, singleton });
    return this;
  }

  /**
   * Get a service from the container
   * 
   * @param token Service token
   * @returns Service instance
   */
  async get<T>(token: string): Promise<T> {
    const serviceConfig = this.services.get(token);

    if (!serviceConfig) {
      throw new Error(`Service '${token}' not found in DI container`);
    }

    // Handle singleton services
    if (serviceConfig.singleton) {
      if (!this.singletons.has(token)) {
        const instance = typeof serviceConfig.implementation === 'function'
          ? await serviceConfig.implementation()
          : serviceConfig.implementation;
        this.singletons.set(token, instance);
      }
      return this.singletons.get(token);
    }

    // Handle transient services
    return typeof serviceConfig.implementation === 'function'
      ? await serviceConfig.implementation()
      : serviceConfig.implementation;
  }

  /**
   * Check if a service is registered
   * 
   * @param token Service token
   * @returns True if service is registered
   */
  has(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * Clear all registered services and singleton instances
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Get all registered service tokens
   * 
   * @returns Array of service tokens
   */
  getRegisteredTokens(): string[] {
    return Array.from(this.services.keys());
  }
}

/**
 * Default service factory functions
 * These provide default implementations when no custom service is registered
 */
export const defaultServiceFactories = {
  [SERVICE_TOKENS.SHINOBI_LOGGER]: async () => {
    const { Logger } = await import('@shinobi/observability-handlers');
    return new Logger('web-ui');
  },

  [SERVICE_TOKENS.LOGGER_SERVICE]: async (container: WebUIDIContainer) => {
    const { WebUILoggerService } = await import('./logger.service.js');
    const shinobiLogger = container.has(SERVICE_TOKENS.SHINOBI_LOGGER)
      ? container.get(SERVICE_TOKENS.SHINOBI_LOGGER)
      : await defaultServiceFactories[SERVICE_TOKENS.SHINOBI_LOGGER]();
    return new WebUILoggerService(shinobiLogger);
  },

  [SERVICE_TOKENS.SHINOBI_FEATURE_FLAG_SERVICE]: async () => {
    const { FeatureFlagService } = await import('@shinobi/core');
    return new FeatureFlagService({
      logger: await defaultServiceFactories[SERVICE_TOKENS.SHINOBI_LOGGER](),
      defaultContext: {
        service: 'web-ui',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      }
    });
  },

  [SERVICE_TOKENS.FEATURE_FLAG_SERVICE]: async (container: WebUIDIContainer) => {
    const { createWebUIFeatureFlagService } = await import('./feature-flag.service.js');
    const shinobiFeatureFlagService = container.has(SERVICE_TOKENS.SHINOBI_FEATURE_FLAG_SERVICE)
      ? container.get(SERVICE_TOKENS.SHINOBI_FEATURE_FLAG_SERVICE)
      : await defaultServiceFactories[SERVICE_TOKENS.SHINOBI_FEATURE_FLAG_SERVICE]();
    const loggerService = container.has(SERVICE_TOKENS.LOGGER_SERVICE)
      ? container.get(SERVICE_TOKENS.LOGGER_SERVICE)
      : await defaultServiceFactories[SERVICE_TOKENS.LOGGER_SERVICE](container);
    return createWebUIFeatureFlagService(shinobiFeatureFlagService, loggerService);
  }
};

/**
 * Create a default DI container with platform services
 * 
 * @param customServices Optional custom service overrides
 * @returns Configured DI container
 */
export function createWebUIDIContainer(customServices: Partial<WebUIServices> = {}): WebUIDIContainer {
  const container = new WebUIDIContainer();

  // Register default services
  container.register(SERVICE_TOKENS.SHINOBI_LOGGER, defaultServiceFactories[SERVICE_TOKENS.SHINOBI_LOGGER], true);
  container.register(SERVICE_TOKENS.LOGGER_SERVICE, () => defaultServiceFactories[SERVICE_TOKENS.LOGGER_SERVICE](container), true);
  container.register(SERVICE_TOKENS.SHINOBI_FEATURE_FLAG_SERVICE, defaultServiceFactories[SERVICE_TOKENS.SHINOBI_FEATURE_FLAG_SERVICE], true);
  container.register(SERVICE_TOKENS.FEATURE_FLAG_SERVICE, () => defaultServiceFactories[SERVICE_TOKENS.FEATURE_FLAG_SERVICE](container), true);

  // Register custom service overrides
  Object.entries(customServices).forEach(([key, service]) => {
    if (service) {
      container.register(key, service, true);
    }
  });

  return container;
}

/**
 * Global DI container instance
 * This follows the platform's pattern of having a global container
 * that can be configured and used throughout the application
 */
let globalContainer: WebUIDIContainer | null = null;

/**
 * Get the global DI container
 * 
 * @returns Global DI container instance
 */
export function getGlobalContainer(): WebUIDIContainer {
  if (!globalContainer) {
    globalContainer = createWebUIDIContainer();
  }
  return globalContainer;
}

/**
 * Set the global DI container
 * 
 * @param container DI container instance
 */
export function setGlobalContainer(container: WebUIDIContainer): void {
  globalContainer = container;
}

/**
 * Reset the global DI container
 */
export function resetGlobalContainer(): void {
  globalContainer = null;
}
