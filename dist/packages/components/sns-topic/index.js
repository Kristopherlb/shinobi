"use strict";
/**
 * @platform/sns-topic - SnsTopicComponent Component
 * SNS Topic Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnsTopicComponentCreator = exports.SNS_TOPIC_CONFIG_SCHEMA = exports.SnsTopicComponentConfigBuilder = exports.SnsTopicComponentComponent = void 0;
// Component exports
var sns_topic_component_1 = require("./sns-topic.component");
Object.defineProperty(exports, "SnsTopicComponentComponent", { enumerable: true, get: function () { return sns_topic_component_1.SnsTopicComponentComponent; } });
// Configuration exports
var sns_topic_builder_1 = require("./sns-topic.builder");
Object.defineProperty(exports, "SnsTopicComponentConfigBuilder", { enumerable: true, get: function () { return sns_topic_builder_1.SnsTopicComponentConfigBuilder; } });
Object.defineProperty(exports, "SNS_TOPIC_CONFIG_SCHEMA", { enumerable: true, get: function () { return sns_topic_builder_1.SNS_TOPIC_CONFIG_SCHEMA; } });
// Creator exports
var sns_topic_creator_1 = require("./sns-topic.creator");
Object.defineProperty(exports, "SnsTopicComponentCreator", { enumerable: true, get: function () { return sns_topic_creator_1.SnsTopicComponentCreator; } });
