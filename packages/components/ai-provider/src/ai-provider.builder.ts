import {
  ComponentConfigSchema,
  ComponentContext,
  ComponentSpec,
  ConfigBuilder,
  ConfigBuilderContext
} from '@shinobi/core';

export type AIProviderKind = 'openai' | 'gemini' | 'anthropic' | 'bedrock' | 'ollama';

export interface AIProviderAuthConfig {
  type: 'apiKey' | 'aws' | 'none';
  secretRef?: string;
}

export interface AIProviderComponentConfig {
  provider: AIProviderKind;
  model: string;
  endpoint?: string;
  region?: string;
  auth?: AIProviderAuthConfig;
  tags: Record<string, string>;
  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
}

const AUTH_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['apiKey', 'aws', 'none'] },
    secretRef: { type: 'string' }
  },
  required: ['type']
};

export const AI_PROVIDER_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    provider: {
      type: 'string',
      enum: ['openai', 'gemini', 'anthropic', 'bedrock', 'ollama']
    },
    model: { type: 'string' },
    endpoint: { type: 'string' },
    region: { type: 'string' },
    auth: AUTH_SCHEMA,
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  },
  required: ['provider']
};

const DEFAULT_ENDPOINTS: Record<Exclude<AIProviderKind, 'bedrock'>, string> = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  anthropic: 'https://api.anthropic.com/v1',
  ollama: 'http://localhost:11434'
};

const DEFAULT_MODELS: Record<AIProviderKind, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
  anthropic: 'claude-3-haiku-20240307',
  bedrock: 'anthropic.claude-3-haiku-20240307-v1:0',
  ollama: 'llama3.2'
};

const DEFAULT_REGION = 'us-east-1';

const DEFAULT_CONFIG: AIProviderComponentConfig = {
  provider: 'openai',
  model: DEFAULT_MODELS.openai,
  endpoint: DEFAULT_ENDPOINTS.openai,
  auth: {
    type: 'apiKey'
  },
  tags: {}
};

export class AIProviderComponentConfigBuilder extends ConfigBuilder<AIProviderComponentConfig> {
  private readonly contextRegion: string;

  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, AI_PROVIDER_CONFIG_SCHEMA);
    this.contextRegion = builderContext.context.region ?? DEFAULT_REGION;
  }

  protected getHardcodedFallbacks(): Partial<AIProviderComponentConfig> {
    return DEFAULT_CONFIG;
  }

  /**
   * Layer 2: Compliance Framework Defaults
   * 
   * Provides sensible defaults based on risk assessment flags rather than framework checks.
   * High-risk environment defaults can be set via:
   * - Platform config files (`/config/{framework}.yml`) setting `highRiskEnvironment: true`
   * - Service-level configuration in `service.yml`
   * - Environment defaults
   * 
   * This ensures configuration is data-driven and risk-based, not framework-dependent.
   */
  protected getComplianceFrameworkDefaults(): Partial<AIProviderComponentConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<AIProviderComponentConfig> | undefined;
    let isHighRisk = componentConfig?.highRiskEnvironment ?? false;
    
    // Also check platform config if available (loaded by base class)
    try {
      const platformConfig = (this as any)._loadPlatformConfiguration();
      if (platformConfig?.highRiskEnvironment) {
        isHighRisk = true;
      }
    } catch {
      // Platform config might not be available in tests, ignore
    }
    
    if (isHighRisk) {
      // Apply enhanced security defaults for high-risk environments
      // These defaults align with FedRAMP Moderate/High requirements when highRiskEnvironment is set
      return {
        // For high-risk environments, prefer AWS Bedrock for better security controls
        // or ensure proper secret management is configured
        auth: {
          type: 'aws', // Use AWS IAM authentication when possible for high-risk
          secretRef: componentConfig?.auth?.secretRef // Preserve secretRef if provided
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  public buildSync(): AIProviderComponentConfig {
    const resolved = super.buildSync() as Partial<AIProviderComponentConfig>;
    return this.normalise(resolved);
  }

  public getSchema(): ComponentConfigSchema {
    return AI_PROVIDER_CONFIG_SCHEMA;
  }

  private normalise(config: Partial<AIProviderComponentConfig>): AIProviderComponentConfig {
    const provider = (config.provider ?? DEFAULT_CONFIG.provider) as AIProviderKind;
    
    // Check if model was explicitly provided, otherwise use provider-specific default
    const modelWasExplicit = Object.prototype.hasOwnProperty.call(
      this.builderContext.spec.config ?? {},
      'model'
    );
    const model = modelWasExplicit && config.model
      ? config.model
      : DEFAULT_MODELS[provider];
    
    const endpoint = this.resolveEndpoint(config.endpoint, provider);
    const auth = this.normaliseAuth(config.auth, provider);
    const region = this.normaliseRegion(config.region, provider);

    return {
      provider,
      model,
      endpoint,
      auth,
      region,
      tags: {
        ...DEFAULT_CONFIG.tags,
        ...(config.tags ?? {})
      }
    };
  }

  private resolveEndpoint(endpoint: string | undefined, provider: AIProviderKind): string {
    const explicitEndpoint = Object.prototype.hasOwnProperty.call(
      this.builderContext.spec.config ?? {},
      'endpoint'
    );

    if (explicitEndpoint && endpoint) {
      return endpoint;
    }

    if (endpoint && provider !== 'openai' && endpoint === DEFAULT_ENDPOINTS.openai) {
      return this.defaultEndpointFor(provider);
    }

    return endpoint ?? this.defaultEndpointFor(provider);
  }

  private defaultEndpointFor(provider: AIProviderKind): string {
    if (provider === 'bedrock') {
      return `https://bedrock-runtime.${this.contextRegion}.amazonaws.com`;
    }
    return DEFAULT_ENDPOINTS[provider];
  }

  private normaliseAuth(
    auth: Partial<AIProviderAuthConfig> | undefined,
    provider: AIProviderKind
  ): AIProviderAuthConfig {
    const defaultType =
      provider === 'bedrock' ? 'aws' : provider === 'ollama' ? 'none' : 'apiKey';

    // Check if auth.type was explicitly provided, otherwise use provider-specific default
    const authWasExplicit = Object.prototype.hasOwnProperty.call(
      this.builderContext.spec.config ?? {},
      'auth'
    );

    return {
      type: authWasExplicit && auth?.type ? auth.type : defaultType,
      secretRef: auth?.secretRef
    };
  }

  private normaliseRegion(
    region: string | undefined,
    provider: AIProviderKind
  ): string | undefined {
    if (provider !== 'bedrock') {
      return undefined;
    }

    return region ?? this.contextRegion;
  }
}

export const AI_PROVIDER_DEFAULTS = {
  endpoints: DEFAULT_ENDPOINTS
};
