"use strict";
/**
 * @platform/ecr-repository - EcrRepositoryComponent Component
 * ECR Repository Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcrRepositoryComponentCreator = exports.ECR_REPOSITORY_CONFIG_SCHEMA = exports.EcrRepositoryComponentConfigBuilder = exports.EcrRepositoryComponentComponent = void 0;
// Component exports
var ecr_repository_component_1 = require("./ecr-repository.component");
Object.defineProperty(exports, "EcrRepositoryComponentComponent", { enumerable: true, get: function () { return ecr_repository_component_1.EcrRepositoryComponentComponent; } });
// Configuration exports
var ecr_repository_builder_1 = require("./ecr-repository.builder");
Object.defineProperty(exports, "EcrRepositoryComponentConfigBuilder", { enumerable: true, get: function () { return ecr_repository_builder_1.EcrRepositoryComponentConfigBuilder; } });
Object.defineProperty(exports, "ECR_REPOSITORY_CONFIG_SCHEMA", { enumerable: true, get: function () { return ecr_repository_builder_1.ECR_REPOSITORY_CONFIG_SCHEMA; } });
// Creator exports
var ecr_repository_creator_1 = require("./ecr-repository.creator");
Object.defineProperty(exports, "EcrRepositoryComponentCreator", { enumerable: true, get: function () { return ecr_repository_creator_1.EcrRepositoryComponentCreator; } });
