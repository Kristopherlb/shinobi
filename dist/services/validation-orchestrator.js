"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationOrchestrator = void 0;
/**
 * Orchestrates the 4-stage validation pipeline using injected services
 * Role: Service/Manager - Coordinates other services to accomplish complex task
 */
class ValidationOrchestrator {
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    /**
     * Stage 1-2: Parse and validate manifest (AC-P1.1, AC-P1.2, AC-P2.1, AC-P2.2, AC-P2.3)
     */
    async validate(manifestPath) {
        this.dependencies.logger.debug('Starting validation pipeline orchestration');
        // Stage 1: Parsing (AC-P1.1, AC-P1.2)
        const manifest = await this.dependencies.manifestParser.parseManifest(manifestPath);
        // Stage 2: Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)
        await this.dependencies.schemaValidator.validateSchema(manifest);
        const warnings = [];
        this.dependencies.logger.debug('Validation orchestration completed');
        return {
            manifest,
            warnings
        };
    }
    /**
     * Full pipeline: Parse, validate, hydrate, and resolve references (all 4 stages)
     */
    async plan(manifestPath, environment) {
        this.dependencies.logger.debug('Starting full plan pipeline orchestration');
        // Stages 1-2: Parse and validate
        const validationResult = await this.validate(manifestPath);
        // Stage 3: Context Hydration (AC-P3.1, AC-P3.2, AC-P3.3)
        const hydratedManifest = await this.dependencies.contextHydrator.hydrateContext(validationResult.manifest, environment);
        // Stage 4: Semantic & Reference Validation (AC-P4.1, AC-P4.2, AC-P4.3)
        await this.dependencies.referenceValidator.validateReferences(hydratedManifest);
        this.dependencies.logger.debug('Plan orchestration completed');
        return {
            resolvedManifest: hydratedManifest,
            warnings: validationResult.warnings
        };
    }
}
exports.ValidationOrchestrator = ValidationOrchestrator;
