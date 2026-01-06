/**
 * @platform/ecs-fargate-service - EcsFargateServiceComponent Component
 * ECS Fargate Service Component
 */

// Component exports
export { EcsFargateServiceComponent } from './src/ecs-fargate-service.component.js';

// Configuration exports
export {
  EcsFargateServiceConfig,
  EcsFargateServiceComponentConfigBuilder,
  ECS_FARGATE_SERVICE_CONFIG_SCHEMA
} from './src/ecs-fargate-service.builder.js';

// Creator exports
export { EcsFargateServiceComponentCreator } from './src/ecs-fargate-service.creator.js';
