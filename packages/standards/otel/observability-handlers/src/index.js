"use strict";
/**
 * @shinobi/observability-handlers
 *
 * Component-specific observability handlers for CDK-Lib platform.
 * Provides OpenTelemetry instrumentation and CloudWatch alarms for individual component types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBSERVABILITY_HANDLERS = exports.EcsObservabilityHandler = exports.SqsObservabilityHandler = exports.RdsObservabilityHandler = exports.AlbObservabilityHandler = exports.VpcObservabilityHandler = exports.LambdaObservabilityHandler = exports.Ec2ObservabilityHandler = void 0;
// Individual handlers
var ec2_observability_handler_1 = require("./observability-handlers/ec2-observability.handler");
Object.defineProperty(exports, "Ec2ObservabilityHandler", { enumerable: true, get: function () { return ec2_observability_handler_1.Ec2ObservabilityHandler; } });
var lambda_observability_handler_1 = require("./observability-handlers/lambda-observability.handler");
Object.defineProperty(exports, "LambdaObservabilityHandler", { enumerable: true, get: function () { return lambda_observability_handler_1.LambdaObservabilityHandler; } });
var vpc_observability_handler_1 = require("./observability-handlers/vpc-observability.handler");
Object.defineProperty(exports, "VpcObservabilityHandler", { enumerable: true, get: function () { return vpc_observability_handler_1.VpcObservabilityHandler; } });
var alb_observability_handler_1 = require("./observability-handlers/alb-observability.handler");
Object.defineProperty(exports, "AlbObservabilityHandler", { enumerable: true, get: function () { return alb_observability_handler_1.AlbObservabilityHandler; } });
var rds_observability_handler_1 = require("./observability-handlers/rds-observability.handler");
Object.defineProperty(exports, "RdsObservabilityHandler", { enumerable: true, get: function () { return rds_observability_handler_1.RdsObservabilityHandler; } });
var sqs_observability_handler_1 = require("./observability-handlers/sqs-observability.handler");
Object.defineProperty(exports, "SqsObservabilityHandler", { enumerable: true, get: function () { return sqs_observability_handler_1.SqsObservabilityHandler; } });
var ecs_observability_handler_1 = require("./observability-handlers/ecs-observability.handler");
Object.defineProperty(exports, "EcsObservabilityHandler", { enumerable: true, get: function () { return ecs_observability_handler_1.EcsObservabilityHandler; } });
// Import handlers for registry
const ec2_observability_handler_2 = require("./observability-handlers/ec2-observability.handler");
const lambda_observability_handler_2 = require("./observability-handlers/lambda-observability.handler");
const vpc_observability_handler_2 = require("./observability-handlers/vpc-observability.handler");
const alb_observability_handler_2 = require("./observability-handlers/alb-observability.handler");
const rds_observability_handler_2 = require("./observability-handlers/rds-observability.handler");
const sqs_observability_handler_2 = require("./observability-handlers/sqs-observability.handler");
const ecs_observability_handler_2 = require("./observability-handlers/ecs-observability.handler");
// Handler registry for easy access
exports.OBSERVABILITY_HANDLERS = {
    'ec2-instance': ec2_observability_handler_2.Ec2ObservabilityHandler,
    'lambda': lambda_observability_handler_2.LambdaObservabilityHandler,
    'vpc': vpc_observability_handler_2.VpcObservabilityHandler,
    'application-load-balancer': alb_observability_handler_2.AlbObservabilityHandler,
    'rds-postgres': rds_observability_handler_2.RdsObservabilityHandler,
    'sqs-queue': sqs_observability_handler_2.SqsObservabilityHandler,
    'ecs': ecs_observability_handler_2.EcsObservabilityHandler,
    'ecs-cluster': ecs_observability_handler_2.EcsObservabilityHandler,
    'ecs-fargate-service': ecs_observability_handler_2.EcsObservabilityHandler,
    'ecs-ec2-service': ecs_observability_handler_2.EcsObservabilityHandler
};
//# sourceMappingURL=index.js.map