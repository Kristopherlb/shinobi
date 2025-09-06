/**
 * Context Hydrator Service - Single responsibility for environment resolution
 * Implements Principle 4: Single Responsibility Principle
 */
import { Logger } from '../utils/logger';

export interface ContextHydratorDependencies {
  logger: Logger;
}

/**
 * Pure service for context hydration and environment resolution
 * Responsibility: Stage 3 - Context Hydration (AC-P3.1, AC-P3.2, AC-P3.3)
 */
export class ContextHydrator {
  constructor(private dependencies: ContextHydratorDependencies) {}

  async hydrateContext(manifest: Record<string, any>, environment: string): Promise<Record<string, any>> {
    this.dependencies.logger.debug(`Hydrating context for environment: ${environment}`);

    // Deep clone the manifest to avoid mutations
    const hydrated = JSON.parse(JSON.stringify(manifest));

    // Set defaults for complianceFramework if not specified
    if (!hydrated.complianceFramework) {
      hydrated.complianceFramework = 'commercial';
    }

    // Process environment-specific values
    if (hydrated.environments && hydrated.environments[environment]) {
      const envDefaults = hydrated.environments[environment].defaults || {};
      
      // Apply environment interpolation throughout the manifest
      this.interpolateEnvironmentValues(hydrated, envDefaults, environment);
    }

    this.dependencies.logger.debug('Context hydration completed');
    return hydrated;
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
}