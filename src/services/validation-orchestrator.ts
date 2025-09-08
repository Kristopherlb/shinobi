/**
 * Validation Orchestrator - Command pattern implementation
 * Implements Principle 7: Clear Class Roles - This is a "Service/Manager" for orchestration
 */
import { Logger } from '../utils/logger';
import { ManifestParser } from './manifest-parser';
import { SchemaValidator } from './schema-validator';
import { ContextHydrator } from './context-hydrator';
import { ReferenceValidator } from './reference-validator';

export interface ValidationResult {
  manifest: any;
  warnings: string[];
}

export interface PlanResult {
  resolvedManifest: any;
  warnings: string[];
}

export interface ValidationOrchestratorDependencies {
  logger: Logger;
  manifestParser: ManifestParser;
  schemaValidator: SchemaValidator;
  contextHydrator: ContextHydrator;
  referenceValidator: ReferenceValidator;
}

/**
 * Orchestrates the 4-stage validation pipeline using injected services
 * Role: Service/Manager - Coordinates other services to accomplish complex task
 */
export class ValidationOrchestrator {
  constructor(private dependencies: ValidationOrchestratorDependencies) {}

  /**
   * Stage 1-2: Parse and validate manifest (AC-P1.1, AC-P1.2, AC-P2.1, AC-P2.2, AC-P2.3)
   */
  async validate(manifestPath: string): Promise<ValidationResult> {
    this.dependencies.logger.debug('Starting validation pipeline orchestration');

    // Stage 1: Parsing (AC-P1.1, AC-P1.2)
    const manifest = await this.dependencies.manifestParser.parseManifest(manifestPath);

    // Stage 2: Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)
    await this.dependencies.schemaValidator.validateSchema(manifest);

    const warnings: string[] = [];

    this.dependencies.logger.debug('Validation orchestration completed');
    return {
      manifest,
      warnings
    };
  }

  /**
   * Full pipeline: Parse, validate, hydrate, and resolve references (all 4 stages)
   */
  async plan(manifestPath: string, environment: string): Promise<PlanResult> {
    this.dependencies.logger.debug('Starting full plan pipeline orchestration');

    // Stages 1-2: Parse and validate
    const validationResult = await this.validate(manifestPath);
    
    // Stage 3: Context Hydration (AC-P3.1, AC-P3.2, AC-P3.3)
    const hydratedManifest = await this.dependencies.contextHydrator.hydrateContext(
      validationResult.manifest, 
      environment
    );

    // Stage 4: Semantic & Reference Validation (AC-P4.1, AC-P4.2, AC-P4.3)
    await this.dependencies.referenceValidator.validateReferences(hydratedManifest);

    this.dependencies.logger.debug('Plan orchestration completed');
    return {
      resolvedManifest: hydratedManifest,
      warnings: validationResult.warnings
    };
  }
}