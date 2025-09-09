/**
 * @platform/sqs-queue-new - SqsQueueNew Component
 * SQS message queue with compliance hardening and DLQ support
 * 
 * @author Platform Team
 * @category messaging
 * @service SQS
 */

// Component exports
export { SqsQueueNewComponent } from './sqs-queue-new.component';

// Configuration exports
export { 
  SqsQueueNewConfig,
  SqsQueueNewConfigBuilder,
  SQS_QUEUE_NEW_CONFIG_SCHEMA
} from './sqs-queue-new.builder';

// Creator exports
export { SqsQueueNewCreator } from './sqs-queue-new.creator';