/**
 * @platform/dynamodb-table - DynamoDbTableComponent Component
 * DynamoDB Table Component implementing Component API Contract v1.0
 */

// Component exports
export { DynamoDbTableComponent } from './dynamodb-table.component.ts';

// Configuration exports
export {
  DynamoDbTableConfig,
  DynamoDbTableComponentConfigBuilder,
  DYNAMODB_TABLE_CONFIG_SCHEMA
} from './dynamodb-table.builder.ts';

// Creator exports
export { DynamoDbTableComponentCreator } from './dynamodb-table.creator.ts';