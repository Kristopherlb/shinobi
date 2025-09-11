"use strict";
/**
 * @platform/ecs-ec2-service - EcsEc2ServiceComponent Component
 * ECS EC2 Service Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcsEc2ServiceComponentCreator = exports.ECS_EC2_SERVICE_CONFIG_SCHEMA = exports.EcsEc2ServiceComponentConfigBuilder = exports.EcsEc2ServiceComponentComponent = void 0;
// Component exports
var ecs_ec2_service_component_1 = require("./ecs-ec2-service.component");
Object.defineProperty(exports, "EcsEc2ServiceComponentComponent", { enumerable: true, get: function () { return ecs_ec2_service_component_1.EcsEc2ServiceComponentComponent; } });
// Configuration exports
var ecs_ec2_service_builder_1 = require("./ecs-ec2-service.builder");
Object.defineProperty(exports, "EcsEc2ServiceComponentConfigBuilder", { enumerable: true, get: function () { return ecs_ec2_service_builder_1.EcsEc2ServiceComponentConfigBuilder; } });
Object.defineProperty(exports, "ECS_EC2_SERVICE_CONFIG_SCHEMA", { enumerable: true, get: function () { return ecs_ec2_service_builder_1.ECS_EC2_SERVICE_CONFIG_SCHEMA; } });
// Creator exports
var ecs_ec2_service_creator_1 = require("./ecs-ec2-service.creator");
Object.defineProperty(exports, "EcsEc2ServiceComponentCreator", { enumerable: true, get: function () { return ecs_ec2_service_creator_1.EcsEc2ServiceComponentCreator; } });
