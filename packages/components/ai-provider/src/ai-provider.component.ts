/**
 * AI Provider Component
 *
 * Registers AI provider connection details as a capability so services can bind
 * to OpenAI, Anthropic, Bedrock, Gemini, or a local Ollama runtime.
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec,
  AIProviderCapability
} from '@shinobi/core';
import {
  AIProviderComponentConfig,
  AIProviderComponentConfigBuilder
} from './ai-provider.builder.js';

export class AIProviderComponent extends BaseComponent {
  private config?: AIProviderComponentConfig;
  private configOutput?: cdk.CfnOutput;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting AI provider synthesis');

    try {
      this.config = new AIProviderComponentConfigBuilder(this.context, this.spec).buildSync();

      this.configOutput = new cdk.CfnOutput(this, 'ProviderConfig', {
        description: 'AI provider configuration metadata',
        value: JSON.stringify({
          provider: this.config.provider,
          model: this.config.model,
          endpoint: this.config.endpoint,
          region: this.config.region,
          auth: {
            type: this.config.auth?.type
          }
        })
      });

      this.registerConstruct('main', this.configOutput);
      this.registerConstruct('providerConfig', this.configOutput);
      this.registerCapability('ai:provider', this.buildProviderCapability());

      this.logComponentEvent('synthesis_complete', 'AI provider synthesis completed');
    } catch (error) {
      this.logError(error as Error, 'ai-provider synthesis');
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'ai-provider';
  }

  private buildProviderCapability(): AIProviderCapability {
    const authType = this.config?.auth?.type ?? 'none';
    const secretRef = this.config?.auth?.secretRef;

    return {
      providerType: this.config!.provider,
      model: this.config!.model,
      endpoint: this.config!.endpoint,
      region: this.config!.region,
      auth: {
        type: authType,
        secretRef
      },
      connectionConfig: {
        provider: this.config!.provider,
        model: this.config!.model,
        endpoint: this.config!.endpoint ?? '',
        region: this.config!.region ?? ''
      },
      environmentVariables: {
        AI_PROVIDER: this.config!.provider,
        AI_MODEL: this.config!.model,
        AI_ENDPOINT: this.config!.endpoint ?? '',
        AI_REGION: this.config!.region ?? '',
        AI_AUTH_TYPE: authType,
        ...(secretRef ? { AI_AUTH_SECRET_REF: secretRef } : {})
      }
    };
  }
}
