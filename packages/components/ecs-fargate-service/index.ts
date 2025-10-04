/**
 * @platform/ecs-fargate-service - EcsFargateServiceComponent Component
 * ECS Fargate Service Component
 */

// Component exports
export { EcsFargateServiceComponentComponent } from './ecs-fargate-service.component.ts';

// Configuration exports
export { 
  EcsFargateServiceConfig,
  EcsFargateServiceComponentConfigBuilder,
  ECS_FARGATE_SERVICE_CONFIG_SCHEMA
} from './ecs-fargate-service.builder.ts';

// Creator exports
export { EcsFargateServiceComponentCreator } from './ecs-fargate-service.creator.ts';