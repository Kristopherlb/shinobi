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
} from './observability-handlers/observability-handler.interface.js';

// Individual handlers
export { Ec2ObservabilityHandler } from './observability-handlers/ec2-observability.handler.js';
export { LambdaObservabilityHandler } from './observability-handlers/lambda-observability.handler.js';
export { LambdaPowertoolsExtensionHandler, LambdaPowertoolsConfig } from './observability-handlers/lambda-powertools-extension.handler.js';
export { LambdaObservabilityService, LambdaObservabilityServiceConfig } from './services/lambda-observability.service.js';
export { VpcObservabilityHandler } from './observability-handlers/vpc-observability.handler.js';
export { AlbObservabilityHandler } from './observability-handlers/alb-observability.handler.js';
export { RdsObservabilityHandler } from './observability-handlers/rds-observability.handler.js';
export { SqsObservabilityHandler } from './observability-handlers/sqs-observability.handler.js';
export { EcsObservabilityHandler } from './observability-handlers/ecs-observability.handler.js';

// Import handlers for registry
import { Ec2ObservabilityHandler } from './observability-handlers/ec2-observability.handler.js';
import { LambdaObservabilityHandler } from './observability-handlers/lambda-observability.handler.js';
import { VpcObservabilityHandler } from './observability-handlers/vpc-observability.handler.js';
import { AlbObservabilityHandler } from './observability-handlers/alb-observability.handler.js';
import { RdsObservabilityHandler } from './observability-handlers/rds-observability.handler.js';
import { SqsObservabilityHandler } from './observability-handlers/sqs-observability.handler.js';
import { EcsObservabilityHandler } from './observability-handlers/ecs-observability.handler.js';

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
