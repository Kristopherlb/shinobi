/**
 * @shinobi/observability-handlers
 *
 * Component-specific observability handlers for CDK-Lib platform.
 * Provides OpenTelemetry instrumentation and CloudWatch alarms for individual component types.
 */
export { IObservabilityHandler, ObservabilityHandlerResult, ObservabilityConfig } from './observability-handlers/observability-handler.interface';
export { Ec2ObservabilityHandler } from './observability-handlers/ec2-observability.handler';
export { LambdaObservabilityHandler } from './observability-handlers/lambda-observability.handler';
export { VpcObservabilityHandler } from './observability-handlers/vpc-observability.handler';
export { AlbObservabilityHandler } from './observability-handlers/alb-observability.handler';
export { RdsObservabilityHandler } from './observability-handlers/rds-observability.handler';
export { SqsObservabilityHandler } from './observability-handlers/sqs-observability.handler';
export { EcsObservabilityHandler } from './observability-handlers/ecs-observability.handler';
import { Ec2ObservabilityHandler } from './observability-handlers/ec2-observability.handler';
import { LambdaObservabilityHandler } from './observability-handlers/lambda-observability.handler';
import { VpcObservabilityHandler } from './observability-handlers/vpc-observability.handler';
import { AlbObservabilityHandler } from './observability-handlers/alb-observability.handler';
import { RdsObservabilityHandler } from './observability-handlers/rds-observability.handler';
import { SqsObservabilityHandler } from './observability-handlers/sqs-observability.handler';
import { EcsObservabilityHandler } from './observability-handlers/ecs-observability.handler';
export declare const OBSERVABILITY_HANDLERS: {
    readonly 'ec2-instance': typeof Ec2ObservabilityHandler;
    readonly lambda: typeof LambdaObservabilityHandler;
    readonly vpc: typeof VpcObservabilityHandler;
    readonly 'application-load-balancer': typeof AlbObservabilityHandler;
    readonly 'rds-postgres': typeof RdsObservabilityHandler;
    readonly 'sqs-queue': typeof SqsObservabilityHandler;
    readonly ecs: typeof EcsObservabilityHandler;
    readonly 'ecs-cluster': typeof EcsObservabilityHandler;
    readonly 'ecs-fargate-service': typeof EcsObservabilityHandler;
    readonly 'ecs-ec2-service': typeof EcsObservabilityHandler;
};
//# sourceMappingURL=index.d.ts.map