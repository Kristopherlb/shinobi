import { SqsQueueComponent, SqsQueueBuilder } from '../src/sqs-queue.ts';

test('SqsQueueComponent has correct name', () => {
  const comp = new SqsQueueComponent();
  expect(comp.name).toBe('sqs-queue');
});

test('SqsQueueComponent uses default configuration', () => {
  const comp = new SqsQueueComponent();
  expect(comp.getVisibilityTimeout()).toBe(30);
  expect(comp.getMessageRetentionPeriod()).toBe(1209600);
  expect(comp.getReceiveMessageWaitTime()).toBe(0);
  expect(comp.getMaxReceiveCount()).toBe(3);
  expect(comp.hasDeadLetterQueue()).toBe(true);
});

test('SqsQueueComponent accepts custom configuration', () => {
  const config = {
    visibilityTimeoutSeconds: 60,
    messageRetentionPeriod: 604800, // 7 days
    receiveMessageWaitTimeSeconds: 20,
    maxReceiveCount: 5,
    deadLetterQueue: false
  };
  const comp = new SqsQueueComponent(config);
  expect(comp.getVisibilityTimeout()).toBe(60);
  expect(comp.getMessageRetentionPeriod()).toBe(604800);
  expect(comp.getReceiveMessageWaitTime()).toBe(20);
  expect(comp.getMaxReceiveCount()).toBe(5);
  expect(comp.hasDeadLetterQueue()).toBe(false);
});

test('SqsQueueBuilder can build component', () => {
  const comp = new SqsQueueComponent();
  const builder = new SqsQueueBuilder();
  const result = builder.build(comp);
  expect(result.queueName).toBe('sqs-sqs-queue');
  expect(result.visibilityTimeout).toBe(30);
});

test('SqsQueueBuilder can generate CloudFormation', () => {
  const comp = new SqsQueueComponent();
  const builder = new SqsQueueBuilder();
  const cf = builder.generateCloudFormation(comp);
  expect(cf.Type).toBe('AWS::SQS::Queue');
  expect(cf.Properties.QueueName).toBe('sqs-sqs-queue');
});
