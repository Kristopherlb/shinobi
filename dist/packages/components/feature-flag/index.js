"use strict";
/**
 * @platform/feature-flag - FeatureFlagComponent Component
 * Feature Flag Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagComponentCreator = exports.FEATURE_FLAG_CONFIG_SCHEMA = exports.FeatureFlagComponentConfigBuilder = exports.FeatureFlagComponentComponent = void 0;
// Component exports
var feature_flag_component_1 = require("./feature-flag.component");
Object.defineProperty(exports, "FeatureFlagComponentComponent", { enumerable: true, get: function () { return feature_flag_component_1.FeatureFlagComponentComponent; } });
// Configuration exports
var feature_flag_builder_1 = require("./feature-flag.builder");
Object.defineProperty(exports, "FeatureFlagComponentConfigBuilder", { enumerable: true, get: function () { return feature_flag_builder_1.FeatureFlagComponentConfigBuilder; } });
Object.defineProperty(exports, "FEATURE_FLAG_CONFIG_SCHEMA", { enumerable: true, get: function () { return feature_flag_builder_1.FEATURE_FLAG_CONFIG_SCHEMA; } });
// Creator exports
var feature_flag_creator_1 = require("./feature-flag.creator");
Object.defineProperty(exports, "FeatureFlagComponentCreator", { enumerable: true, get: function () { return feature_flag_creator_1.FeatureFlagComponentCreator; } });
