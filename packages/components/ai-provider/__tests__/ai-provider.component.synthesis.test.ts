/**
 * AI Provider component synthesis tests.
 */

import { App, Stack } from 'aws-cdk-lib';
import { AIProviderComponent } from '../src/ai-provider.component.js';
import { AIProviderComponentConfig } from '../src/ai-provider.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createContext = (
  stack: Stack,
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
  scope: stack,
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

describe('AIProviderComponent synthesis', () => {
  it('AIProviderComponent__BedrockConfig__RegistersCapability', () => {
    const app = new App();
    const stack = new Stack(app, 'BedrockStack');
    const context = createContext(stack);
    const spec = createSpec({
      provider: 'bedrock',
      model: 'anthropic.claude-3-5-sonnet-20240620-v1:0'
    });

    const component = new AIProviderComponent(stack, spec.name, context, spec);
    component.synth();

    const capability = component.getCapabilities()['ai:provider'];
    expect(capability).toMatchObject({
      providerType: 'bedrock',
      model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      endpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com',
      region: 'us-east-1',
      auth: {
        type: 'aws'
      }
    });
  });

  it('AIProviderComponent__OllamaConfig__RegistersLocalCapability', () => {
    const app = new App();
    const stack = new Stack(app, 'OllamaStack');
    const context = createContext(stack);
    const spec = createSpec({
      provider: 'ollama',
      model: 'llama3.2'
    });

    const component = new AIProviderComponent(stack, spec.name, context, spec);
    component.synth();

    const capability = component.getCapabilities()['ai:provider'];
    expect(capability).toMatchObject({
      providerType: 'ollama',
      model: 'llama3.2',
      endpoint: 'http://localhost:11434',
      auth: {
        type: 'none'
      }
    });
  });
});
