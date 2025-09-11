"use strict";
/**
 * @platform/iam-role - IamRoleComponent Component
 * IAM Role Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamRoleComponentCreator = exports.IAM_ROLE_CONFIG_SCHEMA = exports.IamRoleComponentConfigBuilder = exports.IamRoleComponentComponent = void 0;
// Component exports
var iam_role_component_1 = require("./iam-role.component");
Object.defineProperty(exports, "IamRoleComponentComponent", { enumerable: true, get: function () { return iam_role_component_1.IamRoleComponentComponent; } });
// Configuration exports
var iam_role_builder_1 = require("./iam-role.builder");
Object.defineProperty(exports, "IamRoleComponentConfigBuilder", { enumerable: true, get: function () { return iam_role_builder_1.IamRoleComponentConfigBuilder; } });
Object.defineProperty(exports, "IAM_ROLE_CONFIG_SCHEMA", { enumerable: true, get: function () { return iam_role_builder_1.IAM_ROLE_CONFIG_SCHEMA; } });
// Creator exports
var iam_role_creator_1 = require("./iam-role.creator");
Object.defineProperty(exports, "IamRoleComponentCreator", { enumerable: true, get: function () { return iam_role_creator_1.IamRoleComponentCreator; } });
