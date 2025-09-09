/**
 * Composition Root - The single place where all dependencies are wired together
 * This implements Principle 2: The Composition Root pattern
 */
import { Logger } from './utils/logger';
import { FileDiscovery } from './utils/file-discovery';
import { InitCommand } from './init';
import { ValidateCommand } from './validate';
import { PlanCommand } from './plan';
import { DeployCommand } from './deploy';
export interface ApplicationDependencies {
    logger: Logger;
    fileDiscovery: FileDiscovery;
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
    createDeployCommand(dependencies: ApplicationDependencies): DeployCommand;
}
