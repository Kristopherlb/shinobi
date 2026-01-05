/**
 * Composition Root - The single place where all dependencies are wired together
 * 
 * This implements Principle 2: The Composition Root pattern.
 * See docs/architecture/design-principles.md for the complete set of architectural principles.
 */
import { Logger } from './console-logger.js';
import { FileDiscovery } from './utils/file-discovery.js';
import {
  ContextHydrator,
  ManifestParser,
  ReferenceValidator,
  SchemaManager,
  SchemaValidator,
  ValidationOrchestrator,
  createUnifiedBinderRegistry
} from '@shinobi/core';
import { ValidateCommand } from './validate-command.js';
import { PlanCommand } from './plan-command.js';
import { DiffCommand } from './diff-command.js';
import { DestroyCommand } from './destroy-command.js';
import { UpCommand } from './up-command.js';
import { SynthCommand } from './synth-command.js';
import { ExecutionContextManager } from './execution-context-manager.js';

export interface ApplicationDependencies {
  logger: Logger;
  validationOrchestrator: ValidationOrchestrator;
  fileDiscovery: FileDiscovery;
  schemaManager: SchemaManager;
  manifestParser: ManifestParser;
  schemaValidator: SchemaValidator;
  contextHydrator: ContextHydrator;
  referenceValidator: ReferenceValidator;
  executionContext: ExecutionContextManager;
}

export class CompositionRoot {
  private _dependencies: ApplicationDependencies | null = null;
  private _loggerConfig: { verbose: boolean; ci: boolean } | null = null;

  /**
   * Create all application dependencies - called once at startup
   * 
   * This method implements a singleton pattern for the CLI application lifecycle.
   * Dependencies are created once and cached. If called again with different
   * configuration, it will return the cached dependencies (defensive: prevents
   * reconfiguration during a single CLI run).
   */
  createDependencies(loggerConfig: { verbose: boolean; ci: boolean }): ApplicationDependencies {
    if (this._dependencies) {
      // Return cached dependencies - CLI runs once, so reconfiguration is not needed
      return this._dependencies;
    }

    // Store config to prevent accidental reconfiguration
    this._loggerConfig = loggerConfig;

    // Create core utilities (no dependencies)
    const logger = new Logger();
    logger.configure(loggerConfig);

    const fileDiscovery = new FileDiscovery();
    const schemaManager = new SchemaManager();

    // Create binder registry for binding directive validation
    const binderRegistry = createUnifiedBinderRegistry();

    // Create enhanced schema validation services
    // Create focused services (single responsibility)
    // 
    // Note: Core services from @shinobi/core expect PlatformLogger interface,
    // while CLI commands use the full Logger class (which wraps PlatformLogger).
    // This is an adapter pattern: logger.platformLogger provides the interface
    // that core services require, while CLI commands get the full Logger with
    // CLI-specific methods (success, warn, etc.).
    const manifestParser = new ManifestParser({ logger: logger.platformLogger });
    const schemaValidator = new SchemaValidator({ 
      logger: logger.platformLogger, 
      schemaManager,
      binderRegistry
    });
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
   * 
   * Note: Each command explicitly declares its dependencies (Principle 1: Strict DI).
   * While some commands share common dependencies (e.g., fileDiscovery, logger),
   * we keep them explicit rather than using a base interface. This ensures:
   * - Each command's dependencies are clear and visible
   * - No hidden dependencies or assumptions
   * - Easy to see what each command actually needs
   * - Better testability (can mock exactly what's needed)
   */
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

  createSynthCommand(dependencies: ApplicationDependencies): SynthCommand {
    return new SynthCommand({
      fileDiscovery: dependencies.fileDiscovery,
      logger: dependencies.logger
    });
  }
}
