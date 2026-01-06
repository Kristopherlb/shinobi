/**
 * @platform/ecs-cluster - EcsClusterComponent Component
 * ECS Cluster Component
 */

// Component exports
export { EcsClusterComponent } from './src/ecs-cluster.component.js';

// Configuration exports
export {
  EcsClusterComponentConfigBuilder,
  ECS_CLUSTER_CONFIG_SCHEMA
} from './src/ecs-cluster.builder.js';
export type {
  EcsClusterConfig
} from './src/ecs-cluster.builder.js';

// Creator exports
export { EcsClusterComponentCreator } from './src/ecs-cluster.creator.js';
