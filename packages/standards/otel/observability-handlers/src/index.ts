/**
 * @cdk-lib/observability-handlers
 * 
 * Component-specific observability handlers for CDK-Lib platform.
 * Provides OpenTelemetry instrumentation and CloudWatch alarms for individual component types.
 */

// Handler interfaces
export { 
  IObservabilityHandler, 
  ObservabilityHandlerResult, 
  ObservabilityConfig 
} from './observability-handlers/observability-handler.interface';

// Individual handlers
export { Ec2ObservabilityHandler } from './observability-handlers/ec2-observability.handler';
export { LambdaObservabilityHandler } from './observability-handlers/lambda-observability.handler';
export { VpcObservabilityHandler } from './observability-handlers/vpc-observability.handler';
export { AlbObservabilityHandler } from './observability-handlers/alb-observability.handler';
export { RdsObservabilityHandler } from './observability-handlers/rds-observability.handler';
export { SqsObservabilityHandler } from './observability-handlers/sqs-observability.handler';
export { EcsObservabilityHandler } from './observability-handlers/ecs-observability.handler';

// Handler registry for easy access
export const OBSERVABILITY_HANDLERS = {
  'ec2-instance': Ec2ObservabilityHandler,
  'lambda': LambdaObservabilityHandler,
  'vpc': VpcObservabilityHandler,
  'application-load-balancer': AlbObservabilityHandler,
  'rds-postgres': RdsObservabilityHandler,
  'sqs-queue': SqsObservabilityHandler,
  'ecs': EcsObservabilityHandler,
  'ecs-cluster': EcsObservabilityHandler,
  'ecs-fargate-service': EcsObservabilityHandler,
  'ecs-ec2-service': EcsObservabilityHandler
} as const;
