"use strict";
/**
 * @platform/dynamodb-table - DynamoDbTableComponent Component
 * DynamoDB Table Component implementing Component API Contract v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDbTableComponentCreator = exports.DYNAMODB_TABLE_CONFIG_SCHEMA = exports.DynamoDbTableComponentConfigBuilder = exports.DynamoDbTableComponentComponent = void 0;
// Component exports
var dynamodb_table_component_1 = require("./dynamodb-table.component");
Object.defineProperty(exports, "DynamoDbTableComponentComponent", { enumerable: true, get: function () { return dynamodb_table_component_1.DynamoDbTableComponentComponent; } });
// Configuration exports
var dynamodb_table_builder_1 = require("./dynamodb-table.builder");
Object.defineProperty(exports, "DynamoDbTableComponentConfigBuilder", { enumerable: true, get: function () { return dynamodb_table_builder_1.DynamoDbTableComponentConfigBuilder; } });
Object.defineProperty(exports, "DYNAMODB_TABLE_CONFIG_SCHEMA", { enumerable: true, get: function () { return dynamodb_table_builder_1.DYNAMODB_TABLE_CONFIG_SCHEMA; } });
// Creator exports
var dynamodb_table_creator_1 = require("./dynamodb-table.creator");
Object.defineProperty(exports, "DynamoDbTableComponentCreator", { enumerable: true, get: function () { return dynamodb_table_creator_1.DynamoDbTableComponentCreator; } });
