/**
 * @platform/lambda-api - LambdaApiComponent Component
 * Lambda API Component
 */

export * from './src/lambda-api.component.js';
export {
  LambdaApiComponentConfigBuilder,
  LAMBDA_API_CONFIG_SCHEMA
} from './src/lambda-api.builder.js';
export type {
  LambdaApiConfig,
  LambdaRuntime,
  LambdaArchitecture
} from './src/lambda-api.builder.js';
export { LambdaApiComponentCreator } from './src/lambda-api.creator.js';
