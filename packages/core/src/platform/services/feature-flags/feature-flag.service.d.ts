import { Client, EvaluationContext, EvaluationDetails, FlagValue, Hook, HookHints, JsonValue, Logger, Provider } from '@openfeature/js-sdk';
import { ComponentContext, FeatureFlagProviderReference } from '../../contracts/component-interfaces.js';
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
export interface FeatureFlagEvaluationResult<T extends FlagValue> extends EvaluationDetails<T> {
}
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
export declare class FeatureFlagService implements IFeatureFlagService {
    private logger;
    private baseConfig;
    private readonly clientCache;
    private readonly providerCache;
    private readonly providerPromises;
    private globalContext?;
    private globalHooks;
    /**
     * Create a new feature flag service instance. Consumers may preconfigure
     * logging, default evaluation context, and a provider ahead of time.
     */
    constructor(config?: FeatureFlagServiceConfig);
    /**
     * Merge runtime configuration and (re)register providers when overrides occur.
     * Useful for long-lived processes that need to respond to dynamic settings.
     */
    configure(config?: FeatureFlagServiceConfig): Promise<void>;
    /**
     * Resolve or create an OpenFeature client keyed by provider/client name. Results are cached
     * so repeated evaluations reuse initialized SDK clients.
     */
    getClient(options?: FeatureFlagClientOptions): Promise<Client>;
    /** Evaluate a boolean flag and return resolution details. */
    getBooleanValue(options: FeatureFlagEvaluationOptions<boolean>): Promise<FeatureFlagEvaluationResult<boolean>>;
    /** Evaluate a string flag and return resolution details. */
    getStringValue<T extends string = string>(options: FeatureFlagEvaluationOptions<T>): Promise<FeatureFlagEvaluationResult<T>>;
    /** Evaluate a numeric flag and return resolution details. */
    getNumberValue<T extends number = number>(options: FeatureFlagEvaluationOptions<T>): Promise<FeatureFlagEvaluationResult<T>>;
    /** Evaluate an object flag and return resolution details. */
    getObjectValue<T extends JsonValue = JsonValue>(options: FeatureFlagEvaluationOptions<T>): Promise<FeatureFlagEvaluationResult<T>>;
    /**
     * Evaluate a batch of flags, returning per-key results while sharing provider/client context.
     */
    evaluateFlags(request: FeatureFlagBatchEvaluationRequest): Promise<FeatureFlagEvaluation>;
    /**
     * Dispose all cached providers and clients. Intended for graceful process shutdown.
     */
    shutdown(): Promise<void>;
    /**
     * Core evaluation logic shared by all type-specific helpers. Handles client resolution,
     * context merging, and error fallback to the supplied default.
     */
    private evaluateFlag;
    /** Convert optional hook metadata into the OpenFeature evaluation options shape. */
    private buildFlagEvaluationOptions;
    /**
     * Instantiate a new OpenFeature client, registering providers as needed and layering
     * runtime + manifest context before returning the instance.
     */
    private createClient;
    /**
     * Ensure a provider is registered for the resolved client name. Configuration signatures
     * are tracked so reconfiguration happens only when inputs change.
     */
    private ensureProvider;
    /** Register a provider with the OpenFeature API and handle previous provider teardown. */
    private setupProvider;
    /** Resolve a Provider instance from config, supporting direct instances and module loading. */
    private buildProvider;
    /** Attempt to build a provider from a dynamically imported module. */
    private instantiateProviderFromModule;
    /** Instantiate provider candidates when modules export factories or constructors. */
    private instantiateCandidate;
    private isProvider;
    /**
     * Resolve the effective provider layering explicit overrides, component context, and defaults.
     */
    private resolveProviderConfig;
    private resolveClientName;
    private buildClientCacheKey;
    /**
     * Project a component context into the evaluation context surface so downstream provider
     * rules can make decisions using consistent attribute names.
     */
    private extractComponentContext;
    /** Stable merge helper for evaluation context objects. Later entries override earlier ones. */
    private mergeContexts;
    private mapProviderToModule;
    /** Serialize provider config (excluding instances/functions) to detect changes. */
    private serializeProviderConfig;
    private sanitizeSerializable;
    private cloneConfig;
}
export declare const defaultFeatureFlagService: FeatureFlagService;
//# sourceMappingURL=feature-flag.service.d.ts.map