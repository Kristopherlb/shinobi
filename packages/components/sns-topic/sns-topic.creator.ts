import { Construct } from 'constructs';
import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator
} from '@shinobi/core';
import { SnsTopicComponent } from './sns-topic.component';
import {
  SNS_TOPIC_CONFIG_SCHEMA,
  SnsTopicComponentConfigBuilder,
  SnsTopicConfig
} from './sns-topic.builder';

export class SnsTopicComponentCreator implements IComponentCreator {
  public readonly componentType = 'sns-topic';
  public readonly displayName = 'SNS Topic';
  public readonly description = 'Amazon SNS topic with configuration-driven encryption, policies, and alarms.';
  public readonly category = 'messaging';
  public readonly awsService = 'SNS';
  public readonly tags = ['sns', 'pubsub', 'messaging'];
  public readonly configSchema = SNS_TOPIC_CONFIG_SCHEMA;

  public createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): SnsTopicComponent {
    return new SnsTopicComponent(scope, spec.name, context, spec);
  }

  public validateSpec(spec: ComponentSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<SnsTopicConfig> | undefined;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, or underscores.');
    }

    if (config?.fifo?.enabled && config.topicName && !config.topicName.endsWith('.fifo')) {
      errors.push('FIFO topics must end in `.fifo`.');
    }

    if (config?.encryption?.enabled) {
      const keyConfig = config.encryption.customerManagedKey;
      if (!config.encryption.kmsKeyArn && !keyConfig?.create) {
        errors.push('When encryption.enabled is true you must supply `encryption.kmsKeyArn` or set `encryption.customerManagedKey.create` to true.');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['topic:sns'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return [
      'main',
      'topic',
      'kmsKey',
      'alarm:failedNotifications',
      'alarm:messageRate'
    ];
  }
}
