import {
  Client,
  ErrorCode,
  EvaluationContext,
  EvaluationDetails,
  FlagEvaluationOptions,
  FlagValue,
  Hook,
  HookHints,
  JsonValue,
  Logger,
  NOOP_PROVIDER,
  OpenFeature,
  Provider,
  StandardResolutionReasons
} from '@openfeature/js-sdk';
import {
  ComponentContext,
  FeatureFlagProviderReference
} from '../../contracts/component-interfaces.ts';

export type FeatureFlagEvaluationContext = EvaluationContext;

export interface FeatureFlagProviderConfig extends FeatureFlagProviderReference {
  providerInstance?: Provider;
}

export interface FeatureFlagServiceConfig {
  provider?: FeatureFlagProviderConfig;
  clientName?: string;
  defaultContext?: FeatureFlagEvaluationContext;
  hooks?: Hook[];
  logger?: Logger;
}

export interface FeatureFlagClientOptions {
  clientName?: string;
  provider?: FeatureFlagProviderConfig;
  componentContext?: ComponentContext;
  context?: FeatureFlagEvaluationContext;
  hooks?: Hook[];
}

export interface FeatureFlagEvaluationOptions<T extends FlagValue> {
  flagKey: string;
  defaultValue: T;
  clientName?: string;
  provider?: FeatureFlagProviderConfig;
  componentContext?: ComponentContext;
  context?: FeatureFlagEvaluationContext;
  clientContext?: FeatureFlagEvaluationContext;
  hooks?: Hook[];
  hookHints?: HookHints;
}

export interface FeatureFlagEvaluationResult<T extends FlagValue> extends EvaluationDetails<T> {}

export interface FeatureFlagEvaluationDescriptor<T extends FlagValue = FlagValue> {
  key: string;
  type: 'boolean' | 'string' | 'number' | 'object';
  defaultValue: T;
  options?: Omit<FeatureFlagEvaluationOptions<T>, 'flagKey' | 'defaultValue'>;
}

export interface FeatureFlagBatchEvaluationRequest {
  flags: FeatureFlagEvaluationDescriptor[];
  clientName?: string;
  provider?: FeatureFlagProviderConfig;
  componentContext?: ComponentContext;
  context?: FeatureFlagEvaluationContext;
  clientContext?: FeatureFlagEvaluationContext;
}

export type FeatureFlagEvaluation = Record<string, FeatureFlagEvaluationResult<FlagValue>>;

export interface IFeatureFlagService {
  configure(config?: FeatureFlagServiceConfig): Promise<void>;
  getClient(options?: FeatureFlagClientOptions): Promise<Client>;
  getBooleanValue(options: FeatureFlagEvaluationOptions<boolean>): Promise<FeatureFlagEvaluationResult<boolean>>;
  getStringValue<T extends string = string>(options: FeatureFlagEvaluationOptions<T>): Promise<FeatureFlagEvaluationResult<T>>;
  getNumberValue<T extends number = number>(options: FeatureFlagEvaluationOptions<T>): Promise<FeatureFlagEvaluationResult<T>>;
  getObjectValue<T extends JsonValue = JsonValue>(options: FeatureFlagEvaluationOptions<T>): Promise<FeatureFlagEvaluationResult<T>>;
  evaluateFlags(request: FeatureFlagBatchEvaluationRequest): Promise<FeatureFlagEvaluation>;
  shutdown(): Promise<void>;
}

interface ProviderRegistration {
  provider: Provider;
  configSignature: string;
}

const DEFAULT_CLIENT_KEY = '__default__';

const createConsoleLogger = (): Logger => ({
  debug: (...args: any[]) => console.debug(...args),
  info: (...args: any[]) => console.info(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args)
});

export class FeatureFlagService implements IFeatureFlagService {
  private logger: Logger;
  private baseConfig: FeatureFlagServiceConfig;
  private readonly clientCache = new Map<string, Promise<Client>>();
  private readonly providerCache = new Map<string, ProviderRegistration>();
  private readonly providerPromises = new Map<string, Promise<void>>();
  private globalContext?: FeatureFlagEvaluationContext;
  private globalHooks: Hook[] = [];

  /**
   * Create a new feature flag service instance. Consumers may preconfigure
   * logging, default evaluation context, and a provider ahead of time.
   */
  constructor(config: FeatureFlagServiceConfig = {}) {
    this.baseConfig = this.cloneConfig(config);
    this.logger = config.logger ?? createConsoleLogger();
    this.globalHooks = this.baseConfig.hooks ? [...this.baseConfig.hooks] : [];
    OpenFeature.setLogger(this.logger);

    if (this.baseConfig.defaultContext) {
      this.globalContext = { ...this.baseConfig.defaultContext };
      OpenFeature.setContext(this.globalContext);
    }
  }

  /**
   * Merge runtime configuration and (re)register providers when overrides occur.
   * Useful for long-lived processes that need to respond to dynamic settings.
   */
  public async configure(config: FeatureFlagServiceConfig = {}): Promise<void> {
    const merged: FeatureFlagServiceConfig = {
      ...this.baseConfig,
      ...config,
      provider: config.provider ?? this.baseConfig.provider,
      hooks: config.hooks ?? this.baseConfig.hooks,
      defaultContext: config.defaultContext ?? this.baseConfig.defaultContext,
      clientName: config.clientName ?? this.baseConfig.clientName,
      logger: config.logger ?? this.baseConfig.logger
    };

    this.baseConfig = this.cloneConfig(merged);

    if (config.logger) {
      this.logger = config.logger;
      OpenFeature.setLogger(this.logger);
    }

    this.globalHooks = this.baseConfig.hooks ? [...this.baseConfig.hooks] : [];

    if (this.baseConfig.defaultContext) {
      this.globalContext = { ...this.baseConfig.defaultContext };
      OpenFeature.setContext(this.globalContext);
    }

    if (config.provider || config.clientName) {
      await this.ensureProvider(this.baseConfig.provider, this.baseConfig.clientName, undefined);
    }
  }

  /**
   * Resolve or create an OpenFeature client keyed by provider/client name. Results are cached
   * so repeated evaluations reuse initialized SDK clients.
   */
  public async getClient(options: FeatureFlagClientOptions = {}): Promise<Client> {
    const provider = this.resolveProviderConfig(options.provider, options.componentContext);
    const clientName = this.resolveClientName(options.clientName, provider, options.componentContext);
    const cacheKey = this.buildClientCacheKey(clientName);

    if (!this.clientCache.has(cacheKey)) {
      const clientPromise = this.createClient(clientName, {
        ...options,
        provider
      });
      this.clientCache.set(cacheKey, clientPromise);
    }

    return this.clientCache.get(cacheKey)!;
  }

  /** Evaluate a boolean flag and return resolution details. */
  public getBooleanValue(options: FeatureFlagEvaluationOptions<boolean>): Promise<FeatureFlagEvaluationResult<boolean>> {
    return this.evaluateFlag('boolean', options);
  }

  /** Evaluate a string flag and return resolution details. */
  public getStringValue<T extends string = string>(options: FeatureFlagEvaluationOptions<T>): Promise<FeatureFlagEvaluationResult<T>> {
    return this.evaluateFlag('string', options);
  }

  /** Evaluate a numeric flag and return resolution details. */
  public getNumberValue<T extends number = number>(options: FeatureFlagEvaluationOptions<T>): Promise<FeatureFlagEvaluationResult<T>> {
    return this.evaluateFlag('number', options);
  }

  /** Evaluate an object flag and return resolution details. */
  public getObjectValue<T extends JsonValue = JsonValue>(options: FeatureFlagEvaluationOptions<T>): Promise<FeatureFlagEvaluationResult<T>> {
    return this.evaluateFlag('object', options);
  }

  /**
   * Evaluate a batch of flags, returning per-key results while sharing provider/client context.
   */
  public async evaluateFlags(request: FeatureFlagBatchEvaluationRequest): Promise<FeatureFlagEvaluation> {
    const results: FeatureFlagEvaluation = {};

    for (const descriptor of request.flags) {
      const mergedOptions: FeatureFlagEvaluationOptions<any> = {
        flagKey: descriptor.key,
        defaultValue: descriptor.defaultValue,
        clientName: descriptor.options?.clientName ?? request.clientName,
        provider: descriptor.options?.provider ?? request.provider,
        componentContext: descriptor.options?.componentContext ?? request.componentContext,
        context: this.mergeContexts(request.context, descriptor.options?.context),
        clientContext: this.mergeContexts(request.clientContext, descriptor.options?.clientContext),
        hooks: descriptor.options?.hooks,
        hookHints: descriptor.options?.hookHints
      };

      let evaluation: FeatureFlagEvaluationResult<FlagValue>;
      switch (descriptor.type) {
        case 'boolean':
          evaluation = await this.getBooleanValue(mergedOptions as FeatureFlagEvaluationOptions<boolean>);
          break;
        case 'string':
          evaluation = await this.getStringValue(mergedOptions as FeatureFlagEvaluationOptions<string>);
          break;
        case 'number':
          evaluation = await this.getNumberValue(mergedOptions as FeatureFlagEvaluationOptions<number>);
          break;
        default:
          evaluation = await this.getObjectValue(mergedOptions as FeatureFlagEvaluationOptions<JsonValue>);
          break;
      }

      results[descriptor.key] = evaluation;
    }

    return results;
  }

  /**
   * Dispose all cached providers and clients. Intended for graceful process shutdown.
   */
  public async shutdown(): Promise<void> {
    const providers = Array.from(this.providerCache.values()).map(entry => entry.provider);
    this.providerCache.clear();
    this.clientCache.clear();
    this.providerPromises.clear();

    await Promise.allSettled(
      providers
        .filter(provider => typeof provider?.onClose === 'function')
        .map(async provider => {
          try {
            await provider.onClose!();
          } catch (error) {
            this.logger.warn(`Failed to close feature flag provider '${provider.metadata?.name ?? 'unknown'}': ${error instanceof Error ? error.message : String(error)}`);
          }
        })
    );
  }

  /**
   * Core evaluation logic shared by all type-specific helpers. Handles client resolution,
   * context merging, and error fallback to the supplied default.
   */
  private async evaluateFlag<T extends FlagValue>(
    type: 'boolean' | 'string' | 'number' | 'object',
    options: FeatureFlagEvaluationOptions<T>
  ): Promise<FeatureFlagEvaluationResult<T>> {
    const client = await this.getClient({
      clientName: options.clientName,
      provider: options.provider,
      componentContext: options.componentContext,
      context: options.clientContext
    });

    const evaluationContext = this.mergeContexts(
      options.componentContext?.featureFlags?.defaultEvaluationContext,
      this.extractComponentContext(options.componentContext),
      options.context
    );

    const evaluationOptions = this.buildFlagEvaluationOptions(options);

    try {
      switch (type) {
        case 'boolean':
          return await client.getBooleanDetails(
            options.flagKey,
            options.defaultValue as unknown as boolean,
            evaluationContext,
            evaluationOptions
          ) as FeatureFlagEvaluationResult<T>;
        case 'string':
          return await client.getStringDetails(
            options.flagKey,
            options.defaultValue as unknown as string,
            evaluationContext,
            evaluationOptions
          ) as FeatureFlagEvaluationResult<T>;
        case 'number':
          return await client.getNumberDetails(
            options.flagKey,
            options.defaultValue as unknown as number,
            evaluationContext,
            evaluationOptions
          ) as FeatureFlagEvaluationResult<T>;
        default:
          return await client.getObjectDetails(
            options.flagKey,
            options.defaultValue as unknown as JsonValue,
            evaluationContext,
            evaluationOptions
          ) as FeatureFlagEvaluationResult<T>;
      }
    } catch (error) {
      this.logger.error(`Feature flag evaluation failed for key '${options.flagKey}': ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      flagKey: options.flagKey,
      value: options.defaultValue,
      reason: StandardResolutionReasons.ERROR,
      errorCode: ErrorCode.GENERAL,
      errorMessage: `Failed to evaluate feature flag '${options.flagKey}'`,
      flagMetadata: {}
    } as FeatureFlagEvaluationResult<T>;
  }

  /** Convert optional hook metadata into the OpenFeature evaluation options shape. */
  private buildFlagEvaluationOptions(options: FeatureFlagEvaluationOptions<FlagValue>): FlagEvaluationOptions | undefined {
    const hooks = options.hooks ?? [];
    const hookHints = options.hookHints;

    if (hooks.length === 0 && !hookHints) {
      return undefined;
    }

    const evaluationOptions: FlagEvaluationOptions = {};
    if (hooks.length > 0) {
      evaluationOptions.hooks = hooks;
    }
    if (hookHints) {
      evaluationOptions.hookHints = hookHints;
    }
    return evaluationOptions;
  }

  /**
   * Instantiate a new OpenFeature client, registering providers as needed and layering
   * runtime + manifest context before returning the instance.
   */
  private async createClient(
    clientName: string | undefined,
    options: FeatureFlagClientOptions & { provider?: FeatureFlagProviderConfig }
  ): Promise<Client> {
    await this.ensureProvider(options.provider, clientName, options.componentContext);

    const client = typeof clientName === 'string'
      ? OpenFeature.getClient(clientName)
      : OpenFeature.getClient();

    const context = this.mergeContexts(
      this.globalContext,
      this.baseConfig.defaultContext,
      options.componentContext?.featureFlags?.defaultEvaluationContext,
      this.extractComponentContext(options.componentContext),
      options.context
    );

    if (context && Object.keys(context).length > 0) {
      client.setContext(context);
    }

    const hooks = [...this.globalHooks, ...(options.hooks ?? [])];
    if (hooks.length > 0) {
      client.addHooks(...hooks);
    }

    return client;
  }

  /**
   * Ensure a provider is registered for the resolved client name. Configuration signatures
   * are tracked so reconfiguration happens only when inputs change.
   */
  private async ensureProvider(
    providerConfig: FeatureFlagProviderConfig | undefined,
    clientName: string | undefined,
    componentContext?: ComponentContext
  ): Promise<void> {
    const cacheKey = this.buildClientCacheKey(clientName);
    const resolvedConfig = providerConfig ?? this.resolveProviderConfig(undefined, componentContext);
    const signature = this.serializeProviderConfig(resolvedConfig);
    const existing = this.providerCache.get(cacheKey);

    if (existing && existing.configSignature === signature) {
      return;
    }

    const pending = this.providerPromises.get(cacheKey);
    if (pending) {
      await pending;
      return;
    }

    const setupPromise = this.setupProvider(cacheKey, resolvedConfig, clientName);
    this.providerPromises.set(cacheKey, setupPromise);
    await setupPromise;
    this.providerPromises.delete(cacheKey);
  }

  /** Register a provider with the OpenFeature API and handle previous provider teardown. */
  private async setupProvider(
    cacheKey: string,
    config: FeatureFlagProviderConfig | undefined,
    clientName: string | undefined
  ): Promise<void> {
    const previous = this.providerCache.get(cacheKey);
    const provider = await this.buildProvider(config);

    if (previous && previous.provider !== provider && typeof previous.provider.onClose === 'function') {
      try {
        await previous.provider.onClose!();
      } catch (error) {
        this.logger.warn(`Failed to close previous feature flag provider '${previous.provider.metadata?.name ?? 'unknown'}': ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    try {
      if (clientName) {
        await OpenFeature.setProviderAndWait(clientName, provider);
      } else {
        await OpenFeature.setProviderAndWait(provider);
      }

      this.providerCache.set(cacheKey, {
        provider,
        configSignature: this.serializeProviderConfig(config)
      });
    } catch (error) {
      this.logger.error(`Failed to register feature flag provider${clientName ? ` for client '${clientName}'` : ''}: ${error instanceof Error ? error.message : String(error)}`);
      this.providerCache.set(cacheKey, {
        provider: NOOP_PROVIDER,
        configSignature: this.serializeProviderConfig(undefined)
      });
    }
  }

  /** Resolve a Provider instance from config, supporting direct instances and module loading. */
  private async buildProvider(config?: FeatureFlagProviderConfig): Promise<Provider> {
    if (!config) {
      return NOOP_PROVIDER;
    }

    if (config.providerInstance) {
      return config.providerInstance;
    }

    if (config.name === 'in-memory') {
      try {
        const module = await import('@openfeature/js-sdk');
        if (module.InMemoryProvider) {
          // eslint-disable-next-line new-cap
          return new module.InMemoryProvider(config.options?.flags);
        }
      } catch (error) {
        this.logger.warn(`Failed to initialize in-memory feature flag provider: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const moduleName = config.module ?? this.mapProviderToModule(config.name);
    if (!moduleName) {
      this.logger.warn(`No module mapping found for feature flag provider '${config.name}'. Falling back to NOOP provider.`);
      return NOOP_PROVIDER;
    }

    try {
      const imported = await import(moduleName);
      const provider = await this.instantiateProviderFromModule(imported, config);
      if (provider) {
        return provider;
      }
      this.logger.warn(`Module '${moduleName}' did not expose a usable provider for '${config.name}'. Falling back to NOOP provider.`);
    } catch (error) {
      this.logger.warn(`Unable to load feature flag provider module '${moduleName}': ${error instanceof Error ? error.message : String(error)}`);
    }

    return NOOP_PROVIDER;
  }

  /** Attempt to build a provider from a dynamically imported module. */
  private async instantiateProviderFromModule(module: any, config: FeatureFlagProviderConfig): Promise<Provider | undefined> {
    if (config.factory && typeof module[config.factory] === 'function') {
      const candidate = await module[config.factory](config.options ?? {});
      if (this.isProvider(candidate)) {
        return candidate;
      }
    }

    if (config.exportName && module[config.exportName]) {
      const candidate = await this.instantiateCandidate(module[config.exportName], config.options);
      if (candidate) {
        return candidate;
      }
    }

    if (module.default) {
      const candidate = await this.instantiateCandidate(module.default, config.options);
      if (candidate) {
        return candidate;
      }
    }

    for (const key of ['createProvider', 'provider', 'Provider']) {
      if (typeof module[key] === 'function') {
        const candidate = await module[key](config.options ?? {});
        if (this.isProvider(candidate)) {
          return candidate;
        }
      }
    }

    if (this.isProvider(module)) {
      return module;
    }

    return undefined;
  }

  /** Instantiate provider candidates when modules export factories or constructors. */
  private async instantiateCandidate(candidate: any, options?: Record<string, any>): Promise<Provider | undefined> {
    if (this.isProvider(candidate)) {
      return candidate;
    }

    if (typeof candidate === 'function') {
      try {
        if (candidate.prototype && typeof candidate.prototype.resolveBooleanEvaluation === 'function') {
          return new candidate(options ?? {});
        }
        const result = await candidate(options ?? {});
        if (this.isProvider(result)) {
          return result;
        }
      } catch (error) {
        this.logger.debug?.(`Failed to instantiate provider candidate: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return undefined;
  }

  private isProvider(candidate: any): candidate is Provider {
    return Boolean(
      candidate &&
      typeof candidate === 'object' &&
      candidate.metadata &&
      typeof candidate.metadata.name === 'string' &&
      typeof candidate.resolveBooleanEvaluation === 'function' &&
      typeof candidate.resolveStringEvaluation === 'function' &&
      typeof candidate.resolveNumberEvaluation === 'function' &&
      typeof candidate.resolveObjectEvaluation === 'function'
    );
  }

  /**
   * Resolve the effective provider layering explicit overrides, component context, and defaults.
   */
  private resolveProviderConfig(
    override: FeatureFlagProviderConfig | undefined,
    componentContext?: ComponentContext
  ): FeatureFlagProviderConfig | undefined {
    if (override) {
      return { ...override, options: override.options ? { ...override.options } : undefined };
    }

    if (componentContext?.featureFlags?.provider) {
      const provider = componentContext.featureFlags.provider;
      return { ...provider, options: provider.options ? { ...provider.options } : undefined };
    }

    if (this.baseConfig.provider) {
      const provider = this.baseConfig.provider;
      return { ...provider, options: provider.options ? { ...provider.options } : undefined };
    }

    return undefined;
  }

  private resolveClientName(
    explicit: string | undefined,
    provider: FeatureFlagProviderConfig | undefined,
    componentContext?: ComponentContext
  ): string | undefined {
    return explicit
      ?? provider?.clientName
      ?? componentContext?.featureFlags?.clientName
      ?? this.baseConfig.clientName
      ?? undefined;
  }

  private buildClientCacheKey(clientName?: string): string {
    return clientName ?? DEFAULT_CLIENT_KEY;
  }

  /**
   * Project a component context into the evaluation context surface so downstream provider
   * rules can make decisions using consistent attribute names.
   */
  private extractComponentContext(componentContext?: ComponentContext): FeatureFlagEvaluationContext | undefined {
    if (!componentContext) {
      return undefined;
    }

    const context: FeatureFlagEvaluationContext = {
      serviceName: componentContext.serviceName,
      environment: componentContext.environment,
      complianceFramework: componentContext.complianceFramework
    };

    if (componentContext.featureFlags?.targetingKey) {
      context.targetingKey = componentContext.featureFlags.targetingKey;
    }
    if (componentContext.region) {
      context.region = componentContext.region;
    }
    if (componentContext.accountId) {
      context.accountId = componentContext.accountId;
    }
    if (componentContext.owner) {
      context.owner = componentContext.owner;
    }
    if (componentContext.serviceLabels && Object.keys(componentContext.serviceLabels).length > 0) {
      context.serviceLabels = { ...componentContext.serviceLabels } as Record<string, any>;
    }
    if (componentContext.tags && Object.keys(componentContext.tags).length > 0) {
      context.tags = { ...componentContext.tags } as Record<string, any>;
    }

    return context;
  }

  /** Stable merge helper for evaluation context objects. Later entries override earlier ones. */
  private mergeContexts(
    ...contexts: Array<FeatureFlagEvaluationContext | undefined>
  ): FeatureFlagEvaluationContext | undefined {
    const merged: FeatureFlagEvaluationContext = {};

    for (const context of contexts) {
      if (!context) {
        continue;
      }

      for (const [key, value] of Object.entries(context)) {
        if (value === undefined) {
          continue;
        }
        merged[key] = value as any;
      }
    }

    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  private mapProviderToModule(name: string): string | undefined {
    const mapping: Record<string, string> = {
      'aws-appconfig': '@openfeature/aws-appconfig-provider',
      'launchdarkly': '@openfeature/launchdarkly-server-sdk-provider',
      'flagsmith': '@openfeature/flagsmith-server-sdk-provider',
      'flagd': '@openfeature/flagd-server-provider',
      'splitio': '@openfeature/splitio-provider'
    };
    return mapping[name];
  }

  /** Serialize provider config (excluding instances/functions) to detect changes. */
  private serializeProviderConfig(config?: FeatureFlagProviderConfig | undefined): string {
    if (!config) {
      return 'noop';
    }

    const { providerInstance, ...rest } = config;
    const sanitized = {
      ...rest,
      options: this.sanitizeSerializable(rest.options)
    };

    return JSON.stringify(sanitized, Object.keys(sanitized).sort());
  }

  private sanitizeSerializable(value: any): any {
    if (value === undefined || typeof value === 'function') {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeSerializable(item));
    }
    if (typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const [key, entry] of Object.entries(value)) {
        if (typeof entry === 'function') {
          continue;
        }
        result[key] = this.sanitizeSerializable(entry);
      }
      return result;
    }
    return value;
  }

  private cloneConfig(config: FeatureFlagServiceConfig): FeatureFlagServiceConfig {
    return {
      ...config,
      provider: config.provider ? { ...config.provider, options: config.provider.options ? { ...config.provider.options } : undefined } : undefined,
      hooks: config.hooks ? [...config.hooks] : undefined,
      defaultContext: config.defaultContext ? { ...config.defaultContext } : undefined
    };
  }
}

export const defaultFeatureFlagService = new FeatureFlagService();
