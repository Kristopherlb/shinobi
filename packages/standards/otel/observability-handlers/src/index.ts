/**
 * @shinobi/observability-handlers
 * 
 * Component-specific observability handlers for CDK-Lib platform.
 * Provides OpenTelemetry instrumentation and CloudWatch alarms for individual component types.
 */

// Handler interfaces
export {
  IObservabilityHandler,
  ObservabilityHandlerResult,
  ObservabilityConfig
} from './observability-handlers/observability-handler.interface.ts';

// Individual handlers
export { Ec2ObservabilityHandler } from './observability-handlers/ec2-observability.handler.ts';
export { LambdaObservabilityHandler } from './observability-handlers/lambda-observability.handler.ts';
export { LambdaPowertoolsExtensionHandler, LambdaPowertoolsConfig } from './observability-handlers/lambda-powertools-extension.handler.ts';
export { LambdaObservabilityService, LambdaObservabilityServiceConfig } from './services/lambda-observability.service.ts';
export { VpcObservabilityHandler } from './observability-handlers/vpc-observability.handler.ts';
export { AlbObservabilityHandler } from './observability-handlers/alb-observability.handler.ts';
export { RdsObservabilityHandler } from './observability-handlers/rds-observability.handler.ts';
export { SqsObservabilityHandler } from './observability-handlers/sqs-observability.handler.ts';
export { EcsObservabilityHandler } from './observability-handlers/ecs-observability.handler.ts';

// Import handlers for registry
import { Ec2ObservabilityHandler } from './observability-handlers/ec2-observability.handler.ts';
import { LambdaObservabilityHandler } from './observability-handlers/lambda-observability.handler.ts';
import { VpcObservabilityHandler } from './observability-handlers/vpc-observability.handler.ts';
import { AlbObservabilityHandler } from './observability-handlers/alb-observability.handler.ts';
import { RdsObservabilityHandler } from './observability-handlers/rds-observability.handler.ts';
import { SqsObservabilityHandler } from './observability-handlers/sqs-observability.handler.ts';
import { EcsObservabilityHandler } from './observability-handlers/ecs-observability.handler.ts';

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
