/**
 * Composition Root - The single place where all dependencies are wired together
 * This implements Principle 2: The Composition Root pattern
 */
import { Logger } from './utils/logger';
import { FileDiscovery } from './utils/file-discovery';
import { TemplateEngine } from './templates/template-engine';
import { SchemaManager } from './schemas/schema-manager';
import { InitCommand } from './cli/init';
import { ValidateCommand } from './cli/validate';
import { PlanCommand } from './cli/plan';
import { ValidationOrchestrator } from './services/validation-orchestrator';
import { ManifestParser } from './services/manifest-parser';
import { SchemaValidator } from './services/schema-validator';
import { ContextHydrator } from './services/context-hydrator';
import { ReferenceValidator } from './services/reference-validator';
export interface ApplicationDependencies {
    logger: Logger;
    validationOrchestrator: ValidationOrchestrator;
    fileDiscovery: FileDiscovery;
    templateEngine: TemplateEngine;
    schemaManager: SchemaManager;
    manifestParser: ManifestParser;
    schemaValidator: SchemaValidator;
    contextHydrator: ContextHydrator;
    referenceValidator: ReferenceValidator;
}
export declare class CompositionRoot {
    private _dependencies;
    /**
     * Create all application dependencies - called once at startup
     */
    createDependencies(loggerConfig: {
        verbose: boolean;
        ci: boolean;
    }): ApplicationDependencies;
    /**
     * Create CLI commands with their dependencies injected
     */
    createInitCommand(dependencies: ApplicationDependencies): InitCommand;
    createValidateCommand(dependencies: ApplicationDependencies): ValidateCommand;
    createPlanCommand(dependencies: ApplicationDependencies): PlanCommand;
}
