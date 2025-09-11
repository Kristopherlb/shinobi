"use strict";
/**
 * @platform/sqs-queue-new - SqsQueueNew Component
 * SQS message queue with compliance hardening and DLQ support
 *
 * @author Platform Team
 * @category messaging
 * @service SQS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqsQueueNewCreator = exports.SQS_QUEUE_NEW_CONFIG_SCHEMA = exports.SqsQueueNewConfigBuilder = exports.SqsQueueNewConfig = exports.SqsQueueNewComponent = void 0;
// Component exports
var sqs_queue_new_component_1 = require("./sqs-queue-new.component");
Object.defineProperty(exports, "SqsQueueNewComponent", { enumerable: true, get: function () { return sqs_queue_new_component_1.SqsQueueNewComponent; } });
// Configuration exports
var sqs_queue_new_builder_1 = require("./sqs-queue-new.builder");
Object.defineProperty(exports, "SqsQueueNewConfig", { enumerable: true, get: function () { return sqs_queue_new_builder_1.SqsQueueNewConfig; } });
Object.defineProperty(exports, "SqsQueueNewConfigBuilder", { enumerable: true, get: function () { return sqs_queue_new_builder_1.SqsQueueNewConfigBuilder; } });
Object.defineProperty(exports, "SQS_QUEUE_NEW_CONFIG_SCHEMA", { enumerable: true, get: function () { return sqs_queue_new_builder_1.SQS_QUEUE_NEW_CONFIG_SCHEMA; } });
// Creator exports
var sqs_queue_new_creator_1 = require("./sqs-queue-new.creator");
Object.defineProperty(exports, "SqsQueueNewCreator", { enumerable: true, get: function () { return sqs_queue_new_creator_1.SqsQueueNewCreator; } });
