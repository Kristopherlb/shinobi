/**
 * Validation Orchestrator - Command pattern implementation
 * Implements Principle 7: Clear Class Roles - This is a "Service/Manager" for orchestration
 */
import { Logger } from '../platform/logger/src/index.ts';
import { ManifestParser } from './manifest-parser.ts';
import { SchemaValidator } from './schema-validator.ts';
import { ContextHydrator } from './context-hydrator.ts';
import { ReferenceValidator } from './reference-validator.ts';
export interface ValidationOrchestratorResult {
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
export declare class ValidationOrchestrator {
    private dependencies;
    constructor(dependencies: ValidationOrchestratorDependencies);
    /**
     * Stage 1-2: Parse and validate manifest (AC-P1.1, AC-P1.2, AC-P2.1, AC-P2.2, AC-P2.3)
     */
    validate(manifestPath: string): Promise<ValidationOrchestratorResult>;
    /**
     * Full pipeline: Parse, validate, hydrate, and resolve references (all 4 stages)
     */
    plan(manifestPath: string, environment: string): Promise<PlanResult>;
}
//# sourceMappingURL=validation-orchestrator.d.ts.map