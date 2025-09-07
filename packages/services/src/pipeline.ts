import * as fs from 'fs/promises';
import * as YAML from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Logger } from '../utils/logger';
import { SchemaManager } from '../schemas/schema-manager';

export interface ValidationResult {
  manifest: any;
  warnings: string[];
}

export interface PlanResult {
  resolvedManifest: any;
  warnings: string[];
}

interface ValidationPipelineDependencies {
  schemaManager: SchemaManager;
  logger: Logger;
}

export class ValidationPipeline {
  private ajv: Ajv;

  constructor(private dependencies: ValidationPipelineDependencies) {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
  }

  /**
   * Stage 1-2: Parse and validate manifest (AC-P1.1, AC-P1.2, AC-P2.1, AC-P2.2, AC-P2.3)
   */
  async validate(manifestPath: string): Promise<ValidationResult> {
    this.dependencies.logger.debug('Starting validation pipeline');

    // Stage 1: Parsing (AC-P1.1, AC-P1.2)
    const manifest = await this.parseManifest(manifestPath);

    // Stage 2: Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)
    await this.validateSchema(manifest);

    const warnings: string[] = [];

    return {
      manifest,
      warnings
    };
  }

  /**
   * Full pipeline: Parse, validate, hydrate, and resolve references (all 4 stages)
   */
  async plan(manifestPath: string, environment: string): Promise<PlanResult> {
    this.dependencies.logger.debug('Starting full plan pipeline');

    // Stages 1-2: Parse and validate
    const validationResult = await this.validate(manifestPath);
    
    // Stage 3: Context Hydration (AC-P3.1, AC-P3.2, AC-P3.3) with $ref support
    const hydratedManifest = await this.hydrateContext(validationResult.manifest, environment, manifestPath);

    // Stage 4: Semantic & Reference Validation (AC-P4.1, AC-P4.2, AC-P4.3)
    await this.validateReferences(hydratedManifest);

    return {
      resolvedManifest: hydratedManifest,
      warnings: validationResult.warnings
    };
  }

  private async parseManifest(manifestPath: string): Promise<any> {
    this.dependencies.logger.debug(`Parsing manifest: ${manifestPath}`);

    try {
      const fileContent = await fs.readFile(manifestPath, 'utf8');
      const manifest = YAML.parse(fileContent);
      
      if (!manifest || typeof manifest !== 'object') {
        throw new Error('Invalid YAML: manifest must be an object');
      }

      this.dependencies.logger.debug('Manifest parsed successfully');
      return manifest;

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('YAML')) {
          throw new Error(`Invalid YAML syntax: ${error.message}`);
        }
        throw new Error(`Failed to read manifest: ${error.message}`);
      }
      throw error;
    }
  }

  private async validateSchema(manifest: any): Promise<void> {
    this.dependencies.logger.debug('Validating manifest schema');

    // Get the master schema (dynamically composed)
    const schema = await this.dependencies.schemaManager.getMasterSchema();
    
    const validate = this.ajv.compile(schema);
    const valid = validate(manifest);

    if (!valid) {
      const errors = validate.errors || [];
      const errorMessages = errors.map(error => {
        const path = error.instancePath || error.schemaPath || 'root';
        const message = error.message || 'validation failed';
        const data = error.data !== undefined ? ` (found: ${JSON.stringify(error.data)})` : '';
        return `  ${path}: ${message}${data}`;
      });

      const errorMsg = `Schema validation failed:\n${errorMessages.join('\n')}`;
      this.dependencies.logger.debug('Schema validation errors', errors);
      throw new Error(errorMsg);
    }

    // Validate required fields for AC-E1 (missing complianceFramework, etc.)
    const manifestObj = manifest as Record<string, any>;
    if (!manifestObj.service) {
      throw new Error('Missing required field: service');
    }

    if (!manifestObj.owner) {
      throw new Error('Missing required field: owner');
    }

    this.dependencies.logger.debug('Schema validation completed successfully');
  }

  private async hydrateContext(manifest: Record<string, any>, environment: string, manifestPath?: string): Promise<Record<string, any>> {
    this.dependencies.logger.debug(`Hydrating context for environment: ${environment}`);

    // Use dedicated ContextHydrator service for enhanced functionality
    const { ContextHydrator } = await import('../services/context-hydrator');
    const contextHydrator = new ContextHydrator({
      logger: this.dependencies.logger,
      manifestPath: manifestPath
    });

    return await contextHydrator.hydrateContext(manifest, environment);
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
          const envMatch = value.match(/\\$\\{env:([^}]+)\\}/g);
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
          const envIsMatch = value.match(/\\$\\{envIs:([^}]+)\\}/);
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

  private async validateReferences(manifest: any): Promise<void> {
    this.dependencies.logger.debug('Validating references and semantic rules');

    // Build component name index
    const componentNames = new Set<string>();
    if (manifest.components) {
      manifest.components.forEach((component: any) => {
        if (component.name) {
          componentNames.add(component.name);
        }
      });
    }

    // Validate binds references (AC-P4.2)
    if (manifest.components) {
      manifest.components.forEach((component: any, index: number) => {
        if (component.binds) {
          component.binds.forEach((bind: any, bindIndex: number) => {
            if (bind.to && !componentNames.has(bind.to)) {
              throw new Error(`Reference to non-existent component '${bind.to}' in components[${index}].binds[${bindIndex}]`);
            }
          });
        }
      });
    }

    // Validate governance suppressions (AC-P4.3)
    if (manifest.governance?.cdkNag?.suppress) {
      manifest.governance.cdkNag.suppress.forEach((suppression: any, index: number) => {
        const requiredFields = ['id', 'justification', 'owner', 'expiresOn'];
        requiredFields.forEach(field => {
          if (!suppression[field]) {
            throw new Error(`Missing required field '${field}' in governance.cdkNag.suppress[${index}]`);
          }
        });

        // Validate expiresOn format
        if (suppression.expiresOn && !isValidDate(suppression.expiresOn)) {
          throw new Error(`Invalid date format for expiresOn in governance.cdkNag.suppress[${index}]. Expected ISO date format.`);
        }
      });
    }

    this.dependencies.logger.debug('Reference validation completed');
  }
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}