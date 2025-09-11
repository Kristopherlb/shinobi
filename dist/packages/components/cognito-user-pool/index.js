"use strict";
/**
 * @platform/cognito-user-pool - CognitoUserPoolComponent Component
 * Cognito User Pool Component implementing Component API Contract v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitoUserPoolComponentCreator = exports.COGNITO_USER_POOL_CONFIG_SCHEMA = exports.CognitoUserPoolComponentConfigBuilder = exports.CognitoUserPoolComponentComponent = void 0;
// Component exports
var cognito_user_pool_component_1 = require("./cognito-user-pool.component");
Object.defineProperty(exports, "CognitoUserPoolComponentComponent", { enumerable: true, get: function () { return cognito_user_pool_component_1.CognitoUserPoolComponentComponent; } });
// Configuration exports
var cognito_user_pool_builder_1 = require("./cognito-user-pool.builder");
Object.defineProperty(exports, "CognitoUserPoolComponentConfigBuilder", { enumerable: true, get: function () { return cognito_user_pool_builder_1.CognitoUserPoolComponentConfigBuilder; } });
Object.defineProperty(exports, "COGNITO_USER_POOL_CONFIG_SCHEMA", { enumerable: true, get: function () { return cognito_user_pool_builder_1.COGNITO_USER_POOL_CONFIG_SCHEMA; } });
// Creator exports
var cognito_user_pool_creator_1 = require("./cognito-user-pool.creator");
Object.defineProperty(exports, "CognitoUserPoolComponentCreator", { enumerable: true, get: function () { return cognito_user_pool_creator_1.CognitoUserPoolComponentCreator; } });
