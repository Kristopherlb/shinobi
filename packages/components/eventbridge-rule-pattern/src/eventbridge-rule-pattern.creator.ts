import { Construct } from 'constructs';
import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator,
  IComponent
} from '@shinobi/core';
import schemaJson from '../Config.schema.json' with { type: 'json' };
import { EventBridgeRulePatternComponent } from './eventbridge-rule-pattern.component.js';
import {
  EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA,
  EventBridgeRulePatternConfig
} from './eventbridge-rule-pattern.builder.js';

export class EventBridgeRulePatternComponentCreator implements IComponentCreator {
  public readonly componentType = 'eventbridge-rule-pattern';
  public readonly displayName = 'EventBridge Rule Pattern';
  public readonly description = 'EventBridge rule filtered by pattern with mandatory DLQ, logging, and monitoring per platform standards.';
  public readonly category = 'events';
  public readonly awsService = 'EVENTBRIDGE';
  public readonly tags = ['eventbridge', 'rule', 'pattern', 'event-driven'];

  public readonly configSchema = schemaJson;
  public readonly configSchemaInternal = EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA;

  public createComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    const scope = context.scope as Construct | undefined;
    if (!scope) {
      throw new Error('ComponentContext.scope is required to create eventbridge-rule-pattern components');
    }
    return new EventBridgeRulePatternComponent(scope, spec.name, context, spec);
  }

  public processComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    return this.createComponent(spec, context);
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

    if (!config?.deadLetterQueue) {
      errors.push('`deadLetterQueue` is required. Set { enabled: true } at minimum for resilient event-driven design.');
    } else if (config.deadLetterQueue.enabled === false) {
      errors.push('Dead letter queue cannot be disabled. Remove deadLetterQueue.enabled or set to true.');
    }

    if (!config?.monitoring) {
      errors.push('`monitoring` is required. Set { enabled: true, cloudWatchLogs: { enabled: true } } at minimum per platform observability standard.');
    } else {
      if (config.monitoring.enabled === false) {
        errors.push('Monitoring cannot be disabled per platform observability standard. Remove monitoring.enabled or set to true.');
      }
      if (!config.monitoring.cloudWatchLogs) {
        errors.push('monitoring.cloudWatchLogs is required. Set { enabled: true } at minimum.');
      } else if (config.monitoring.cloudWatchLogs.enabled === false) {
        errors.push('CloudWatch Logs cannot be disabled per platform logging standard. Remove cloudWatchLogs.enabled or set to true.');
      }
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
      'kms:logs',
      'kms:dlq',
      'alarm:failedInvocations',
      'alarm:invocations',
      'alarm:matchedEvents',
      'alarm:deadLetterQueueMessages'
    ];
  }
}
