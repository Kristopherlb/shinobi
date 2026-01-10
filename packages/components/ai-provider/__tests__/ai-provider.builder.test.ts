/**
 * AI Provider ConfigBuilder Test Suite
 */

import {
  AIProviderComponentConfigBuilder,
  AIProviderComponentConfig
} from '../src/ai-provider.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createContext = (
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework,
  region: 'us-east-1',
  account: '123456789012',
  accountId: '123456789012',
  scope: undefined as any,
  tags: {
    'service-name': 'test-service',
    owner: 'test-team',
    environment,
    'compliance-framework': complianceFramework
  }
});

const createSpec = (config: Partial<AIProviderComponentConfig> = {}): ComponentSpec => ({
  name: 'ai-provider',
  type: 'ai-provider',
  config
});

describe('AIProviderComponentConfigBuilder', () => {
  it('ConfigBuilder__DefaultProvider__UsesOpenAiDefaults', () => {
    const context = createContext();
    const spec = createSpec();

    const config = new AIProviderComponentConfigBuilder(context, spec).buildSync();

    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-4o-mini');
    expect(config.endpoint).toBe('https://api.openai.com/v1');
    expect(config.auth?.type).toBe('apiKey');
  });

  it('ConfigBuilder__OllamaProvider__DefaultsToLocalEndpoint', () => {
    const context = createContext();
    const spec = createSpec({
      provider: 'ollama'
    });

    const config = new AIProviderComponentConfigBuilder(context, spec).buildSync();

    expect(config.provider).toBe('ollama');
    expect(config.endpoint).toBe('http://localhost:11434');
    expect(config.model).toBe('llama3.2');
    expect(config.auth?.type).toBe('none');
  });

  it('ConfigBuilder__BedrockProvider__DefaultsRegionFromContext', () => {
    const context = createContext();
    const spec = createSpec({
      provider: 'bedrock'
    });

    const config = new AIProviderComponentConfigBuilder(context, spec).buildSync();

    expect(config.provider).toBe('bedrock');
    expect(config.region).toBe('us-east-1');
    expect(config.endpoint).toBe('https://bedrock-runtime.us-east-1.amazonaws.com');
    expect(config.auth?.type).toBe('aws');
  });
});
