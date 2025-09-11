"use strict";
/**
 * @platform/iam-policy - IamPolicyComponent Component
 * IAM Policy Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamPolicyComponentCreator = exports.IAM_POLICY_CONFIG_SCHEMA = exports.IamPolicyComponentConfigBuilder = exports.IamPolicyComponentComponent = void 0;
// Component exports
var iam_policy_component_1 = require("./iam-policy.component");
Object.defineProperty(exports, "IamPolicyComponentComponent", { enumerable: true, get: function () { return iam_policy_component_1.IamPolicyComponentComponent; } });
// Configuration exports
var iam_policy_builder_1 = require("./iam-policy.builder");
Object.defineProperty(exports, "IamPolicyComponentConfigBuilder", { enumerable: true, get: function () { return iam_policy_builder_1.IamPolicyComponentConfigBuilder; } });
Object.defineProperty(exports, "IAM_POLICY_CONFIG_SCHEMA", { enumerable: true, get: function () { return iam_policy_builder_1.IAM_POLICY_CONFIG_SCHEMA; } });
// Creator exports
var iam_policy_creator_1 = require("./iam-policy.creator");
Object.defineProperty(exports, "IamPolicyComponentCreator", { enumerable: true, get: function () { return iam_policy_creator_1.IamPolicyComponentCreator; } });
