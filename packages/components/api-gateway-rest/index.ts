/**
 * @platform/api-gateway-rest - ApiGatewayRestComponent Component
 * Enterprise REST API Gateway Component implementing Component API Contract v1.0
 */

// Component exports
export { ApiGatewayRestComponent } from './src/api-gateway-rest.component.ts';

// Configuration exports
export {
  ApiGatewayRestConfigBuilder,
  API_GATEWAY_REST_CONFIG_SCHEMA,
} from './src/api-gateway-rest.builder.ts';
export type { ApiGatewayRestConfig } from './src/api-gateway-rest.builder.ts';

// Creator exports
export { ApiGatewayRestComponentCreator } from './src/api-gateway-rest.creator.ts';
