// Note: SqsQueueComponent is deprecated, use SqsQueueNewComponent from the root index.ts
// This builder is kept for backward compatibility but may be removed in future versions

export class SqsQueueBuilder {
  build(component: any) {
    // Placeholder: build AWS resources for the component
    return {
      queueName: `sqs-${component.name}`,
      visibilityTimeout: component.getVisibilityTimeout(),
      messageRetentionPeriod: component.getMessageRetentionPeriod(),
      receiveMessageWaitTime: component.getReceiveMessageWaitTime(),
      maxReceiveCount: component.getMaxReceiveCount(),
      deadLetterQueue: component.hasDeadLetterQueue()
    };
  }

  generateCloudFormation(component: any): any {
    // Placeholder: generate CloudFormation template
    return {
      Type: 'AWS::SQS::Queue',
      Properties: {
        QueueName: `sqs-${component.name}`,
        VisibilityTimeoutSeconds: component.getVisibilityTimeout(),
        MessageRetentionPeriod: component.getMessageRetentionPeriod(),
        ReceiveMessageWaitTimeSeconds: component.getReceiveMessageWaitTime()
      }
    };
  }
}
