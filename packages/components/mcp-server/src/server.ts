/**
 * MCP Server Entry Point
 * Loads configuration and starts the Express server
 */

import { startServer } from './app';

// Load configuration from environment variables
const config = {
  port: parseInt(process.env.PORT || '8080'),
  jwtSecret: process.env.JWT_SECRET || 'default-dev-secret-change-in-production',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || undefined,
  nodeEnv: process.env.NODE_ENV || 'development'
};

// Validate required configuration
if (!process.env.JWT_SECRET && config.nodeEnv === 'production') {
  console.error('❌ JWT_SECRET environment variable is required in production');
  process.exit(1);
}

// Start the server
console.log('🎯 Starting MCP Server...');
console.log('📋 Configuration:');
console.log(`   - Port: ${config.port}`);
console.log(`   - Environment: ${config.nodeEnv}`);
console.log(`   - CORS Origins: ${config.corsOrigins?.join(', ') || 'all'}`);

startServer(config);