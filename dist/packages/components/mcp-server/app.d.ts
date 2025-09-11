/**
 * Express Application for MCP Server
 * Main application entry point with middleware configuration
 */
import express from 'express';
export interface AppConfig {
    port: number;
    jwtSecret: string;
    corsOrigins?: string[];
    nodeEnv: string;
}
/**
 * Create and configure the Express application
 */
export declare function createApp(config: AppConfig): express.Application;
/**
 * Start the server with the provided configuration
 */
export declare function startServer(config: AppConfig): void;
