"use strict";
/**
 * IAM Role Component Package
 *
 * Exports all IAM role component classes and interfaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamRoleCreator = exports.IAM_ROLE_CONFIG_SCHEMA = exports.IamRoleConfigBuilder = exports.IamRoleComponent = void 0;
// Main component class
var iam_role_component_1 = require("./iam-role.component");
Object.defineProperty(exports, "IamRoleComponent", { enumerable: true, get: function () { return iam_role_component_1.IamRoleComponent; } });
// Configuration builder and interfaces
var iam_role_builder_1 = require("./iam-role.builder");
Object.defineProperty(exports, "IamRoleConfigBuilder", { enumerable: true, get: function () { return iam_role_builder_1.IamRoleConfigBuilder; } });
Object.defineProperty(exports, "IAM_ROLE_CONFIG_SCHEMA", { enumerable: true, get: function () { return iam_role_builder_1.IAM_ROLE_CONFIG_SCHEMA; } });
// Component creator factory
var iam_role_creator_1 = require("./iam-role.creator");
Object.defineProperty(exports, "IamRoleCreator", { enumerable: true, get: function () { return iam_role_creator_1.IamRoleCreator; } });
