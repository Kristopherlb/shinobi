import { ComponentSpec, ComponentConfig } from '@platform/contracts';

export class SqsQueueComponent implements ComponentSpec {
  name = 'sqs-queue';
  config: ComponentConfig;

  constructor(config: ComponentConfig = {}) {
    this.config = {
      visibilityTimeoutSeconds: 30,
      messageRetentionPeriod: 1209600, // 14 days
      receiveMessageWaitTimeSeconds: 0,
      maxReceiveCount: 3,
      deadLetterQueue: true,
      ...config
    };
  }

  getVisibilityTimeout(): number {
    return this.config.visibilityTimeoutSeconds as number;
  }

  getMessageRetentionPeriod(): number {
    return this.config.messageRetentionPeriod as number;
  }

  getReceiveMessageWaitTime(): number {
    return this.config.receiveMessageWaitTimeSeconds as number;
  }

  getMaxReceiveCount(): number {
    return this.config.maxReceiveCount as number;
  }

  hasDeadLetterQueue(): boolean {
    return this.config.deadLetterQueue as boolean;
  }
}
