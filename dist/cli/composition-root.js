"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositionRoot = void 0;
/**
 * Composition Root - The single place where all dependencies are wired together
 * This implements Principle 2: The Composition Root pattern
 */
const logger_1 = require("./utils/logger");
const file_discovery_1 = require("./utils/file-discovery");
const init_1 = require("./init");
const validate_1 = require("./validate");
const plan_1 = require("./plan");
const deploy_1 = require("./deploy");
class CompositionRoot {
    constructor() {
        this._dependencies = null;
    }
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
        this._dependencies = {
            logger,
            fileDiscovery
        };
        return this._dependencies;
    }
    /**
     * Create CLI commands with their dependencies injected
     */
    createInitCommand(dependencies) {
        // For now, create a minimal init command
        return new init_1.InitCommand();
    }
    createValidateCommand(dependencies) {
        // For now, create a minimal validate command
        return new validate_1.ValidateCommand();
    }
    createPlanCommand(dependencies) {
        // For now, create a minimal plan command
        return new plan_1.PlanCommand();
    }
    createDeployCommand(dependencies) {
        return new deploy_1.DeployCommand({
            fileDiscovery: dependencies.fileDiscovery,
            logger: dependencies.logger
        });
    }
}
exports.CompositionRoot = CompositionRoot;
