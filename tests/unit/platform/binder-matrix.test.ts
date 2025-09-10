/**
 * BinderMatrix Unit Tests
 * Tests the core functionality of the optimized BinderMatrix implementation
 * 
 * Test Metadata:
 * {
 *   "id": "TP-platform-binder-matrix-001",
 *   "level": "unit",
 *   "capability": "strategy registration and lookup optimization",
 *   "oracle": "exact",
 *   "invariants": ["O(1) lookup performance", "backward compatibility", "no cross-test leakage"],
 *   "fixtures": ["MockBinderStrategy", "MockTriggerStrategy", "deterministic test data"],
 *   "inputs": { "shape": "mock strategies with controlled compatibility matrices", "notes": "" },
 *   "risks": ["performance regression", "memory leaks from Map storage"],
 *   "dependencies": ["BinderMatrix", "IBinderStrategy", "ITriggerStrategy"],
 *   "evidence": ["lookup performance metrics", "compatibility matrix validation"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BinderMatrix } from '../../../src/platform/contracts/binder-matrix';
import { 
  IBinderStrategy, 
  ITriggerStrategy, 
  CompatibilityEntry, 
  TriggerCompatibilityEntry 
} from '../../../src/platform/contracts/platform-binding-trigger-spec';

// Deterministic fixtures
class MockBinderStrategy implements IBinderStrategy {
  constructor(
    private sourceType: string,
    private capabilities: string[],
    private targetType: string = 'mock-target'
  ) {}

  canHandle(sourceType: string, capability: string): boolean {
    return sourceType === this.sourceType && this.capabilities.includes(capability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return this.capabilities.map(capability => ({
      sourceType: this.sourceType,
      targetType: this.targetType,
      capability,
      supportedAccess: ['read', 'write', 'readwrite'] as any[],
      description: `Mock binding: ${this.sourceType} -> ${this.targetType} (${capability})`
    }));
  }

  bind(): any {
    // Mock implementation
    return { success: true, environmentVariables: {} };
  }
}

class MockTriggerStrategy implements ITriggerStrategy {
  constructor(
    private sourceType: string,
    private eventTypes: string[],
    private targetType: string = 'mock-target'
  ) {}

  canHandle(sourceType: string, targetType: string, eventType: string): boolean {
    return sourceType === this.sourceType && 
           targetType === this.targetType && 
           this.eventTypes.includes(eventType);
  }

  getCompatibilityMatrix(): TriggerCompatibilityEntry[] {
    return this.eventTypes.map(eventType => ({
      sourceType: this.sourceType,
      targetType: this.targetType,
      eventType,
      supportedAccess: ['invoke', 'publish'] as any[],
      description: `Mock trigger: ${this.sourceType} -> ${this.targetType} (${eventType})`
    }));
  }

  trigger(): any {
    // Mock implementation
    return { success: true };
  }
}

describe('BinderMatrix', () => {
  let matrix: BinderMatrix;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    // Deterministic setup - fresh matrix for each test
    matrix = new BinderMatrix();
    
    // Spy on console.warn for warning assertions
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Cleanup - restore console.warn
    consoleWarnSpy.mockRestore();
  });

  describe('Strategy Registration', () => {
    test('RegisterBindingStrategy__ValidStrategy__AddsToMapAndArray', () => {
      // Arrange
      const strategy = new MockBinderStrategy('lambda-function', ['READ_ONLY', 'EXECUTE']);

      // Act
      matrix.registerBindingStrategy(strategy);

      // Assert - strategy is findable (tests Map storage)
      const foundStrategy = matrix.findBindingStrategy('lambda-function', 'READ_ONLY');
      expect(foundStrategy).toBe(strategy);

      // Assert - full matrix includes the strategy (tests Array storage)
      const fullMatrix = matrix.getFullCompatibilityMatrix();
      expect(fullMatrix.bindings).toHaveLength(2); // READ_ONLY + EXECUTE
      expect(fullMatrix.bindings[0].sourceType).toBe('lambda-function');
    });

    test('RegisterBindingStrategy__EmptyCompatibilityMatrix__LogsWarningAndSkips', () => {
      // Arrange
      const emptyStrategy = new MockBinderStrategy('empty-type', []);

      // Act
      matrix.registerBindingStrategy(emptyStrategy);

      // Assert - warning logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('MockBinderStrategy')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('empty compatibility matrix')
      );

      // Assert - strategy not findable
      const foundStrategy = matrix.findBindingStrategy('empty-type', 'ANY_CAPABILITY');
      expect(foundStrategy).toBeNull();
    });

    test('RegisterTriggerStrategy__ValidStrategy__AddsToMapAndArray', () => {
      // Arrange
      const strategy = new MockTriggerStrategy('s3-bucket', ['ObjectCreated', 'ObjectRemoved']);

      // Act
      matrix.registerTriggerStrategy(strategy);

      // Assert - strategy is findable (tests Map storage)
      const foundStrategy = matrix.findTriggerStrategy('s3-bucket', 'mock-target', 'ObjectCreated');
      expect(foundStrategy).toBe(strategy);

      // Assert - full matrix includes the strategy (tests Array storage)
      const fullMatrix = matrix.getFullCompatibilityMatrix();
      expect(fullMatrix.triggers).toHaveLength(2); // ObjectCreated + ObjectRemoved
    });

    test('RegisterTriggerStrategy__EmptyCompatibilityMatrix__LogsWarningAndSkips', () => {
      // Arrange
      const emptyStrategy = new MockTriggerStrategy('empty-type', []);

      // Act
      matrix.registerTriggerStrategy(emptyStrategy);

      // Assert - warning logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('MockTriggerStrategy')
      );

      // Assert - strategy not findable
      const foundStrategy = matrix.findTriggerStrategy('empty-type', 'any-target', 'any-event');
      expect(foundStrategy).toBeNull();
    });
  });

  describe('Strategy Lookup - Optimized Performance', () => {
    test('FindBindingStrategy__ExistingSourceAndCapability__ReturnsStrategy', () => {
      // Arrange
      const strategy1 = new MockBinderStrategy('lambda-function', ['READ_ONLY']);
      const strategy2 = new MockBinderStrategy('s3-bucket', ['WRITE_ONLY']);
      matrix.registerBindingStrategy(strategy1);
      matrix.registerBindingStrategy(strategy2);

      // Act
      const found = matrix.findBindingStrategy('lambda-function', 'READ_ONLY');

      // Assert
      expect(found).toBe(strategy1);
    });

    test('FindBindingStrategy__NonexistentSourceType__ReturnsNull', () => {
      // Arrange
      const strategy = new MockBinderStrategy('lambda-function', ['READ_ONLY']);
      matrix.registerBindingStrategy(strategy);

      // Act
      const found = matrix.findBindingStrategy('nonexistent-type', 'READ_ONLY');

      // Assert
      expect(found).toBeNull();
    });

    test('FindBindingStrategy__ExistingSourceButWrongCapability__ReturnsNull', () => {
      // Arrange
      const strategy = new MockBinderStrategy('lambda-function', ['READ_ONLY']);
      matrix.registerBindingStrategy(strategy);

      // Act
      const found = matrix.findBindingStrategy('lambda-function', 'WRITE_ONLY');

      // Assert
      expect(found).toBeNull();
    });

    test('FindTriggerStrategy__ExistingSourceTargetAndEvent__ReturnsStrategy', () => {
      // Arrange
      const strategy = new MockTriggerStrategy('s3-bucket', ['ObjectCreated']);
      matrix.registerTriggerStrategy(strategy);

      // Act
      const found = matrix.findTriggerStrategy('s3-bucket', 'mock-target', 'ObjectCreated');

      // Assert
      expect(found).toBe(strategy);
    });

    test('FindTriggerStrategy__NonexistentSourceType__ReturnsNull', () => {
      // Arrange
      const strategy = new MockTriggerStrategy('s3-bucket', ['ObjectCreated']);
      matrix.registerTriggerStrategy(strategy);

      // Act
      const found = matrix.findTriggerStrategy('nonexistent-type', 'mock-target', 'ObjectCreated');

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('Supported Operations - Optimized Queries', () => {
    test('GetSupportedBindings__ExistingSourceType__ReturnsFilteredEntries', () => {
      // Arrange
      const lambdaStrategy = new MockBinderStrategy('lambda-function', ['READ_ONLY', 'EXECUTE']);
      const s3Strategy = new MockBinderStrategy('s3-bucket', ['WRITE_ONLY']);
      matrix.registerBindingStrategy(lambdaStrategy);
      matrix.registerBindingStrategy(s3Strategy);

      // Act
      const lambdaBindings = matrix.getSupportedBindings('lambda-function');

      // Assert
      expect(lambdaBindings).toHaveLength(2);
      expect(lambdaBindings.every(entry => entry.sourceType === 'lambda-function')).toBe(true);
      expect(lambdaBindings.map(entry => entry.capability)).toEqual(
        expect.arrayContaining(['READ_ONLY', 'EXECUTE'])
      );
    });

    test('GetSupportedBindings__NonexistentSourceType__ReturnsEmptyArray', () => {
      // Arrange
      const strategy = new MockBinderStrategy('lambda-function', ['READ_ONLY']);
      matrix.registerBindingStrategy(strategy);

      // Act
      const bindings = matrix.getSupportedBindings('nonexistent-type');

      // Assert
      expect(bindings).toEqual([]);
    });

    test('GetSupportedTriggers__ExistingSourceType__ReturnsFilteredEntries', () => {
      // Arrange
      const s3Strategy = new MockTriggerStrategy('s3-bucket', ['ObjectCreated', 'ObjectRemoved']);
      const sqsStrategy = new MockTriggerStrategy('sqs-queue', ['MessageReceived']);
      matrix.registerTriggerStrategy(s3Strategy);
      matrix.registerTriggerStrategy(sqsStrategy);

      // Act
      const s3Triggers = matrix.getSupportedTriggers('s3-bucket');

      // Assert
      expect(s3Triggers).toHaveLength(2);
      expect(s3Triggers.every(entry => entry.sourceType === 's3-bucket')).toBe(true);
      expect(s3Triggers.map(entry => entry.eventType)).toEqual(
        expect.arrayContaining(['ObjectCreated', 'ObjectRemoved'])
      );
    });

    test('GetSupportedTriggers__NonexistentSourceType__ReturnsEmptyArray', () => {
      // Arrange
      const strategy = new MockTriggerStrategy('s3-bucket', ['ObjectCreated']);
      matrix.registerTriggerStrategy(strategy);

      // Act
      const triggers = matrix.getSupportedTriggers('nonexistent-type');

      // Assert
      expect(triggers).toEqual([]);
    });
  });

  describe('Compatibility Matrix Operations', () => {
    test('GetFullCompatibilityMatrix__MultipleStrategies__ReturnsAllEntries', () => {
      // Arrange
      const bindingStrategy = new MockBinderStrategy('lambda-function', ['READ_ONLY']);
      const triggerStrategy = new MockTriggerStrategy('s3-bucket', ['ObjectCreated']);
      matrix.registerBindingStrategy(bindingStrategy);
      matrix.registerTriggerStrategy(triggerStrategy);

      // Act
      const fullMatrix = matrix.getFullCompatibilityMatrix();

      // Assert
      expect(fullMatrix.bindings).toHaveLength(1);
      expect(fullMatrix.triggers).toHaveLength(1);
      expect(fullMatrix.bindings[0].sourceType).toBe('lambda-function');
      expect(fullMatrix.triggers[0].sourceType).toBe('s3-bucket');
    });

    test('GetCompatibilitySummary__ExistingSourceType__ReturnsDetailedSummary', () => {
      // Arrange
      const strategy = new MockBinderStrategy('lambda-function', ['READ_ONLY', 'EXECUTE'], 'rds-postgres');
      const triggerStrategy = new MockTriggerStrategy('lambda-function', ['Invocation']);
      matrix.registerBindingStrategy(strategy);
      matrix.registerTriggerStrategy(triggerStrategy);

      // Act
      const summary = matrix.getCompatibilitySummary('lambda-function');

      // Assert
      expect(summary.bindings).toHaveLength(2);
      expect(summary.triggers).toHaveLength(1);
      expect(summary.summary.totalBindings).toBe(2);
      expect(summary.summary.totalTriggers).toBe(1);
      expect(summary.summary.supportedTargetTypes).toEqual(
        expect.arrayContaining(['rds-postgres', 'mock-target'])
      );
      expect(summary.summary.supportedCapabilities).toEqual(
        expect.arrayContaining(['READ_ONLY', 'EXECUTE'])
      );
      expect(summary.summary.supportedEventTypes).toEqual(['Invocation']);
    });
  });

  describe('Validation Operations', () => {
    test('IsBindingSupported__SupportedBinding__ReturnsTrue', () => {
      // Arrange
      const strategy = new MockBinderStrategy('lambda-function', ['READ_ONLY'], 'rds-postgres');
      matrix.registerBindingStrategy(strategy);

      // Act
      const isSupported = matrix.isBindingSupported('lambda-function', 'rds-postgres', 'READ_ONLY');

      // Assert
      expect(isSupported).toBe(true);
    });

    test('IsBindingSupported__UnsupportedBinding__ReturnsFalse', () => {
      // Arrange
      const strategy = new MockBinderStrategy('lambda-function', ['READ_ONLY'], 'rds-postgres');
      matrix.registerBindingStrategy(strategy);

      // Act
      const isSupported = matrix.isBindingSupported('lambda-function', 'rds-postgres', 'WRITE_ONLY');

      // Assert
      expect(isSupported).toBe(false);
    });

    test('IsTriggerSupported__SupportedTrigger__ReturnsTrue', () => {
      // Arrange
      const strategy = new MockTriggerStrategy('s3-bucket', ['ObjectCreated'], 'lambda-function');
      matrix.registerTriggerStrategy(strategy);

      // Act
      const isSupported = matrix.isTriggerSupported('s3-bucket', 'lambda-function', 'ObjectCreated');

      // Assert
      expect(isSupported).toBe(true);
    });

    test('IsTriggerSupported__UnsupportedTrigger__ReturnsFalse', () => {
      // Arrange
      const strategy = new MockTriggerStrategy('s3-bucket', ['ObjectCreated'], 'lambda-function');
      matrix.registerTriggerStrategy(strategy);

      // Act
      const isSupported = matrix.isTriggerSupported('s3-bucket', 'lambda-function', 'ObjectRemoved');

      // Assert
      expect(isSupported).toBe(false);
    });
  });

  describe('Recommendation System', () => {
    test('GetBindingRecommendations__ExistingSourceAndTarget__ReturnsAlternativeCapabilities', () => {
      // Arrange
      const strategy = new MockBinderStrategy('lambda-function', ['READ_ONLY', 'EXECUTE'], 'rds-postgres');
      matrix.registerBindingStrategy(strategy);

      // Act
      const recommendations = matrix.getBindingRecommendations('lambda-function', 'rds-postgres');

      // Assert
      expect(recommendations).toHaveLength(2);
      expect(recommendations.map(r => r.capability)).toEqual(
        expect.arrayContaining(['READ_ONLY', 'EXECUTE'])
      );
    });

    test('GetBindingRecommendations__NoMatchingTarget__ReturnsEmptyArray', () => {
      // Arrange
      const strategy = new MockBinderStrategy('lambda-function', ['READ_ONLY'], 'rds-postgres');
      matrix.registerBindingStrategy(strategy);

      // Act
      const recommendations = matrix.getBindingRecommendations('lambda-function', 'nonexistent-target');

      // Assert
      expect(recommendations).toEqual([]);
    });

    test('GetTriggerRecommendations__ExistingSourceAndTarget__ReturnsAlternativeEvents', () => {
      // Arrange
      const strategy = new MockTriggerStrategy('s3-bucket', ['ObjectCreated', 'ObjectRemoved'], 'lambda-function');
      matrix.registerTriggerStrategy(strategy);

      // Act
      const recommendations = matrix.getTriggerRecommendations('s3-bucket', 'lambda-function');

      // Assert
      expect(recommendations).toHaveLength(2);
      expect(recommendations.map(r => r.eventType)).toEqual(
        expect.arrayContaining(['ObjectCreated', 'ObjectRemoved'])
      );
    });
  });

  describe('Performance Diagnostics', () => {
    test('GetPerformanceDiagnostics__MultipleStrategies__ReturnsOptimizationMetrics', () => {
      // Arrange
      const lambdaStrategy = new MockBinderStrategy('lambda-function', ['READ_ONLY']);
      const s3Strategy = new MockBinderStrategy('s3-bucket', ['WRITE_ONLY']);
      const triggerStrategy = new MockTriggerStrategy('sqs-queue', ['MessageReceived']);
      
      matrix.registerBindingStrategy(lambdaStrategy);
      matrix.registerBindingStrategy(s3Strategy);
      matrix.registerTriggerStrategy(triggerStrategy);

      // Act
      const diagnostics = matrix.getPerformanceDiagnostics();

      // Assert
      expect(diagnostics.totalStrategies).toBe(3);
      expect(diagnostics.mapEfficiency.bindingSourceTypes).toBe(2); // lambda-function, s3-bucket
      expect(diagnostics.mapEfficiency.triggerSourceTypes).toBe(1); // sqs-queue
      expect(diagnostics.mapEfficiency.avgStrategiesPerBindingSource).toBe(1); // 2 strategies / 2 source types
      expect(diagnostics.lookupOptimization.worstCaseArrayScan).toBe(3);
      expect(diagnostics.lookupOptimization.bestCaseMapLookup).toBe(1);
      expect(diagnostics.lookupOptimization.optimizationRatio).toContain('x faster');
    });

    test('GetPerformanceDiagnostics__EmptyMatrix__ReturnsZeroMetrics', () => {
      // Act
      const diagnostics = matrix.getPerformanceDiagnostics();

      // Assert
      expect(diagnostics.totalStrategies).toBe(0);
      expect(diagnostics.mapEfficiency.bindingSourceTypes).toBe(0);
      expect(diagnostics.mapEfficiency.triggerSourceTypes).toBe(0);
      expect(diagnostics.mapEfficiency.avgStrategiesPerBindingSource).toBe(0);
      expect(diagnostics.mapEfficiency.avgStrategiesPerTriggerSource).toBe(0);
      expect(diagnostics.lookupOptimization.optimizationRatio).toBe('N/A');
    });
  });

  describe('Export Operations', () => {
    test('ExportMatrix__PopulatedMatrix__ReturnsCompleteConfiguration', () => {
      // Arrange
      const bindingStrategy = new MockBinderStrategy('lambda-function', ['READ_ONLY']);
      const triggerStrategy = new MockTriggerStrategy('s3-bucket', ['ObjectCreated']);
      matrix.registerBindingStrategy(bindingStrategy);
      matrix.registerTriggerStrategy(triggerStrategy);

      // Act
      const exported = matrix.exportMatrix();

      // Assert
      expect(exported.version).toBe('1.0');
      expect(exported.bindings).toHaveLength(1);
      expect(exported.triggers).toHaveLength(1);
      expect(exported.metadata.totalStrategies).toBe(2);
      expect(exported.metadata.bindingStrategies).toBe(1);
      expect(exported.metadata.triggerStrategies).toBe(1);
      expect(exported.metadata.exportedAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    });
  });

  describe('Multi-Source Strategy Support', () => {
    test('RegisterBindingStrategy__StrategyHandlesMultipleSources__IndexedCorrectly', () => {
      // Arrange - strategy that handles multiple source types
      class MultiSourceStrategy implements IBinderStrategy {
        canHandle(sourceType: string, capability: string): boolean {
          return ['lambda-function', 'ec2-instance'].includes(sourceType) && capability === 'CONNECT';
        }

        getCompatibilityMatrix(): CompatibilityEntry[] {
          return [
            {
              sourceType: 'lambda-function',
              targetType: 'rds-postgres',
              capability: 'CONNECT',
              supportedAccess: ['read', 'write'] as any[],
              description: 'Lambda to RDS connection'
            },
            {
              sourceType: 'ec2-instance',
              targetType: 'rds-postgres',
              capability: 'CONNECT',
              supportedAccess: ['read', 'write'] as any[],
              description: 'EC2 to RDS connection'
            }
          ];
        }

        bind(): any { return { success: true, environmentVariables: {} }; }
      }

      const strategy = new MultiSourceStrategy();

      // Act
      matrix.registerBindingStrategy(strategy);

      // Assert - both source types can find the strategy
      const lambdaStrategy = matrix.findBindingStrategy('lambda-function', 'CONNECT');
      const ec2Strategy = matrix.findBindingStrategy('ec2-instance', 'CONNECT');

      expect(lambdaStrategy).toBe(strategy);
      expect(ec2Strategy).toBe(strategy);

      // Assert - performance diagnostics reflect multiple indexing
      const diagnostics = matrix.getPerformanceDiagnostics();
      expect(diagnostics.mapEfficiency.bindingSourceTypes).toBe(2);
    });
  });
});
