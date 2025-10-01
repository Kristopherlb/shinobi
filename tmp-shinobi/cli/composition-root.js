/**
 * Composition Root - The single place where all dependencies are wired together
 * This implements Principle 2: The Composition Root pattern
 */
import { Logger } from './utils/logger.js';
import { FileDiscovery } from './utils/file-discovery.js';
import { TemplateEngine } from './templates/template-engine.js';
import { ContextHydrator, ManifestParser, ReferenceValidator, SchemaManager, SchemaValidator, ValidationOrchestrator } from '@shinobi/core';
import { InitCommand } from './init.js';
import { ValidateCommand } from './validate.js';
import { PlanCommand } from './plan.js';
import { DiffCommand } from './diff.js';
import { DestroyCommand } from './destroy.js';
import { UpCommand } from './up.js';
import inquirer from 'inquirer';
export class CompositionRoot {
    _dependencies = null;
    /**
     * Create all application dependencies - called once at startup
     */
    createDependencies(loggerConfig) {
        if (this._dependencies) {
            return this._dependencies;
        }
        // Create core utilities (no dependencies)
        const logger = new Logger();
        logger.configure(loggerConfig);
        const fileDiscovery = new FileDiscovery();
        const schemaManager = new SchemaManager();
        const templateEngine = new TemplateEngine({ logger });
        // Create enhanced schema validation services
        // Create focused services (single responsibility)
        const manifestParser = new ManifestParser({ logger });
        const schemaValidator = new SchemaValidator({ logger, schemaManager });
        const contextHydrator = new ContextHydrator({ logger });
        const referenceValidator = new ReferenceValidator({ logger });
        // Create orchestrator that coordinates the services
        const validationOrchestrator = new ValidationOrchestrator({
            logger,
            manifestParser,
            schemaValidator,
            contextHydrator,
            referenceValidator
        });
        this._dependencies = {
            logger,
            validationOrchestrator,
            fileDiscovery,
            templateEngine,
            schemaManager,
            manifestParser,
            schemaValidator,
            contextHydrator,
            referenceValidator
        };
        return this._dependencies;
    }
    /**
     * Create CLI commands with their dependencies injected
     */
    createInitCommand(dependencies) {
        return new InitCommand({
            templateEngine: dependencies.templateEngine,
            fileDiscovery: dependencies.fileDiscovery,
            logger: dependencies.logger,
            prompter: inquirer
        });
    }
    createValidateCommand(dependencies) {
        return new ValidateCommand({
            pipeline: dependencies.validationOrchestrator,
            fileDiscovery: dependencies.fileDiscovery,
            logger: dependencies.logger
        });
    }
    createPlanCommand(dependencies) {
        return new PlanCommand({
            pipeline: dependencies.validationOrchestrator,
            fileDiscovery: dependencies.fileDiscovery,
            logger: dependencies.logger
        });
    }
    createDiffCommand(dependencies) {
        return new DiffCommand({
            fileDiscovery: dependencies.fileDiscovery,
            logger: dependencies.logger
        });
    }
    createDestroyCommand(dependencies) {
        return new DestroyCommand({
            fileDiscovery: dependencies.fileDiscovery,
            logger: dependencies.logger
        });
    }
    createUpCommand(dependencies) {
        return new UpCommand({
            fileDiscovery: dependencies.fileDiscovery,
            logger: dependencies.logger
        });
    }
}
