"use strict";
/**
 * @platform/api-gateway-rest - ApiGatewayRestComponent Component
 * Enterprise REST API Gateway Component implementing Component API Contract v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiGatewayRestComponentCreator = exports.API_GATEWAY_REST_CONFIG_SCHEMA = exports.ApiGatewayRestComponentConfigBuilder = exports.ApiGatewayRestComponentComponent = void 0;
// Component exports
var api_gateway_rest_component_1 = require("./api-gateway-rest.component");
Object.defineProperty(exports, "ApiGatewayRestComponentComponent", { enumerable: true, get: function () { return api_gateway_rest_component_1.ApiGatewayRestComponentComponent; } });
// Configuration exports
var api_gateway_rest_builder_1 = require("./api-gateway-rest.builder");
Object.defineProperty(exports, "ApiGatewayRestComponentConfigBuilder", { enumerable: true, get: function () { return api_gateway_rest_builder_1.ApiGatewayRestComponentConfigBuilder; } });
Object.defineProperty(exports, "API_GATEWAY_REST_CONFIG_SCHEMA", { enumerable: true, get: function () { return api_gateway_rest_builder_1.API_GATEWAY_REST_CONFIG_SCHEMA; } });
// Creator exports
var api_gateway_rest_creator_1 = require("./api-gateway-rest.creator");
Object.defineProperty(exports, "ApiGatewayRestComponentCreator", { enumerable: true, get: function () { return api_gateway_rest_creator_1.ApiGatewayRestComponentCreator; } });
