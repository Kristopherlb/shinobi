/**
 * Creator for the AI provider component.
 */

import { Construct } from 'constructs';
import {
  ComponentContext,
  ComponentSpec,
  IComponent,
  IComponentCreator
} from '@shinobi/core';
import {
  AIProviderComponentConfigBuilder
} from './ai-provider.builder.js';
import { AIProviderComponent } from './ai-provider.component.js';

export class AIProviderComponentCreator implements IComponentCreator {
  public readonly componentType = 'ai-provider';
  public readonly description = 'Registers AI provider connection details (OpenAI, Anthropic, Bedrock, Gemini, Ollama).';

  public createComponent(
    spec: ComponentSpec,
    context: ComponentContext
  ): IComponent {
    if (!context.scope) {
      throw new Error('ComponentContext.scope is required to create ai-provider components');
    }

    new AIProviderComponentConfigBuilder(context, spec).buildSync();

    return new AIProviderComponent(context.scope as Construct, spec.name, context, spec);
  }

  public processComponent(
    spec: ComponentSpec,
    context: ComponentContext
  ): IComponent {
    return this.createComponent(spec, context);
  }

  public getSupportedCapabilities(): string[] {
    return ['ai:provider'];
  }

  public getRequiredConfigKeys(): string[] {
    return ['provider'];
  }
}
