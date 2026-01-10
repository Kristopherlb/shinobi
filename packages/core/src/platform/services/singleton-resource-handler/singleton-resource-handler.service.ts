/**
 * Singleton Resource Handler Service
 * 
 * Post-processes synthesized CloudFormation templates to handle singleton AWS resources.
 * 
 * Some AWS resources are singletons per account/region (e.g., AWS::ApiGateway::Account).
 * If these resources already exist, CDK attempts to create new ones, causing Early
 * Validation failures. This service handles these cases by removing singleton resources
 * from templates when they already exist.
 * 
 * This service follows the Single Responsibility Principle - it only handles singleton
 * resource post-processing, delegating to specific handlers for each resource type.
 */

import * as fsp from 'fs/promises';
import type { Logger } from '../../logger/src/index.js';
import { ApiGatewayAccountHandler, type PostProcessResult } from './api-gateway-account-handler.js';

// Find workspace root by walking up from current directory
async function findWorkspaceRoot(startDir: string): Promise<string | null> {
  const path = await import('path');
  const fsp = await import('fs/promises');
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  
  const markerFiles = ['pnpm-workspace.yaml', 'pnpm-workspace.yml', 'nx.json', 'turbo.json', 'rush.json'];
  
  while (current !== root) {
    for (const marker of markerFiles) {
      try {
        const markerPath = path.join(current, marker);
        await fsp.access(markerPath);
        return current;
      } catch {
        // Continue checking
      }
    }
    
    // Check package.json for workspaces field
    try {
      const packageJsonPath = path.join(current, 'package.json');
      const packageJsonContent = await fsp.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      if (packageJson.workspaces) {
        return current;
      }
    } catch {
      // Continue
    }
    
    current = path.dirname(current);
  }
  
  return null;
}

// Get debug log path dynamically
async function getDebugLogPath(): Promise<string | null> {
  try {
    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (workspaceRoot) {
      const path = await import('path');
      return path.join(workspaceRoot, '.cursor', 'debug.log');
    }
    return null;
  } catch {
    return null;
  }
}
const DEBUG_SERVER = 'http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42';

// Safe logging function that tries both fetch and file write
async function debugLog(location: string, message: string, data: any, hypothesisId: string): Promise<void> {
  const payload = {
    location,
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId
  };
  
  // Try fetch first (non-blocking)
  if (typeof fetch !== 'undefined') {
    fetch(DEBUG_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }
  
  // Also write directly to file (fallback)
  try {
    const debugLogPath = await getDebugLogPath();
    if (debugLogPath) {
      await fsp.appendFile(debugLogPath, JSON.stringify(payload) + '\n', 'utf8');
    }
  } catch {
    // Ignore file write errors
  }
}

export interface SingletonResourceHandlerServiceDependencies {
  logger: Logger;
}

export interface PostProcessTemplateOptions {
  assemblyDir: string;
  stackId: string;
  templateFileName: string;
  region: string;
}

export class SingletonResourceHandlerService {
  private apiGatewayAccountHandler: ApiGatewayAccountHandler;

  constructor(private dependencies: SingletonResourceHandlerServiceDependencies) {
    this.apiGatewayAccountHandler = new ApiGatewayAccountHandler({
      logger: dependencies.logger
    });
  }

  /**
   * Post-process synthesized CloudFormation template to handle singleton resources
   * 
   * @param options - Post-processing options
   * @returns Result indicating if template/manifest were modified
   */
  async postProcessTemplate(
    options: PostProcessTemplateOptions
  ): Promise<PostProcessResult> {
    const { assemblyDir, stackId, templateFileName, region } = options;
    // #region agent log
    await debugLog('singleton-resource-handler.service.ts:44', 'postProcessTemplate entry', { assemblyDir, stackId, templateFileName, region }, 'E');
    // #endregion

    this.dependencies.logger.debug(
      `Post-processing template for singleton resources: ${stackId}`
    );

    // Handle ApiGateway Account singleton
    // #region agent log
    await debugLog('singleton-resource-handler.service.ts:54', 'Before apiGatewayAccountHandler.postProcess', { assemblyDir, stackId, templateFileName, region }, 'E');
    // #endregion
    const apiGatewayResult = await this.apiGatewayAccountHandler.postProcess(
      assemblyDir,
      stackId,
      templateFileName,
      region
    );
    // #region agent log
    await debugLog('singleton-resource-handler.service.ts:60', 'After apiGatewayAccountHandler.postProcess', { templateModified: apiGatewayResult.templateModified, manifestModified: apiGatewayResult.manifestModified }, 'E');
    // #endregion

    // Future: Add other singleton resource handlers here
    // e.g., S3 Bucket Notification Config, etc.

    return {
      templateModified: apiGatewayResult.templateModified,
      manifestModified: apiGatewayResult.manifestModified
    };
  }
}

