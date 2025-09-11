/**
 * Main API Router for MCP Server
 * Implements the complete MCP Server Specification v1.0 API endpoints
 */
import express from 'express';
export interface McpServerConfig {
    jwtSecret: string;
    corsOrigins?: string[];
    rateLimiting?: {
        windowMs: number;
        maxRequests: number;
    };
}
/**
 * Create the main API router with all endpoints
 */
export declare function createApiRouter(config: McpServerConfig): express.Router;
