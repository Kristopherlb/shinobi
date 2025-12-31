/**
 * Execution Context Manager
 *
 * Manages the execution context for CLI commands by resolving and caching
 * the resolved manifest and plan results. This service:
 *
 * - Discovers and resolves manifest file paths
 * - Executes the validation pipeline to generate plan results
 * - Caches resolved contexts to avoid redundant processing
 * - Provides a consistent interface for commands that need execution context
 *
 * The execution context includes the fully resolved manifest with all
 * environment-specific values applied, making it suitable for commands that
 * need to operate on the final, resolved configuration.
 *
 * This service implements caching to improve performance when multiple
 * commands need the same execution context (e.g., plan followed by synth).
 */

import { ValidationOrchestrator, type PlanResult } from '@shinobi/core';
import { FileDiscovery } from './utils/file-discovery.js';
import { Logger } from './console-logger.js';

export interface ExecutionContextOptions {
  manifestPath?: string;
  environment?: string;
}

export interface ResolvedExecutionContext {
  manifestPath: string;
  environment: string;
  planResult: PlanResult;
}

interface ExecutionContextDependencies {
  logger: Logger;
  pipeline: ValidationOrchestrator;
  fileDiscovery: FileDiscovery;
}

export class ExecutionContextManager {
  private cacheKey?: string;
  private cachedContext?: ResolvedExecutionContext;

  constructor(private readonly dependencies: ExecutionContextDependencies) {}

  async resolve(options: ExecutionContextOptions = {}): Promise<ResolvedExecutionContext> {
    const manifestPath = await this.resolveManifestPath(options.manifestPath);
    const environment = options.environment ?? 'dev';
    const cacheKey = `${manifestPath}::${environment}`;

    if (this.cacheKey === cacheKey && this.cachedContext) {
      return this.cachedContext;
    }

    const planResult = await this.dependencies.pipeline.plan(manifestPath, environment);

    const resolvedContext: ResolvedExecutionContext = {
      manifestPath,
      environment,
      planResult
    };

    this.cacheKey = cacheKey;
    this.cachedContext = resolvedContext;

    this.updateLoggerContext(resolvedContext);

    return resolvedContext;
  }

  reset(): void {
    this.cacheKey = undefined;
    this.cachedContext = undefined;
  }

  private async resolveManifestPath(explicitPath?: string): Promise<string> {
    if (explicitPath) {
      return explicitPath;
    }

    const discovered = await this.dependencies.fileDiscovery.findManifest('.');
    if (!discovered) {
      throw new Error('No service.yml found in this directory or any parent directories.');
    }

    return discovered;
  }

  private updateLoggerContext(context: ResolvedExecutionContext): void {
    const { planResult, environment } = context;
    const resolvedManifest = planResult.resolvedManifest ?? {};

    const serviceName = resolvedManifest.service ?? this.dependencies.logger.getCurrentConfig().serviceName;
    const complianceFramework = resolvedManifest.complianceFramework ?? this.dependencies.logger.getCurrentConfig().compliance ?? 'unknown';

    this.dependencies.logger.updateContext({
      serviceName,
      compliance: complianceFramework,
      environment
    });
  }
}
