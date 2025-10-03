import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import * as YAML from 'yaml';
import { ErrorMessages } from './error-message-utils.js';
import { withPerformanceTiming } from './performance-metrics.js';
import { Logger } from '../platform/logger/src/index.js';

const moduleDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_TEMPLATE_CONFIG = {
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

export class ConfigLoader {
  static _templateConfig = null;
  static logger = Logger.getLogger('config-loader');

  static async getTemplateConfig() {
    if (this._templateConfig) {
      return this._templateConfig;
    }

    return withPerformanceTiming('config-loader.getTemplateConfig', async () => {
      const configPath = process.env.TEMPLATE_CONFIG_PATH ||
        path.join(moduleDir, '../../config/templates.yaml');

      this.validatePathSecurity(configPath);

      try {
        const configContent = await fs.readFile(configPath, 'utf8');
        this._templateConfig = YAML.parse(configContent);
        this.logger.info(`Template configuration loaded from ${configPath}`);
        return this._templateConfig;
      } catch (error) {
        if (error && typeof error === 'object' && error.code === 'ENOENT' && !process.env.TEMPLATE_CONFIG_PATH) {
          this.logger.warn(`Template configuration not found at ${configPath}; using default inline templates.`);
          this._templateConfig = DEFAULT_TEMPLATE_CONFIG;
          return this._templateConfig;
        }

        throw new Error(ErrorMessages.configLoadFailed(configPath, error instanceof Error ? error.message : String(error)));
      }
    }, { configPath: process.env.TEMPLATE_CONFIG_PATH || 'default' });
  }

  static validatePathSecurity(configPath) {
    const normalizedPath = path.normalize(configPath);
    const resolvedPath = path.resolve(normalizedPath);

    if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
      throw new Error(ErrorMessages.pathTraversalAttempt(configPath, 'ConfigLoader'));
    }

    const expectedBaseDir = path.resolve(moduleDir, '../../config');
    if (!resolvedPath.startsWith(expectedBaseDir) && !process.env.TEMPLATE_CONFIG_PATH) {
      throw new Error(ErrorMessages.systemDirectoryAccess(configPath, 'ConfigLoader'));
    }
  }

  static resetCache() {
    this._templateConfig = null;
  }
}
