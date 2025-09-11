"use strict";
/**
 * @platform/openfeature-provider - OpenFeatureProviderComponent Component
 * OpenFeature Provider Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenFeatureProviderComponentCreator = exports.OPENFEATURE_PROVIDER_CONFIG_SCHEMA = exports.OpenFeatureProviderComponentConfigBuilder = exports.OpenFeatureProviderComponentComponent = void 0;
// Component exports
var openfeature_provider_component_1 = require("./openfeature-provider.component");
Object.defineProperty(exports, "OpenFeatureProviderComponentComponent", { enumerable: true, get: function () { return openfeature_provider_component_1.OpenFeatureProviderComponentComponent; } });
// Configuration exports
var openfeature_provider_builder_1 = require("./openfeature-provider.builder");
Object.defineProperty(exports, "OpenFeatureProviderComponentConfigBuilder", { enumerable: true, get: function () { return openfeature_provider_builder_1.OpenFeatureProviderComponentConfigBuilder; } });
Object.defineProperty(exports, "OPENFEATURE_PROVIDER_CONFIG_SCHEMA", { enumerable: true, get: function () { return openfeature_provider_builder_1.OPENFEATURE_PROVIDER_CONFIG_SCHEMA; } });
// Creator exports
var openfeature_provider_creator_1 = require("./openfeature-provider.creator");
Object.defineProperty(exports, "OpenFeatureProviderComponentCreator", { enumerable: true, get: function () { return openfeature_provider_creator_1.OpenFeatureProviderComponentCreator; } });
