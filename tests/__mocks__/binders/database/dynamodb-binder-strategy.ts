export class DynamoDbBinderStrategy {
  supportedCapabilities = [
    'dynamodb:table',
    'dynamodb:index',
    'dynamodb:stream'
  ];
}
