"use strict";
/**
 * @platform/kinesis-stream - KinesisStreamComponent Component
 * Kinesis Stream Component implementing Component API Contract v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KinesisStreamComponentCreator = exports.KINESIS_STREAM_CONFIG_SCHEMA = exports.KinesisStreamComponentConfigBuilder = exports.KinesisStreamComponentComponent = void 0;
// Component exports
var kinesis_stream_component_1 = require("./kinesis-stream.component");
Object.defineProperty(exports, "KinesisStreamComponentComponent", { enumerable: true, get: function () { return kinesis_stream_component_1.KinesisStreamComponentComponent; } });
// Configuration exports
var kinesis_stream_builder_1 = require("./kinesis-stream.builder");
Object.defineProperty(exports, "KinesisStreamComponentConfigBuilder", { enumerable: true, get: function () { return kinesis_stream_builder_1.KinesisStreamComponentConfigBuilder; } });
Object.defineProperty(exports, "KINESIS_STREAM_CONFIG_SCHEMA", { enumerable: true, get: function () { return kinesis_stream_builder_1.KINESIS_STREAM_CONFIG_SCHEMA; } });
// Creator exports
var kinesis_stream_creator_1 = require("./kinesis-stream.creator");
Object.defineProperty(exports, "KinesisStreamComponentCreator", { enumerable: true, get: function () { return kinesis_stream_creator_1.KinesisStreamComponentCreator; } });
