/**
 * Context Hydrator Service - Single responsibility for environment resolution
 * Implements Principle 4: Single Responsibility Principle
 */
import { Logger } from '../platform/logger/src/index.ts';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as YAML from 'yaml';
import { ErrorMessages } from './error-message-utils.ts';
import { withPerformanceTiming } from './performance-metrics.ts';

export interface ContextHydratorDependencies {
  logger: Logger;
  manifestPath?: string; // Optional path to service.yml for relative resolution
}

/**
 * Pure service for context hydration and environment resolution
 * Responsibility: Stage 3 - Context Hydration (AC-P3.1, AC-P3.2, AC-P3.3)
 */
export class ContextHydrator {
  constructor(private dependencies: ContextHydratorDependencies) { }

  async hydrateContext(manifest: Record<string, any>, environment: string): Promise<Record<string, any>> {
    return withPerformanceTiming(
      'context-hydrator.hydrateContext',
      async () => {
        // Validate environment exists in manifest
        if (!manifest.environments || !manifest.environments[environment]) {
          const availableEnvs = manifest.environments ? Object.keys(manifest.environments) : [];
          const errorMessage = availableEnvs.length > 0
            ? `Environment "${environment}" not defined in manifest. Available environments: ${availableEnvs.join(', ')}`
            : `Environment "${environment}" not defined in manifest. No environments section found.`;
          throw new Error(errorMessage);
        }

        this.dependencies.logger.debug(`Hydrating context for environment: ${environment}`);

        // Deep clone the manifest to avoid mutations
        const hydrated = JSON.parse(JSON.stringify(manifest));

        // Set defaults for complianceFramework if not specified with warning
        if (!hydrated.complianceFramework) {
          hydrated.complianceFramework = 'commercial';
          this.dependencies.logger.warn(`No complianceFramework specified; defaulting to "commercial".`);
        }

        // Process $ref keywords in environments block first
        if (hydrated.environments) {
          await this.resolveEnvironmentReferences(hydrated);
        }

        // Process environment-specific values
        if (hydrated.environments && hydrated.environments[environment]) {
          const envDefaults = hydrated.environments[environment].defaults || {};

          // Apply environment interpolation throughout the manifest
          this.interpolateEnvironmentValues(hydrated, envDefaults, environment);
        }

        this.dependencies.logger.debug('Context hydration completed');
        this.dependencies.logger.info(`Context hydrated for environment: ${environment}`);
        return hydrated;
      },
      { environment, manifestPath: this.dependencies.manifestPath }
    );
  }

  private interpolateEnvironmentValues(obj: any, envDefaults: Record<string, any>, environment: string): void {
    if (typeof obj === 'string') {
      return; // Strings are processed by reference in parent object
    }

    if (Array.isArray(obj)) {
      obj.forEach(item => this.interpolateEnvironmentValues(item, envDefaults, environment));
      return;
    }

    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          // Process ${env:key} interpolation
          const envMatch = value.match(/\$\{env:([^}]+)\}/g);
          if (envMatch) {
            let interpolated = value;
            envMatch.forEach(match => {
              const envKey = match.slice(6, -1); // Remove ${env: and }
              if (envDefaults[envKey] !== undefined) {
                interpolated = interpolated.replace(match, String(envDefaults[envKey]));
              }
            });
            obj[key] = interpolated;
          }

          // Process ${envIs:env} boolean interpolation
          const envIsMatch = value.match(/\$\{envIs:([^}]+)\}/);
          if (envIsMatch) {
            const targetEnv = envIsMatch[1];
            obj[key] = environment === targetEnv;
          }
        } else if (value && typeof value === 'object') {
          // Handle per-environment maps
          const envValue = (value as Record<string, any>)[environment];
          if (envValue !== undefined) {
            obj[key] = envValue;
          } else {
            this.interpolateEnvironmentValues(value, envDefaults, environment);
          }
        }
      }
    }
  }

  /**
   * Resolves $ref keywords in the environments block
   * Supports both top-level and environment-specific references
   */
  private async resolveEnvironmentReferences(manifest: Record<string, any>): Promise<void> {
    const environments = manifest.environments;
    const resolvedRefs = new Set<string>(); // Track resolved references to prevent circular dependencies

    // Handle top-level $ref (Scenario A: Importing entire environments block)
    if (environments.$ref) {
      this.dependencies.logger.debug(`Resolving top-level environments $ref: ${environments.$ref}`);
      const referencedConfig = await this.loadReferencedFile(environments.$ref, resolvedRefs);

      // Replace entire environments block with referenced content
      manifest.environments = this.deepMerge({}, referencedConfig);
      return;
    }

    // Handle environment-specific $ref (Scenario B: Mixed inline and referenced configs)
    for (const [envName, envConfig] of Object.entries(environments)) {
      if (envConfig && typeof envConfig === 'object' && (envConfig as any).$ref) {
        this.dependencies.logger.debug(`Resolving environment-specific $ref for ${envName}: ${(envConfig as any).$ref}`);
        const referencedConfig = await this.loadReferencedFile((envConfig as any).$ref, resolvedRefs);

        // Replace specific environment with referenced content
        manifest.environments[envName] = this.deepMerge({}, referencedConfig);
      }
    }
  }

  /**
   * Loads and parses a referenced configuration file
   * Implements security constraints to prevent path traversal
   */
  private async loadReferencedFile(refPath: string, resolvedRefs: Set<string>): Promise<Record<string, any>> {
    // Security: Validate and normalize path to prevent traversal attacks
    const secureResolvedPath = this.resolveSecurePath(refPath);

    // Circular dependency detection
    if (resolvedRefs.has(secureResolvedPath)) {
      throw new Error(ErrorMessages.circularReference(refPath));
    }
    resolvedRefs.add(secureResolvedPath);

    try {
      this.dependencies.logger.debug(`Loading referenced file: ${secureResolvedPath}`);
      const fileContent = await fs.readFile(secureResolvedPath, 'utf8');

      // Parse based on file extension
      if (secureResolvedPath.endsWith('.json')) {
        return JSON.parse(fileContent);
      } else if (secureResolvedPath.endsWith('.yml') || secureResolvedPath.endsWith('.yaml')) {
        return YAML.parse(fileContent);
      } else {
        throw new Error(ErrorMessages.unsupportedFileFormat(refPath, ['.json', '.yml', '.yaml']));
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(ErrorMessages.fileNotFound(refPath, 'ContextHydrator'));
      }
      throw new Error(ErrorMessages.fileReadFailed(refPath, error.message));
    }
  }

  /**
   * Securely resolves a file path relative to the manifest location
   * Prevents path traversal attacks by constraining to service repository root
   */
  private resolveSecurePath(refPath: string): string {
    // Get the base directory (where service.yml is located)
    const manifestDir = this.dependencies.manifestPath
      ? path.dirname(this.dependencies.manifestPath)
      : process.cwd();

    // Resolve the reference path relative to manifest directory
    const resolvedPath = path.resolve(manifestDir, refPath);

    // Security check: Ensure resolved path is within the manifest directory tree
    const normalizedManifestDir = path.normalize(manifestDir);
    const normalizedResolvedPath = path.normalize(resolvedPath);

    if (!normalizedResolvedPath.startsWith(normalizedManifestDir + path.sep) &&
      normalizedResolvedPath !== normalizedManifestDir) {
      throw new Error(ErrorMessages.unauthorizedFileAccess(refPath));
    }

    return resolvedPath;
  }

  /**
   * Deep merge utility for combining configuration objects
   * Later objects override earlier ones, arrays are replaced entirely
   */
  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively merge objects
        result[key] = this.deepMerge(result[key] || {}, value);
      } else {
        // Replace primitives and arrays entirely
        result[key] = value;
      }
    }

    return result;
  }
}