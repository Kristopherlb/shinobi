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

import * as path from 'path';
import * as fs from 'fs/promises';
import { ValidationOrchestrator, type PlanResult } from '@shinobi/core';
import { FileDiscovery } from './utils/file-discovery.js';
import { Logger } from './console-logger.js';
import { findRepoRoot } from './utils/repo-root.js';

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

  /**
   * Resolves and caches the execution context for the given manifest and environment.
   * Subsequent calls with the same inputs return the cached result.
   * 
   * The logger context is updated on every resolve to ensure consistency,
   * even when using cached results.
   * 
   * @param options - Options specifying manifest path and environment
   * @returns Resolved execution context with plan results
   */
  async resolve(options: ExecutionContextOptions = {}): Promise<ResolvedExecutionContext> {
    const manifestPath = await this.resolveManifestPath(options.manifestPath);
    const environment = options.environment ?? 'dev';
    const cacheKey = `${manifestPath}::${environment}`;

    // Check cache first
    if (this.cacheKey === cacheKey && this.cachedContext) {
      // Update logger context even on cache hit to ensure consistency
      this.updateLoggerContext(this.cachedContext);
      return this.cachedContext;
    }

    // Cache miss: compute new context
    const planResult = await this.dependencies.pipeline.plan(manifestPath, environment);

    const resolvedContext: ResolvedExecutionContext = {
      manifestPath,
      environment,
      planResult
    };

    // Update cache
    this.cacheKey = cacheKey;
    this.cachedContext = resolvedContext;

    // Update logger context with resolved values
    this.updateLoggerContext(resolvedContext);

    return resolvedContext;
  }

  /**
   * Clears the cached context. Useful for testing or when manifest changes.
   */
  reset(): void {
    this.cacheKey = undefined;
    this.cachedContext = undefined;
  }

  /**
   * Resolves manifest path to an absolute, normalized path.
   * Ensures cache keys are stable regardless of input form (relative vs absolute).
   * 
   * Uses the same path resolution logic as validate-command:
   * 1. Try resolving from current working directory first
   * 2. Try resolving as absolute path
   * 3. Try resolving from repo root (handles relative paths from workspace root)
   */
  private async resolveManifestPath(explicitPath?: string): Promise<string> {
    let pathToResolve: string;

    if (explicitPath) {
      // Try resolving from current working directory first
      const cwdPath = path.resolve(process.cwd(), explicitPath);
      try {
        await fs.access(cwdPath);
        pathToResolve = cwdPath;
      } catch {
        // Try resolving as absolute path
        if (path.isAbsolute(explicitPath)) {
          pathToResolve = explicitPath;
        } else {
          // Try resolving from repo root (same logic as validate-command)
          const repoRoot = await findRepoRoot(process.cwd());
          const repoPath = path.resolve(repoRoot, explicitPath);
          try {
            await fs.access(repoPath);
            pathToResolve = repoPath;
          } catch {
            // Will fail with proper error in pipeline
            pathToResolve = path.resolve(process.cwd(), explicitPath);
          }
        }
      }
    } else {
      const discovered = await this.dependencies.fileDiscovery.findManifest('.');
      if (!discovered) {
        throw new Error('No service.yml found in this directory or any parent directories.');
      }
      pathToResolve = discovered;
    }

    // Normalize to absolute path for stable cache keys
    return path.isAbsolute(pathToResolve) ? pathToResolve : path.resolve(pathToResolve);
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
