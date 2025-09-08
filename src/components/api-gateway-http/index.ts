/**
 * @platform/api-gateway-http - AWS API Gateway v2 HTTP API Component
 * Modern HTTP API with enhanced performance and cost optimization:
 * - Up to 70% lower cost than REST API Gateway
 * - 60% lower latency for better performance
 * - Native JWT authentication and OIDC integration
 * - WebSocket support for real-time communication
 * - VPC Link support for private integrations
 * - Streamlined configuration for microservices
 * 
 * Use this for modern microservices, serverless APIs, and cost-sensitive applications.
 * For complex enterprise features, use api-gateway-rest instead.
 */

export { 
  ApiGatewayHttpComponent,
  API_GATEWAY_HTTP_CONFIG_SCHEMA,
  ApiGatewayHttpConfig,
  ApiGatewayHttpConfigBuilder
} from './api-gateway-http.component';