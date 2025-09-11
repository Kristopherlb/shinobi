"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositionRoot = void 0;
/**
 * Composition Root - The single place where all dependencies are wired together
 * This implements Principle 2: The Composition Root pattern
 */
const logger_1 = require("./utils/logger");
const file_discovery_1 = require("./utils/file-discovery");
const template_engine_1 = require("./templates/template-engine");
const schema_manager_1 = require("./schemas/schema-manager");
const init_1 = require("./cli/init");
const validate_1 = require("./cli/validate");
const plan_1 = require("./cli/plan");
const validation_orchestrator_1 = require("./services/validation-orchestrator");
const manifest_parser_1 = require("./services/manifest-parser");
const schema_validator_1 = require("./services/schema-validator");
const context_hydrator_1 = require("./services/context-hydrator");
const reference_validator_1 = require("./services/reference-validator");
const inquirer_1 = __importDefault(require("inquirer"));
class CompositionRoot {
    _dependencies = null;
    /**
     * Create all application dependencies - called once at startup
     */
    createDependencies(loggerConfig) {
        if (this._dependencies) {
            return this._dependencies;
        }
        // Create core utilities (no dependencies)
        const logger = new logger_1.Logger();
        logger.configure(loggerConfig);
        const fileDiscovery = new file_discovery_1.FileDiscovery();
        const schemaManager = new schema_manager_1.SchemaManager();
        const templateEngine = new template_engine_1.TemplateEngine({ logger });
        // Create focused services (single responsibility)
        const manifestParser = new manifest_parser_1.ManifestParser({ logger });
        const schemaValidator = new schema_validator_1.SchemaValidator({ logger, schemaManager });
        const contextHydrator = new context_hydrator_1.ContextHydrator({ logger });
        const referenceValidator = new reference_validator_1.ReferenceValidator({ logger });
        // Create orchestrator that coordinates the services
        const validationOrchestrator = new validation_orchestrator_1.ValidationOrchestrator({
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
        return new init_1.InitCommand({
            templateEngine: dependencies.templateEngine,
            fileDiscovery: dependencies.fileDiscovery,
            logger: dependencies.logger,
            prompter: inquirer_1.default
        });
    }
    createValidateCommand(dependencies) {
        return new validate_1.ValidateCommand({
            pipeline: dependencies.validationOrchestrator,
            fileDiscovery: dependencies.fileDiscovery,
            logger: dependencies.logger
        });
    }
    createPlanCommand(dependencies) {
        return new plan_1.PlanCommand({
            pipeline: dependencies.validationOrchestrator,
            fileDiscovery: dependencies.fileDiscovery,
            logger: dependencies.logger
        });
    }
}
exports.CompositionRoot = CompositionRoot;
