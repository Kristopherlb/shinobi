"use strict";
/**
 * @platform/secrets-manager - SecretsManagerComponent Component
 * Secrets Manager Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsManagerComponentCreator = exports.SECRETS_MANAGER_CONFIG_SCHEMA = exports.SecretsManagerComponentConfigBuilder = exports.SecretsManagerComponentComponent = void 0;
// Component exports
var secrets_manager_component_1 = require("./secrets-manager.component");
Object.defineProperty(exports, "SecretsManagerComponentComponent", { enumerable: true, get: function () { return secrets_manager_component_1.SecretsManagerComponentComponent; } });
// Configuration exports
var secrets_manager_builder_1 = require("./secrets-manager.builder");
Object.defineProperty(exports, "SecretsManagerComponentConfigBuilder", { enumerable: true, get: function () { return secrets_manager_builder_1.SecretsManagerComponentConfigBuilder; } });
Object.defineProperty(exports, "SECRETS_MANAGER_CONFIG_SCHEMA", { enumerable: true, get: function () { return secrets_manager_builder_1.SECRETS_MANAGER_CONFIG_SCHEMA; } });
// Creator exports
var secrets_manager_creator_1 = require("./secrets-manager.creator");
Object.defineProperty(exports, "SecretsManagerComponentCreator", { enumerable: true, get: function () { return secrets_manager_creator_1.SecretsManagerComponentCreator; } });
