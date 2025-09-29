import { Construct } from 'constructs';
import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator
} from '@shinobi/core';
import { EventBridgeRulePatternComponent } from './eventbridge-rule-pattern.component';
import {
  EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA,
  EventBridgeRulePatternConfig,
  EventBridgeRulePatternComponentConfigBuilder
} from './eventbridge-rule-pattern.builder';

export class EventBridgeRulePatternComponentCreator implements IComponentCreator {
  public readonly componentType = 'eventbridge-rule-pattern';
  public readonly displayName = 'EventBridge Rule Pattern';
  public readonly description = 'EventBridge rule filtered by pattern with optional DLQ, logging, and alarms.';
  public readonly category = 'events';
  public readonly awsService = 'EVENTBRIDGE';
  public readonly tags = ['eventbridge', 'rule', 'pattern'];
  public readonly configSchema = EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA;

  public createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): EventBridgeRulePatternComponent {
    return new EventBridgeRulePatternComponent(scope, spec.name, context, spec);
  }

  public validateSpec(spec: ComponentSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<EventBridgeRulePatternConfig> | undefined;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, dots, underscores, or hyphens.');
    }

    if (!config?.eventPattern) {
      errors.push('`eventPattern` is required for eventbridge-rule-pattern components.');
    }

    if (config?.input?.type === 'transformer' && !config.input.transformer?.inputTemplate) {
      errors.push('input.transformer.inputTemplate is required when input.type is `transformer`.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['eventbridge:rule-pattern'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return [
      'main',
      'rule',
      'deadLetterQueue',
      'logGroup',
      'alarm:failedInvocations',
      'alarm:invocations',
      'alarm:matchedEvents',
      'alarm:deadLetterQueueMessages'
    ];
  }
}
