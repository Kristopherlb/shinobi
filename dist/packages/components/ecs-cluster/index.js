"use strict";
/**
 * @platform/ecs-cluster - EcsClusterComponent Component
 * ECS Cluster Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcsClusterComponentCreator = exports.ECS_CLUSTER_CONFIG_SCHEMA = exports.EcsClusterComponentConfigBuilder = exports.EcsClusterComponentComponent = void 0;
// Component exports
var ecs_cluster_component_1 = require("./ecs-cluster.component");
Object.defineProperty(exports, "EcsClusterComponentComponent", { enumerable: true, get: function () { return ecs_cluster_component_1.EcsClusterComponentComponent; } });
// Configuration exports
var ecs_cluster_builder_1 = require("./ecs-cluster.builder");
Object.defineProperty(exports, "EcsClusterComponentConfigBuilder", { enumerable: true, get: function () { return ecs_cluster_builder_1.EcsClusterComponentConfigBuilder; } });
Object.defineProperty(exports, "ECS_CLUSTER_CONFIG_SCHEMA", { enumerable: true, get: function () { return ecs_cluster_builder_1.ECS_CLUSTER_CONFIG_SCHEMA; } });
// Creator exports
var ecs_cluster_creator_1 = require("./ecs-cluster.creator");
Object.defineProperty(exports, "EcsClusterComponentCreator", { enumerable: true, get: function () { return ecs_cluster_creator_1.EcsClusterComponentCreator; } });
