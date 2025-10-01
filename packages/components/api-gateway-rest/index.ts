/**
 * @platform/api-gateway-rest - ApiGatewayRestComponent Component
 * Enterprise REST API Gateway Component implementing Component API Contract v1.0
 */

// Component exports
export { ApiGatewayRestComponent } from './src/api-gateway-rest.component.js';

// Configuration exports
export {
  ApiGatewayRestConfig,
  ApiGatewayRestConfigBuilder,
  API_GATEWAY_REST_CONFIG_SCHEMA,
} from './src/api-gateway-rest.builder.js';

// Creator exports
export { ApiGatewayRestComponentCreator } from './src/api-gateway-rest.creator.js';
