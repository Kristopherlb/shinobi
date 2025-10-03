/**
 * Configuration Loader Utility - Principle 6: Separate Data from Logic
 * Implements Principle 7: Clear Class Roles - This is a "Stateless Utility"
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import * as YAML from 'yaml';
import { ErrorMessages } from './error-message-utils.ts';
import { withPerformanceTiming } from './performance-metrics.ts';
import { Logger } from '../platform/logger/src/index.ts';

export interface TemplateConfig {
  templates: {
    service_base: string;
    lambda_api_with_db: string;
    worker_with_queue: string;
    empty_service: string;
  };
  source_files: {
    api_lambda: string;
    worker_lambda: string;
    basic_handler: string;
  };
  gitignore_template: string;
  patches_stub: string;
}

const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  templates: {
    service_base: `service: {{ serviceName }}
owner: {{ owner }}
runtime: nodejs20
complianceFramework: {{ complianceFramework }}
{{#isFedRAMP}}
classification: controlled
    auditLevel: detailed
{{/isFedRAMP}}
{{#isHighSecurity}}
backupRetentionDays: 35
{{/isHighSecurity}}
components:
`,
    lambda_api_with_db: `  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /health
          handler: src/api.getHealth
  - name: database
    type: rds-postgres
    config:
      backupRetentionDays: {{#isHighSecurity}}35{{/isHighSecurity}}{{^isHighSecurity}}14{{/isHighSecurity}}
`,
    worker_with_queue: `  - name: worker
    type: lambda-worker
    config:
      queueName: {{ serviceName }}-queue
  - name: queue
    type: sqs-queue
    config:
      visibilityTimeout: 30
`,
    empty_service: ` []
`
  },
  source_files: {
    api_lambda: `import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const getHealth: APIGatewayProxyHandlerV2 = async () => ({
  statusCode: 200,
  body: JSON.stringify({ status: 'ok' })
});
`,
    worker_lambda: `import type { SQSEvent } from 'aws-lambda';

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    console.log('Processing message', record.messageId);
  }
};
`,
    basic_handler: `export const handler = async (): Promise<{ statusCode: number; body: string }> => ({
  statusCode: 200,
  body: JSON.stringify({ status: 'ok' })
});
`
  },
  gitignore_template: `node_modules/\ndist/\n.env\n`,
  patches_stub: `/**
 * Platform Patches File
 * Custom CDK modifications for this service
 */
import { Construct } from 'constructs';

export function applyPatches(scope: Construct): void {
  // Add custom infrastructure adjustments here
  console.log('Applying platform patches');
}

export const patchInfo = {
  version: '1.0.0',
  description: 'Custom platform patches',
  author: 'platform-team',
  appliedAt: new Date().toISOString()
};
`
};

/**
 * Pure utility for loading externalized configuration
 * Role: Stateless Utility - No dependencies, only static behavior
 */
export class ConfigLoader {
  private static _templateConfig: TemplateConfig | null = null;
  private static logger = Logger.getLogger('config-loader');
  private static moduleDir = typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

  /**
   * Load template configuration from external YAML file
   * Implements caching to avoid repeated file I/O
   * Supports environment variable override for config path
   */
  static async getTemplateConfig(): Promise<TemplateConfig> {
    if (this._templateConfig) {
      return this._templateConfig;
    }

    return withPerformanceTiming(
      'config-loader.getTemplateConfig',
      async () => {
        // Support environment variable override for config path
        const configPath = process.env.TEMPLATE_CONFIG_PATH ||
          path.join(this.moduleDir, '../../config/templates.yaml');

        // Validate path security to prevent directory traversal
        this.validatePathSecurity(configPath);

        try {
          const configContent = await fs.readFile(configPath, 'utf8');
          this._templateConfig = YAML.parse(configContent) as TemplateConfig;

          // Add info-level logging for successful config load
          this.logger.info(`Template configuration loaded from ${configPath}`);
          return this._templateConfig;
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code === 'ENOENT' && !process.env.TEMPLATE_CONFIG_PATH) {
            this.logger.warn(`Template configuration not found at ${configPath}; using default inline templates.`);
            this._templateConfig = DEFAULT_TEMPLATE_CONFIG;
            return this._templateConfig;
          }

          throw new Error(ErrorMessages.configLoadFailed(configPath, error instanceof Error ? error.message : String(error)));
        }
      },
      { configPath: process.env.TEMPLATE_CONFIG_PATH || 'default' }
    );
  }

  /**
   * Validate that the config path is secure and doesn't attempt directory traversal
   * @param configPath The path to validate
   * @throws Error if path is insecure
   */
  private static validatePathSecurity(configPath: string): void {
    const normalizedPath = path.normalize(configPath);
    const resolvedPath = path.resolve(normalizedPath);

    // Check for directory traversal attempts
    if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
      throw new Error(ErrorMessages.pathTraversalAttempt(configPath, 'ConfigLoader'));
    }

    // Ensure path is within expected directory structure
    const expectedBaseDir = path.resolve(this.moduleDir, '../../config');
    if (!resolvedPath.startsWith(expectedBaseDir) && !process.env.TEMPLATE_CONFIG_PATH) {
      throw new Error(ErrorMessages.systemDirectoryAccess(configPath, 'ConfigLoader'));
    }
  }

  /**
   * Reset cached configuration (useful for testing)
   */
  static resetCache(): void {
    this._templateConfig = null;
  }
}
