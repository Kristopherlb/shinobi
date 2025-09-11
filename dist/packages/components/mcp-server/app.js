"use strict";
/**
 * Express Application for MCP Server
 * Main application entry point with middleware configuration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const router_1 = require("./api/router");
/**
 * Create and configure the Express application
 */
function createApp(config) {
    const app = (0, express_1.default)();
    // CORS configuration
    app.use((0, cors_1.default)({
        origin: config.corsOrigins || ['*'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
    // Request parsing middleware
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // Request logging in development
    if (config.nodeEnv === 'development') {
        app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
            next();
        });
    }
    // Health check endpoint (unauthenticated)
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'mcp-server',
            version: '1.0.0',
            environment: config.nodeEnv
        });
    });
    // API routes
    const apiRouter = (0, router_1.createApiRouter)({
        jwtSecret: config.jwtSecret,
        corsOrigins: config.corsOrigins
    });
    app.use('/api/v1', apiRouter);
    // 404 handler
    app.use('*', (req, res) => {
        res.status(404).json({
            error: 'Not Found',
            message: `Route ${req.method} ${req.originalUrl} not found`,
            availableEndpoints: [
                'GET /health',
                'GET /api/v1/platform/components',
                'GET /api/v1/services',
                'POST /api/v1/platform/generate/component',
                'GET /api/v1/admin/health'
            ]
        });
    });
    // Global error handler
    app.use((error, req, res, next) => {
        console.error('Global error handler:', error);
        res.status(error.status || 500).json({
            error: error.name || 'Internal Server Error',
            message: error.message || 'An unexpected error occurred',
            timestamp: new Date().toISOString(),
            path: req.path
        });
    });
    return app;
}
/**
 * Start the server with the provided configuration
 */
function startServer(config) {
    const app = createApp(config);
    const server = app.listen(config.port, '0.0.0.0', () => {
        console.log(`🚀 MCP Server listening on port ${config.port}`);
        console.log(`📚 Environment: ${config.nodeEnv}`);
        console.log(`🔗 Health check: http://localhost:${config.port}/health`);
        console.log(`📖 API endpoints: http://localhost:${config.port}/api/v1`);
    });
    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('📤 SIGTERM received, shutting down gracefully');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    });
    process.on('SIGINT', () => {
        console.log('📤 SIGINT received, shutting down gracefully');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    });
}
