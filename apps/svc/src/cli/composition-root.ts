/**
 * Composition Root - The single place where all dependencies are wired together
 * This implements Principle 2: The Composition Root pattern
 */
import { Logger } from './utils/logger';
import { FileDiscovery } from './utils/file-discovery';
import { TemplateEngine } from './templates/template-engine';
import {
  ContextHydrator,
  ManifestParser,
  ReferenceValidator,
  SchemaManager,
  SchemaValidator,
  ValidationOrchestrator
} from '@shinobi/core';
import { InitCommand } from './init';
import { ValidateCommand } from './validate';
import { PlanCommand } from './plan';
import inquirer from 'inquirer';

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
      pipeline: dependencies.validationOrchestrator,
      fileDiscovery: dependencies.fileDiscovery,
      logger: dependencies.logger
    });
  }
}
