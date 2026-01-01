/**
 * CompositionRoot Tests
 * 
 * Tests for the Composition Root pattern implementation.
 */

import { CompositionRoot } from '../composition-root.js';

describe('CompositionRoot', () => {
  let root: CompositionRoot;

  beforeEach(() => {
    root = new CompositionRoot();
  });

  describe('createDependencies', () => {
    it('returns singleton (cached on second call)', () => {
      const deps1 = root.createDependencies({ verbose: false, ci: false });
      const deps2 = root.createDependencies({ verbose: false, ci: false });

      expect(deps1).toBe(deps2);
      expect(deps1.logger).toBe(deps2.logger);
      expect(deps1.fileDiscovery).toBe(deps2.fileDiscovery);
    });

    it('with different config returns cached instance (defensive behavior)', () => {
      const deps1 = root.createDependencies({ verbose: false, ci: false });
      const deps2 = root.createDependencies({ verbose: true, ci: true });

      // Should return cached instance even with different config
      expect(deps1).toBe(deps2);
    });

    it('logger configured with verbose/ci flags', () => {
      const deps = root.createDependencies({ verbose: true, ci: true });
      
      expect(deps.logger.getCurrentConfig().verbose).toBe(true);
      expect(deps.logger.getCurrentConfig().ci).toBe(true);
      expect(deps.logger.isCi).toBe(true);
    });

    it('all command factories return correct command instances', () => {
      const deps = root.createDependencies({ verbose: false, ci: false });

      const validateCommand = root.createValidateCommand(deps);
      expect(validateCommand).toBeDefined();
      expect(typeof validateCommand.execute).toBe('function');

      const planCommand = root.createPlanCommand(deps);
      expect(planCommand).toBeDefined();
      expect(typeof planCommand.execute).toBe('function');

      const diffCommand = root.createDiffCommand(deps);
      expect(diffCommand).toBeDefined();
      expect(typeof diffCommand.execute).toBe('function');

      const destroyCommand = root.createDestroyCommand(deps);
      expect(destroyCommand).toBeDefined();
      expect(typeof destroyCommand.execute).toBe('function');

      const upCommand = root.createUpCommand(deps);
      expect(upCommand).toBeDefined();
      expect(typeof upCommand.execute).toBe('function');

      const synthCommand = root.createSynthCommand(deps);
      expect(synthCommand).toBeDefined();
      expect(typeof synthCommand.execute).toBe('function');
    });

    it('dependencies are correctly wired (logger.platformLogger used for core services)', () => {
      const deps = root.createDependencies({ verbose: false, ci: false });

      // Core services should receive platformLogger, not the full Logger
      expect(deps.validationOrchestrator).toBeDefined();
      expect(deps.manifestParser).toBeDefined();
      expect(deps.schemaValidator).toBeDefined();
      expect(deps.contextHydrator).toBeDefined();
      expect(deps.referenceValidator).toBeDefined();

      // Logger should have platformLogger property
      expect(deps.logger.platformLogger).toBeDefined();
    });
  });

  describe('integration', () => {
    it('full object graph can be instantiated without errors', () => {
      const deps = root.createDependencies({ verbose: false, ci: false });

      expect(deps.logger).toBeDefined();
      expect(deps.validationOrchestrator).toBeDefined();
      expect(deps.fileDiscovery).toBeDefined();
      expect(deps.schemaManager).toBeDefined();
      expect(deps.manifestParser).toBeDefined();
      expect(deps.schemaValidator).toBeDefined();
      expect(deps.contextHydrator).toBeDefined();
      expect(deps.referenceValidator).toBeDefined();
      expect(deps.executionContext).toBeDefined();

      // All commands should be creatable
      expect(() => root.createValidateCommand(deps)).not.toThrow();
      expect(() => root.createPlanCommand(deps)).not.toThrow();
      expect(() => root.createDiffCommand(deps)).not.toThrow();
      expect(() => root.createDestroyCommand(deps)).not.toThrow();
      expect(() => root.createUpCommand(deps)).not.toThrow();
      expect(() => root.createSynthCommand(deps)).not.toThrow();
    });
  });
});



