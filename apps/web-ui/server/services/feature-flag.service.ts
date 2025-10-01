/**
 * Web UI Feature Flag Service
 * 
 * Integrates with Shinobi platform's OpenFeature service for feature flag evaluation.
 * Provides both server-side and client-side feature flag capabilities.
 * Compliant with Platform Feature Flagging & Canary Deployment Standard v1.0.
 */

import { 
  FeatureFlagService as ShinobiFeatureFlagService,
  FeatureFlagServiceConfig,
  FeatureFlagEvaluationOptions,
  FeatureFlagEvaluationResult,
  FeatureFlagEvaluationContext,
  IFeatureFlagService
} from '@shinobi/core';
import { WebUILoggerService } from './logger.service.js';

export interface WebUIFeatureFlagConfig extends FeatureFlagServiceConfig {
  /** Default evaluation context for web-ui */
  defaultContext?: FeatureFlagEvaluationContext & {
    service: 'web-ui';
    environment: string;
    version: string;
  };
}

export interface WebUIFeatureFlagEvaluationOptions<T = any> extends FeatureFlagEvaluationOptions<T> {
  /** User context for targeting */
  userContext?: {
    userId?: string;
    email?: string;
    role?: string;
    team?: string;
  };
  /** Request context for evaluation */
  requestContext?: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  };
}

export interface WebUIFeatureFlagEvaluationResult<T = any> extends FeatureFlagEvaluationResult<T> {
  /** Evaluation metadata */
  metadata?: {
    evaluatedAt: string;
    clientName: string;
    contextKeys: string[];
  };
}

/**
 * Web UI Feature Flag Service
 * 
 * Wraps the Shinobi platform's FeatureFlagService with web-ui specific context
 * and evaluation options. Provides both server-side and client-side capabilities.
 */
export class WebUIFeatureFlagService implements IFeatureFlagService {
  private shinobiService: ShinobiFeatureFlagService;
  private loggerService: WebUILoggerService;
  private serviceName = 'web-ui-feature-flags';
  private defaultContext: FeatureFlagEvaluationContext;

  constructor(
    shinobiService?: ShinobiFeatureFlagService,
    loggerService?: WebUILoggerService,
    config?: WebUIFeatureFlagConfig
  ) {
    this.shinobiService = shinobiService || new ShinobiFeatureFlagService(config);
    this.loggerService = loggerService || new WebUILoggerService();
    
    // Set default context for web-ui
    this.defaultContext = {
      service: 'web-ui',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      ...config?.defaultContext
    };

    this.loggerService.logServiceOperation('feature-flag-service-initialized', {
      serviceName: this.serviceName,
      environment: this.defaultContext.environment,
      version: this.defaultContext.version
    });
  }

  /**
   * Configure the underlying Shinobi feature flag service
   */
  async configure(config?: WebUIFeatureFlagConfig): Promise<void> {
    try {
      await this.shinobiService.configure(config);
      
      this.loggerService.logServiceOperation('feature-flag-service-configured', {
        serviceName: this.serviceName,
        providerType: config?.provider?.providerType || 'default'
      });
    } catch (error) {
      this.loggerService.logServiceError('feature-flag-configuration-failed', error as Error, {
        serviceName: this.serviceName,
        config: config
      });
      throw error;
    }
  }

  /**
   * Get a feature flag client with web-ui specific configuration
   */
  async getClient(options?: { clientName?: string }): Promise<any> {
    try {
      const client = await this.shinobiService.getClient({
        clientName: options?.clientName || 'web-ui-client',
        defaultContext: this.defaultContext
      });

      this.loggerService.logServiceOperation('feature-flag-client-obtained', {
        serviceName: this.serviceName,
        clientName: options?.clientName || 'web-ui-client'
      });

      return client;
    } catch (error) {
      this.loggerService.logServiceError('feature-flag-client-failed', error as Error, {
        serviceName: this.serviceName,
        clientName: options?.clientName
      });
      throw error;
    }
  }

  /**
   * Evaluate a boolean feature flag with web-ui context
   */
  async getBooleanValue(options: WebUIFeatureFlagEvaluationOptions<boolean>): Promise<WebUIFeatureFlagEvaluationResult<boolean>> {
    try {
      const evaluationContext = this.buildEvaluationContext(options);
      
      const result = await this.shinobiService.getBooleanValue({
        ...options,
        context: evaluationContext
      });

      // Log feature flag evaluation for audit
      this.loggerService.logFeatureFlag({
        flagKey: options.flagKey,
        flagValue: result.value,
        reason: result.reason,
        variant: result.variant,
        context: evaluationContext,
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: Object.keys(evaluationContext)
        }
      });

      return {
        ...result,
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: Object.keys(evaluationContext)
        }
      };
    } catch (error) {
      this.loggerService.logServiceError('feature-flag-boolean-evaluation-failed', error as Error, {
        serviceName: this.serviceName,
        flagKey: options.flagKey,
        defaultValue: options.defaultValue
      });
      
      // Return default value on error
      return {
        value: options.defaultValue,
        reason: 'ERROR',
        variant: undefined,
        flagMetadata: {},
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: []
        }
      };
    }
  }

  /**
   * Evaluate a string feature flag with web-ui context
   */
  async getStringValue<T extends string = string>(options: WebUIFeatureFlagEvaluationOptions<T>): Promise<WebUIFeatureFlagEvaluationResult<T>> {
    try {
      const evaluationContext = this.buildEvaluationContext(options);
      
      const result = await this.shinobiService.getStringValue({
        ...options,
        context: evaluationContext
      });

      // Log feature flag evaluation for audit
      this.loggerService.logFeatureFlag({
        flagKey: options.flagKey,
        flagValue: result.value,
        reason: result.reason,
        variant: result.variant,
        context: evaluationContext,
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: Object.keys(evaluationContext)
        }
      });

      return {
        ...result,
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: Object.keys(evaluationContext)
        }
      };
    } catch (error) {
      this.loggerService.logServiceError('feature-flag-string-evaluation-failed', error as Error, {
        serviceName: this.serviceName,
        flagKey: options.flagKey,
        defaultValue: options.defaultValue
      });
      
      // Return default value on error
      return {
        value: options.defaultValue,
        reason: 'ERROR',
        variant: undefined,
        flagMetadata: {},
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: []
        }
      };
    }
  }

  /**
   * Evaluate a number feature flag with web-ui context
   */
  async getNumberValue<T extends number = number>(options: WebUIFeatureFlagEvaluationOptions<T>): Promise<WebUIFeatureFlagEvaluationResult<T>> {
    try {
      const evaluationContext = this.buildEvaluationContext(options);
      
      const result = await this.shinobiService.getNumberValue({
        ...options,
        context: evaluationContext
      });

      // Log feature flag evaluation for audit
      this.loggerService.logFeatureFlag({
        flagKey: options.flagKey,
        flagValue: result.value,
        reason: result.reason,
        variant: result.variant,
        context: evaluationContext,
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: Object.keys(evaluationContext)
        }
      });

      return {
        ...result,
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: Object.keys(evaluationContext)
        }
      };
    } catch (error) {
      this.loggerService.logServiceError('feature-flag-number-evaluation-failed', error as Error, {
        serviceName: this.serviceName,
        flagKey: options.flagKey,
        defaultValue: options.defaultValue
      });
      
      // Return default value on error
      return {
        value: options.defaultValue,
        reason: 'ERROR',
        variant: undefined,
        flagMetadata: {},
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: []
        }
      };
    }
  }

  /**
   * Evaluate an object feature flag with web-ui context
   */
  async getObjectValue<T extends any = any>(options: WebUIFeatureFlagEvaluationOptions<T>): Promise<WebUIFeatureFlagEvaluationResult<T>> {
    try {
      const evaluationContext = this.buildEvaluationContext(options);
      
      const result = await this.shinobiService.getObjectValue({
        ...options,
        context: evaluationContext
      });

      // Log feature flag evaluation for audit
      this.loggerService.logFeatureFlag({
        flagKey: options.flagKey,
        flagValue: result.value,
        reason: result.reason,
        variant: result.variant,
        context: evaluationContext,
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: Object.keys(evaluationContext)
        }
      });

      return {
        ...result,
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: Object.keys(evaluationContext)
        }
      };
    } catch (error) {
      this.loggerService.logServiceError('feature-flag-object-evaluation-failed', error as Error, {
        serviceName: this.serviceName,
        flagKey: options.flagKey,
        defaultValue: options.defaultValue
      });
      
      // Return default value on error
      return {
        value: options.defaultValue,
        reason: 'ERROR',
        variant: undefined,
        flagMetadata: {},
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: options.clientName || 'web-ui-client',
          contextKeys: []
        }
      };
    }
  }

  /**
   * Evaluate multiple feature flags in batch with web-ui context
   */
  async evaluateFlags(request: {
    flags: Array<{
      key: string;
      type: 'boolean' | 'string' | 'number' | 'object';
      defaultValue: any;
    }>;
    clientName?: string;
    userContext?: any;
    requestContext?: any;
  }): Promise<Record<string, WebUIFeatureFlagEvaluationResult>> {
    try {
      const evaluationContext = this.buildEvaluationContext({
        userContext: request.userContext,
        requestContext: request.requestContext
      });

      const batchRequest = {
        flags: request.flags.map(flag => ({
          key: flag.key,
          type: flag.type,
          defaultValue: flag.defaultValue,
          options: {
            context: evaluationContext,
            clientName: request.clientName || 'web-ui-client'
          }
        })),
        clientName: request.clientName || 'web-ui-client',
        context: evaluationContext
      };

      const results = await this.shinobiService.evaluateFlags(batchRequest);

      // Log batch evaluation
      this.loggerService.logServiceOperation('feature-flag-batch-evaluation', {
        serviceName: this.serviceName,
        flagCount: request.flags.length,
        clientName: request.clientName || 'web-ui-client',
        contextKeys: Object.keys(evaluationContext)
      });

      return results;
    } catch (error) {
      this.loggerService.logServiceError('feature-flag-batch-evaluation-failed', error as Error, {
        serviceName: this.serviceName,
        flagCount: request.flags.length,
        clientName: request.clientName
      });
      throw error;
    }
  }

  /**
   * Shutdown the feature flag service
   */
  async shutdown(): Promise<void> {
    try {
      await this.shinobiService.shutdown();
      
      this.loggerService.logServiceOperation('feature-flag-service-shutdown', {
        serviceName: this.serviceName
      });
    } catch (error) {
      this.loggerService.logServiceError('feature-flag-shutdown-failed', error as Error, {
        serviceName: this.serviceName
      });
      throw error;
    }
  }

  /**
   * Build evaluation context from web-ui specific options
   */
  private buildEvaluationContext(options: WebUIFeatureFlagEvaluationOptions): FeatureFlagEvaluationContext {
    const context: FeatureFlagEvaluationContext = {
      ...this.defaultContext
    };

    // Add user context if provided
    if (options.userContext) {
      if (options.userContext.userId) {
        context.userId = options.userContext.userId;
      }
      if (options.userContext.email) {
        context.email = options.userContext.email;
      }
      if (options.userContext.role) {
        context.role = options.userContext.role;
      }
      if (options.userContext.team) {
        context.team = options.userContext.team;
      }
    }

    // Add request context if provided
    if (options.requestContext) {
      if (options.requestContext.userAgent) {
        context.userAgent = options.requestContext.userAgent;
      }
      if (options.requestContext.ipAddress) {
        context.ipAddress = options.requestContext.ipAddress;
      }
      if (options.requestContext.sessionId) {
        context.sessionId = options.requestContext.sessionId;
      }
    }

    // Merge any additional context from options
    if (options.context) {
      Object.assign(context, options.context);
    }

    return context;
  }
}

/**
 * Create a default WebUI Feature Flag Service instance
 */
export function createWebUIFeatureFlagService(
  shinobiService?: ShinobiFeatureFlagService,
  loggerService?: WebUILoggerService,
  config?: WebUIFeatureFlagConfig
): WebUIFeatureFlagService {
  return new WebUIFeatureFlagService(shinobiService, loggerService, config);
}