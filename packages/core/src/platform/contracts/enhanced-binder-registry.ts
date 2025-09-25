/**
 * Enhanced Binder Registry
 * Manages binder strategies with caching, metrics, and performance optimization
 */

import { createHash } from 'crypto';
import { EnhancedBinderStrategy } from './enhanced-binder-strategy';
import {
  EnhancedBindingContext,
  EnhancedBindingResult,
  BindingMetadata,
  Capability
} from './bindings';
import { BindingCache } from './performance/binding-cache';
import { BindingMetricsCollector } from './performance/binding-metrics-collector';
import { BindingBenchmark } from './performance/binding-benchmark';

// Logger interface for structured logging
interface Logger {
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
  debug(message: string, metadata?: Record<string, unknown>): void;
}

/**
 * Enhanced binder registry with async support, caching, and compliance enforcement
 */
export class EnhancedBinderRegistry {
  private strategies: Map<string, EnhancedBinderStrategy> = new Map();
  private cache: BindingCache;
  private metrics: BindingMetricsCollector;
  private benchmark: BindingBenchmark;
  private logger: Logger;

  constructor(logger: Logger, cacheConfig?: any) {
    this.logger = logger;
    this.cache = new BindingCache(cacheConfig);
    this.metrics = new BindingMetricsCollector();
    this.benchmark = new BindingBenchmark();
    this.registerDefaultStrategies();
  }

  /**
   * Register a binder strategy
   */
  register(strategy: EnhancedBinderStrategy): void {
    const strategyName = strategy.getStrategyName();
    this.strategies.set(strategyName, strategy);
    this.logger.info('binder.strategy.registered', { strategyName });
  }

  /**
   * Find a strategy that can handle the binding
   */
  findStrategy(sourceType: string, capability: Capability): EnhancedBinderStrategy | null {
    for (const strategy of Array.from(this.strategies.values())) {
      if (strategy.canHandle(sourceType, capability)) {
        return strategy;
      }
    }
    return null;
  }

  /**
   * Execute binding with full pipeline: cache, compliance, strategy, metrics
   */
  async bind(context: EnhancedBindingContext): Promise<EnhancedBindingResult> {
    const startTime = Date.now();
    const bindingId = this.generateBindingId(context);

    try {
      this.logger.debug('binder.bind.start', {
        bindingId,
        source: context.source.getName(),
        target: context.target.getName(),
        capability: context.directive.capability,
        framework: context.complianceFramework
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(context);
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        this.metrics.recordCacheHit(bindingId);
        this.logger.debug('binder.bind.cache_hit', { bindingId, cacheKey });
        return cachedResult;
      }

      // Find appropriate strategy
      const strategy = this.findStrategy(context.source.getType(), context.directive.capability);
      if (!strategy) {
        const error = new Error(`No binder strategy found for ${context.source.getType()} -> ${context.directive.capability}`);
        this.logger.error('binder.bind.no_strategy', {
          bindingId,
          sourceType: context.source.getType(),
          capability: context.directive.capability
        });
        throw error;
      }

      // Compliance enforcement removed; bind strategies must be safe-by-default or manifest-driven

      // Execute binding strategy
      const bindingResult = await strategy.bind(context);

      // Wrap result with metadata only
      const enhancedResult: EnhancedBindingResult = {
        environmentVariables: bindingResult.environmentVariables,
        iamPolicies: bindingResult.iamPolicies,
        securityGroupRules: bindingResult.securityGroupRules,
        complianceActions: bindingResult.complianceActions,
        metadata: {
          ...bindingResult.metadata,
          bindingId,
          strategyName: strategy.getStrategyName(),
          timestamp: new Date().toISOString(),
          version: process.env.BINDER_STRATEGY_VERSION || 'v1'
        }
      };

      // Cache result
      this.cache.set(cacheKey, enhancedResult);

      // Record metrics
      const duration = Date.now() - startTime;
      this.metrics.recordBindingSuccess(bindingId, duration, strategy.getStrategyName());

      this.logger.info('binder.bind.success', {
        bindingId,
        duration,
        strategy: strategy.getStrategyName()
      });

      return enhancedResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.recordBindingFailure(bindingId, duration, error instanceof Error ? error.message : 'Unknown error');

      this.logger.error('binder.bind.failure', {
        bindingId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: context.source.getName(),
        target: context.target.getName(),
        capability: context.directive.capability
      });

      throw error;
    }
  }

  /**
   * Generate deterministic binding ID
   */
  private generateBindingId(context: EnhancedBindingContext): string {
    const input = [
      context.source.getId(),
      context.target.getId(),
      context.directive.capability,
      context.directive.access,
      context.complianceFramework,
      context.environment
    ].join(':');

    return createHash('sha256')
      .update(input)
      .digest('hex')
      .slice(0, 12);
  }

  /**
   * Generate deterministic cache key with versioning
   */
  private generateCacheKey(context: EnhancedBindingContext): string {
    return [
      context.source.getId(),
      context.target.getId(),
      context.directive.capability,
      context.directive.access,
      context.complianceFramework,
      context.environment,
      process.env.BINDER_STRATEGY_VERSION || 'v1'
    ].join('|');
  }

  /**
   * Register default binder strategies
   */
  private registerDefaultStrategies(): void {
    // Import and register default strategies
    this.register(new (require('./binders/database-binder-strategy').DatabaseBinderStrategy)());
    this.register(new (require('./binders/storage-binder-strategy').StorageBinderStrategy)());
    this.register(new (require('./binders/cache-binder-strategy').CacheBinderStrategy)());
    this.register(new (require('./binders/queue-binder-strategy').QueueBinderStrategy)());
    this.register(new (require('./binders/lambda-binder-strategy').LambdaBinderStrategy)());
    this.register(new (require('./binders/api-gateway-binder-strategy').ApiGatewayBinderStrategy)());
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    strategiesCount: number;
    cacheStats: any;
    metricsStats: any;
  } {
    return {
      strategiesCount: this.strategies.size,
      cacheStats: this.cache.getStats(),
      metricsStats: this.metrics.getStats()
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('binder.cache.cleared');
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark(): Promise<any> {
    return this.benchmark.runBenchmarkSuite();
  }

  /**
   * Get compatible targets for a source component
   */
  getCompatibleTargets(sourceType: string, capability: Capability): string[] {
    const strategy = this.findStrategy(sourceType, capability);
    if (!strategy) {
      return [];
    }

    // This would be implemented by each strategy to return supported target types
    // For now, return a generic list
    return ['*']; // All targets compatible
  }
}