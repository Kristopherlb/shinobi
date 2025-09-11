"use strict";
/**
 * @platform/bindings - Component Binding Strategies and Registry
 * Strategies for connecting AWS components automatically
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComputeToSecurityGroupImportBinder = exports.ComputeToIamRoleBinder = exports.ComputeToServiceConnectBinder = exports.ComputeToOpenFeatureStrategy = exports.LambdaToSnsImportStrategyDependencies = exports.LambdaToSnsImportStrategy = exports.LambdaToRdsImportStrategyDependencies = exports.LambdaToRdsImportStrategy = void 0;
// Export binding strategies
var lambda_to_rds_import_strategy_1 = require("./strategies/lambda-to-rds-import.strategy");
Object.defineProperty(exports, "LambdaToRdsImportStrategy", { enumerable: true, get: function () { return lambda_to_rds_import_strategy_1.LambdaToRdsImportStrategy; } });
Object.defineProperty(exports, "LambdaToRdsImportStrategyDependencies", { enumerable: true, get: function () { return lambda_to_rds_import_strategy_1.LambdaToRdsImportStrategyDependencies; } });
var lambda_to_sns_import_strategy_1 = require("./strategies/lambda-to-sns-import.strategy");
Object.defineProperty(exports, "LambdaToSnsImportStrategy", { enumerable: true, get: function () { return lambda_to_sns_import_strategy_1.LambdaToSnsImportStrategy; } });
Object.defineProperty(exports, "LambdaToSnsImportStrategyDependencies", { enumerable: true, get: function () { return lambda_to_sns_import_strategy_1.LambdaToSnsImportStrategyDependencies; } });
var compute_to_openfeature_strategy_1 = require("./strategies/compute-to-openfeature.strategy");
Object.defineProperty(exports, "ComputeToOpenFeatureStrategy", { enumerable: true, get: function () { return compute_to_openfeature_strategy_1.ComputeToOpenFeatureStrategy; } });
var compute_to_service_connect_strategy_1 = require("./strategies/compute-to-service-connect.strategy");
Object.defineProperty(exports, "ComputeToServiceConnectBinder", { enumerable: true, get: function () { return compute_to_service_connect_strategy_1.ComputeToServiceConnectBinder; } });
var compute_to_iam_role_strategy_1 = require("./strategies/compute-to-iam-role.strategy");
Object.defineProperty(exports, "ComputeToIamRoleBinder", { enumerable: true, get: function () { return compute_to_iam_role_strategy_1.ComputeToIamRoleBinder; } });
var compute_to_security_group_import_strategy_1 = require("./strategies/compute-to-security-group-import.strategy");
Object.defineProperty(exports, "ComputeToSecurityGroupImportBinder", { enumerable: true, get: function () { return compute_to_security_group_import_strategy_1.ComputeToSecurityGroupImportBinder; } });
