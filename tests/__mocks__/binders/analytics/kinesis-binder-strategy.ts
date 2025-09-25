export class KinesisBinderStrategy {
  supportedCapabilities = [
    'kinesis:stream',
    'kinesis:analytics',
    'kinesis:firehose'
  ];
}
