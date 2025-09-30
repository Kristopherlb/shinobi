import { Construct } from 'constructs';
import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator
} from '@shinobi/core';
import { EventBridgeRuleCronComponent } from './eventbridge-rule-cron.component';
import {
  EVENTBRIDGE_RULE_CRON_CONFIG_SCHEMA,
  EventBridgeRuleCronConfig
} from './eventbridge-rule-cron.builder';

export class EventBridgeRuleCronComponentCreator implements IComponentCreator {
  public readonly componentType = 'eventbridge-rule-cron';
  public readonly displayName = 'EventBridge Cron Rule';
  public readonly description = 'Schedules EventBridge rules with configuration-driven logging, DLQ, and alarms.';
  public readonly category = 'events';
  public readonly awsService = 'EVENTS';
  public readonly tags = ['eventbridge', 'cron', 'scheduler'];
  public readonly configSchema = EVENTBRIDGE_RULE_CRON_CONFIG_SCHEMA;

  public createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): EventBridgeRuleCronComponent {
    return new EventBridgeRuleCronComponent(scope, spec.name, context, spec);
  }

  public validateSpec(spec: ComponentSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<EventBridgeRuleCronConfig> | undefined;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, or underscores.');
    }

    if (!config?.schedule) {
      errors.push('`schedule` is required for eventbridge-rule-cron components.');
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
    return ['eventbridge:rule-cron'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return [
      'main',
      'rule',
      'logGroup',
      'alarm:failedInvocations',
      'alarm:invocationRate'
    ];
  }
}
