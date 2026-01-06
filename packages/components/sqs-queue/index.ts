/**
 * @platform/sqs-queue - SqsQueue Component
 * SQS message queue with compliance hardening and DLQ support
 * 
 * @author Platform Team
 * @category messaging
 * @service SQS
 */

// Component exports
export { SqsQueueComponent } from './sqs-queue.component.js';

// Configuration exports
export { 
  SqsQueueConfig,
  SqsQueueConfigBuilder,
  SQS_QUEUE_CONFIG_SCHEMA
} from './sqs-queue.builder.js';

// Creator exports
export { SqsQueueCreator } from './sqs-queue.creator.js';