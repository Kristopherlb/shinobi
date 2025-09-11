"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiGatewayHttpConfigBuilder = exports.API_GATEWAY_HTTP_CONFIG_SCHEMA = exports.ApiGatewayHttpComponent = void 0;
var api_gateway_http_component_1 = require("./api-gateway-http.component");
Object.defineProperty(exports, "ApiGatewayHttpComponent", { enumerable: true, get: function () { return api_gateway_http_component_1.ApiGatewayHttpComponent; } });
Object.defineProperty(exports, "API_GATEWAY_HTTP_CONFIG_SCHEMA", { enumerable: true, get: function () { return api_gateway_http_component_1.API_GATEWAY_HTTP_CONFIG_SCHEMA; } });
Object.defineProperty(exports, "ApiGatewayHttpConfigBuilder", { enumerable: true, get: function () { return api_gateway_http_component_1.ApiGatewayHttpConfigBuilder; } });
