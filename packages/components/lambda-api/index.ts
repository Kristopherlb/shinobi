/**
 * @platform/lambda-api - LambdaApiComponent Component
 * Lambda API Component
 */

// Component exports
export * from "./src/lambda-api.component";
export * from "./src/lambda-api.builder";

// Configuration exports
export {
  LambdaApiConfig,
  LambdaApiConfigBuilder
} from './src/lambda-api.builder';

// Schema export
export { default as LAMBDA_API_CONFIG_SCHEMA } from './Config.schema.json';

// Creator exports
export { LambdaApiComponentCreator } from './src/lambda-api.creator';

