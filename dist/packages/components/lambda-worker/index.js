"use strict";
/**
 * @platform/lambda-worker - LambdaWorkerComponent Component
 * Lambda Worker Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaWorkerComponentCreator = exports.LAMBDA_WORKER_CONFIG_SCHEMA = exports.LambdaWorkerComponentConfigBuilder = exports.LambdaWorkerComponentComponent = void 0;
// Component exports
var lambda_worker_component_1 = require("./lambda-worker.component");
Object.defineProperty(exports, "LambdaWorkerComponentComponent", { enumerable: true, get: function () { return lambda_worker_component_1.LambdaWorkerComponentComponent; } });
// Configuration exports
var lambda_worker_builder_1 = require("./lambda-worker.builder");
Object.defineProperty(exports, "LambdaWorkerComponentConfigBuilder", { enumerable: true, get: function () { return lambda_worker_builder_1.LambdaWorkerComponentConfigBuilder; } });
Object.defineProperty(exports, "LAMBDA_WORKER_CONFIG_SCHEMA", { enumerable: true, get: function () { return lambda_worker_builder_1.LAMBDA_WORKER_CONFIG_SCHEMA; } });
// Creator exports
var lambda_worker_creator_1 = require("./lambda-worker.creator");
Object.defineProperty(exports, "LambdaWorkerComponentCreator", { enumerable: true, get: function () { return lambda_worker_creator_1.LambdaWorkerComponentCreator; } });
