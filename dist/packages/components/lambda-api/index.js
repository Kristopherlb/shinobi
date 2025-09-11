"use strict";
/**
 * @platform/lambda-api - LambdaApiComponent Component
 * Lambda API Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaApiComponentCreator = exports.LAMBDA_API_CONFIG_SCHEMA = exports.LambdaApiComponentConfigBuilder = exports.LambdaApiComponentComponent = void 0;
// Component exports
var lambda_api_component_1 = require("./lambda-api.component");
Object.defineProperty(exports, "LambdaApiComponentComponent", { enumerable: true, get: function () { return lambda_api_component_1.LambdaApiComponentComponent; } });
// Configuration exports
var lambda_api_builder_1 = require("./lambda-api.builder");
Object.defineProperty(exports, "LambdaApiComponentConfigBuilder", { enumerable: true, get: function () { return lambda_api_builder_1.LambdaApiComponentConfigBuilder; } });
Object.defineProperty(exports, "LAMBDA_API_CONFIG_SCHEMA", { enumerable: true, get: function () { return lambda_api_builder_1.LAMBDA_API_CONFIG_SCHEMA; } });
// Creator exports
var lambda_api_creator_1 = require("./lambda-api.creator");
Object.defineProperty(exports, "LambdaApiComponentCreator", { enumerable: true, get: function () { return lambda_api_creator_1.LambdaApiComponentCreator; } });
