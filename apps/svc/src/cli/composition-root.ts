/**
 * Composition Root - The single place where all dependencies are wired together
 * This implements Principle 2: The Composition Root pattern
 */
import { Logger } from './utils/logger.js';
import { FileDiscovery } from './utils/file-discovery.js';
import { TemplateEngine } from './templates/template-engine.js';
import {
  ContextHydrator,
  ManifestParser,
  ReferenceValidator,
  SchemaManager,
  SchemaValidator,
  ValidationOrchestrator
} from '@shinobi/core';
import { InitCommand } from './init.js';
import { ValidateCommand } from './validate.js';
import { PlanCommand } from './plan.js';
import { DiffCommand } from './diff.js';
import { DestroyCommand } from './destroy.js';
import { UpCommand } from './up.js';
import inquirer from 'inquirer';
import { ExecutionContextManager } from './execution-context-manager.js';

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
  executionContext: ExecutionContextManager;
}

export class CompositionRoot {
  private _dependencies: ApplicationDependencies | null = null;

  /**
   * Create all application dependencies - called once at startup
   */
  createDependencies(loggerConfig: { verbose: boolean; ci: boolean }): ApplicationDependencies {
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
    const manifestParser = new ManifestParser({ logger: logger.platformLogger });
    const schemaValidator = new SchemaValidator({ logger: logger.platformLogger, schemaManager });
    const contextHydrator = new ContextHydrator({ logger: logger.platformLogger });
    const referenceValidator = new ReferenceValidator({ logger: logger.platformLogger });

    // Create orchestrator that coordinates the services
    const validationOrchestrator = new ValidationOrchestrator({
      logger: logger.platformLogger,
      manifestParser,
      schemaValidator,
      contextHydrator,
      referenceValidator
    });

    const executionContext = new ExecutionContextManager({
      logger,
      pipeline: validationOrchestrator,
      fileDiscovery
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
      referenceValidator,
      executionContext
    };

    return this._dependencies;
  }

  /**
   * Create CLI commands with their dependencies injected
   */
  createInitCommand(dependencies: ApplicationDependencies): InitCommand {
    return new InitCommand({
      templateEngine: dependencies.templateEngine,
      fileDiscovery: dependencies.fileDiscovery,
      logger: dependencies.logger,
      prompter: inquirer
    });
  }

  createValidateCommand(dependencies: ApplicationDependencies): ValidateCommand {
    return new ValidateCommand({
      pipeline: dependencies.validationOrchestrator,
      fileDiscovery: dependencies.fileDiscovery,
      logger: dependencies.logger
    });
  }

  createPlanCommand(dependencies: ApplicationDependencies): PlanCommand {
    return new PlanCommand({
      logger: dependencies.logger,
      executionContext: dependencies.executionContext
    });
  }

  createDiffCommand(dependencies: ApplicationDependencies): DiffCommand {
    return new DiffCommand({
      fileDiscovery: dependencies.fileDiscovery,
      logger: dependencies.logger
    });
  }

  createDestroyCommand(dependencies: ApplicationDependencies): DestroyCommand {
    return new DestroyCommand({
      fileDiscovery: dependencies.fileDiscovery,
      logger: dependencies.logger
    });
  }

  createUpCommand(dependencies: ApplicationDependencies): UpCommand {
    return new UpCommand({
      fileDiscovery: dependencies.fileDiscovery,
      logger: dependencies.logger
    });
  }
}
