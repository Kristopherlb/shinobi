/**
 * @platform/lambda-worker - LambdaWorkerComponent Component
 * Lambda Worker Component
 */

export * from './src/lambda-worker.component.js';
export {
  LambdaWorkerComponentConfigBuilder,
  LAMBDA_WORKER_CONFIG_SCHEMA
} from './src/lambda-worker.builder.js';
export type {
  LambdaWorkerConfig
} from './src/lambda-worker.builder.js';
export { LambdaWorkerComponentCreator } from './src/lambda-worker.creator.js';
