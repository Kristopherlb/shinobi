/**
 * Enterprise REST API Gateway Component - Entry Point
 * 
 * AWS API Gateway v1 (REST API) for enterprise use cases with advanced features:
 * - Cognito User Pool authentication with scopes  
 * - Request/response transformation and validation
 * - API key management and throttling
 * - WAF integration and enterprise security
 * - Full feature set with caching and SDK generation
 * 
 * Use this for complex enterprise APIs requiring advanced authentication and transformation.
 * For simple, high-performance APIs, use api-gateway-http instead.
 */

export {
  ApiGatewayRestComponent,
  ApiGatewayRestConfig,
  ApiGatewayRestConfigBuilder,
  API_GATEWAY_REST_CONFIG_SCHEMA
} from './api-gateway-rest.component';