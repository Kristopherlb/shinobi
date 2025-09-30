#!/usr/bin/env node

/**
 * Shinobi MCP Server Entry Point
 * 
 * This is the main entry point for the Shinobi MCP Server that provides
 * platform intelligence capabilities through MCP protocol.
 */

import { ShinobiMcpServer } from './shinobi-server.js';
import { ShinobiConfig } from '@platform/shinobi';
import { Logger } from '@shinobi/core';
import { LogLevel } from '@shinobi/core';

/**
 * Main function to start the Shinobi MCP Server
 */
async function main(): Promise<void> {
  const logger = new Logger(LogLevel.INFO);

  try {
    // Load configuration from environment or use defaults
    const config: ShinobiConfig = loadConfigFromEnvironment();

    // Create and start the MCP server
    const server = new ShinobiMcpServer(config);
    await server.start();

    logger.info('Shinobi MCP Server started successfully', {
      service: 'shinobi-mcp-server',
      version: config.api?.version || '1.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Failed to start Shinobi MCP Server', {
      service: 'shinobi-mcp-server',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnvironment(): ShinobiConfig {
  return {
    compute: {
      mode: (process.env.SHINOBI_COMPUTE_MODE as 'ecs') || 'ecs',
      cpu: parseInt(process.env.SHINOBI_CPU || '512'),
      memory: parseInt(process.env.SHINOBI_MEMORY || '1024'),
      taskCount: parseInt(process.env.SHINOBI_TASK_COUNT || '1'),
      containerPort: parseInt(process.env.SHINOBI_CONTAINER_PORT || '3000')
    },
    dataStore: {
      type: (process.env.SHINOBI_DATA_STORE_TYPE as 'dynamodb') || 'dynamodb',
      dynamodb: {
        billingMode: (process.env.SHINOBI_DYNAMODB_BILLING_MODE as 'PAY_PER_REQUEST' | 'PROVISIONED') || 'PAY_PER_REQUEST',
        readCapacity: process.env.SHINOBI_DYNAMODB_READ_CAPACITY ? parseInt(process.env.SHINOBI_DYNAMODB_READ_CAPACITY) : undefined,
        writeCapacity: process.env.SHINOBI_DYNAMODB_WRITE_CAPACITY ? parseInt(process.env.SHINOBI_DYNAMODB_WRITE_CAPACITY) : undefined
      }
    },
    api: {
      exposure: (process.env.SHINOBI_API_EXPOSURE as 'internal' | 'public') || 'internal',
      loadBalancer: {
        enabled: process.env.SHINOBI_LOAD_BALANCER_ENABLED !== 'false',
        certificateArn: process.env.SHINOBI_CERTIFICATE_ARN,
        domainName: process.env.SHINOBI_DOMAIN_NAME
      },
      version: process.env.SHINOBI_API_VERSION || '1.0',
      rateLimit: {
        requestsPerMinute: parseInt(process.env.SHINOBI_RATE_LIMIT_RPM || '1000'),
        burstCapacity: parseInt(process.env.SHINOBI_RATE_LIMIT_BURST || '2000')
      }
    },
    featureFlags: {
      enabled: process.env.SHINOBI_FEATURE_FLAGS_ENABLED !== 'false',
      provider: (process.env.SHINOBI_FEATURE_FLAGS_PROVIDER as 'aws-appconfig' | 'launchdarkly' | 'flagsmith') || 'aws-appconfig',
      defaults: process.env.SHINOBI_FEATURE_FLAGS_DEFAULTS ? JSON.parse(process.env.SHINOBI_FEATURE_FLAGS_DEFAULTS) : {}
    },
    dataSources: {
      components: process.env.SHINOBI_DATA_SOURCES_COMPONENTS !== 'false',
      services: process.env.SHINOBI_DATA_SOURCES_SERVICES !== 'false',
      dependencies: process.env.SHINOBI_DATA_SOURCES_DEPENDENCIES !== 'false',
      compliance: process.env.SHINOBI_DATA_SOURCES_COMPLIANCE !== 'false',
      cost: process.env.SHINOBI_DATA_SOURCES_COST === 'true',
      security: process.env.SHINOBI_DATA_SOURCES_SECURITY === 'true',
      performance: process.env.SHINOBI_DATA_SOURCES_PERFORMANCE === 'true'
    },
    observability: {
      provider: (process.env.SHINOBI_OBSERVABILITY_PROVIDER as 'newrelic' | 'grafana' | 'datadog' | 'cloudwatch') || 'cloudwatch',
      dashboards: process.env.SHINOBI_DASHBOARDS ? process.env.SHINOBI_DASHBOARDS.split(',') : ['reliability', 'performance'],
      alerts: {
        enabled: process.env.SHINOBI_ALERTS_ENABLED !== 'false',
        thresholds: {
          cpuUtilization: parseInt(process.env.SHINOBI_ALERT_CPU_THRESHOLD || '80'),
          memoryUtilization: parseInt(process.env.SHINOBI_ALERT_MEMORY_THRESHOLD || '80'),
          responseTime: parseFloat(process.env.SHINOBI_ALERT_RESPONSE_TIME_THRESHOLD || '2')
        }
      }
    },
    compliance: {
      framework: (process.env.SHINOBI_COMPLIANCE_FRAMEWORK as 'commercial' | 'fedramp-moderate' | 'fedramp-high') || 'commercial',
      securityLevel: (process.env.SHINOBI_SECURITY_LEVEL as 'standard' | 'enhanced' | 'maximum') || 'standard',
      auditLogging: process.env.SHINOBI_AUDIT_LOGGING === 'true'
    },
    localDev: {
      enabled: process.env.SHINOBI_LOCAL_DEV_ENABLED === 'true',
      seedData: {
        sampleComponents: process.env.SHINOBI_SEED_COMPONENTS !== 'false',
        sampleServices: process.env.SHINOBI_SEED_SERVICES !== 'false',
        sampleMetrics: process.env.SHINOBI_SEED_METRICS !== 'false'
      },
      mockServices: process.env.SHINOBI_MOCK_SERVICES !== 'false'
    },
    vpc: {
      vpcId: process.env.SHINOBI_VPC_ID
    },
    logging: {
      retentionDays: parseInt(process.env.SHINOBI_LOG_RETENTION_DAYS || '30'),
      logLevel: (process.env.SHINOBI_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
      structuredLogging: process.env.SHINOBI_STRUCTURED_LOGGING !== 'false'
    },
    tags: process.env.SHINOBI_TAGS ? JSON.parse(process.env.SHINOBI_TAGS) : {}
  };
}

// Handle graceful shutdown
const logger = new Logger();

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...', {
    service: 'shinobi-mcp-server',
    signal: 'SIGINT'
  });
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...', {
    service: 'shinobi-mcp-server',
    signal: 'SIGTERM'
  });
  process.exit(0);
});

// Start the server
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error', {
      service: 'shinobi-mcp-server',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  });
}

export { ShinobiMcpServer };
export { main as startShinobiServer };
export * from './types.js';
