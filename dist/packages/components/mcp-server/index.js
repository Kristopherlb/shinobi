"use strict";
/**
 * @platform/mcp-server - McpServerComponent Component
 * MCP Server Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpServerComponentCreator = exports.MCP_SERVER_CONFIG_SCHEMA = exports.McpServerComponentConfigBuilder = exports.McpServerComponentComponent = void 0;
// Component exports
var mcp_server_component_1 = require("./mcp-server.component");
Object.defineProperty(exports, "McpServerComponentComponent", { enumerable: true, get: function () { return mcp_server_component_1.McpServerComponentComponent; } });
// Configuration exports
var mcp_server_builder_1 = require("./mcp-server.builder");
Object.defineProperty(exports, "McpServerComponentConfigBuilder", { enumerable: true, get: function () { return mcp_server_builder_1.McpServerComponentConfigBuilder; } });
Object.defineProperty(exports, "MCP_SERVER_CONFIG_SCHEMA", { enumerable: true, get: function () { return mcp_server_builder_1.MCP_SERVER_CONFIG_SCHEMA; } });
// Creator exports
var mcp_server_creator_1 = require("./mcp-server.creator");
Object.defineProperty(exports, "McpServerComponentCreator", { enumerable: true, get: function () { return mcp_server_creator_1.McpServerComponentCreator; } });
