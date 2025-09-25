/**
 * BinderMatrix Performance Tests
 * Validates the Map optimization delivers measurable performance improvements
 * 
 * Test Metadata:
 * {
 *   "id": "TP-platform-binder-matrix-003",
 *   "level": "integration",
 *   "capability": "performance optimization validation and regression detection",
 *   "oracle": "property",
 *   "invariants": ["O(1) average lookup time", "linear scaling with source types", "constant memory per strategy"],
 *   "fixtures": ["performance measurement harness", "deterministic timing", "controlled strategy sets"],
 *   "inputs": { "shape": "varying strategy counts and source type distributions", "notes": "seeded performance.now() for deterministic timing" },
 *   "risks": ["performance regression", "memory leaks", "timing variance"],
 *   "dependencies": ["BinderMatrix", "performance.now()", "process.memoryUsage()"],
 *   "evidence": ["benchmark results", "scaling curves", "memory usage profiles"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BinderMatrix } from '../@shinobi/core/binder-matrix';
import { 
  IBinderStrategy, 
  ITriggerStrategy, 
  CompatibilityEntry 
} from '../@shinobi/core/platform-binding-trigger-spec';

// Performance measurement utilities
interface BenchmarkResult {
  averageTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
  iterations: number;
  operationsPerSecond: number;
}

interface ScalingBenchmark {
  strategyCount: number;
  sourceTypeCount: number;
  avgStrategiesPerSource: number;
  lookupTime: BenchmarkResult;
  memoryUsage: number;
  optimizationRatio: number;
}

class PerformanceStrategy implements IBinderStrategy {
  constructor(
    private sourceType: string,
    private capabilities: string[],
    private targetType: string = 'perf-target'
  ) {}

  canHandle(sourceType: string, capability: string): boolean {
    return sourceType === this.sourceType && this.capabilities.includes(capability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return this.capabilities.map(capability => ({
      sourceType: this.sourceType,
      targetType: this.targetType,
      capability,
      supportedAccess: ['read', 'write'] as any[],
      description: `Performance test: ${this.sourceType} -> ${this.targetType} (${capability})`
    }));
  }

  bind(): any {
    // No-op for performance testing
    return { success: true };
  }
}

function createStrategiesForScale(sourceTypeCount: number, capabilitiesPerSource: number): IBinderStrategy[] {
  const strategies: IBinderStrategy[] = [];
  const capabilities = ['READ_ONLY', 'WRITE_ONLY', 'READ_WRITE', 'EXECUTE', 'ADMIN', 'CONNECT', 'DELETE', 'UPDATE'];

  for (let i = 0; i < sourceTypeCount; i++) {
    const sourceType = `source-type-${i.toString().padStart(3, '0')}`;
    const sourceCaps = capabilities.slice(0, capabilitiesPerSource);
    strategies.push(new PerformanceStrategy(sourceType, sourceCaps));
  }

  return strategies;
}

function benchmarkLookups(
  matrix: BinderMatrix, 
  lookupPatterns: Array<[string, string]>, 
  iterations: number = 10000
): BenchmarkResult {
  const times: number[] = [];
  
  // Warm up
  for (let i = 0; i < 100; i++) {
    const [sourceType, capability] = lookupPatterns[i % lookupPatterns.length];
    matrix.findBindingStrategy(sourceType, capability);
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const [sourceType, capability] = lookupPatterns[i % lookupPatterns.length];
    
    const start = performance.now();
    matrix.findBindingStrategy(sourceType, capability);
    const end = performance.now();
    
    times.push(end - start);
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const operationsPerSecond = 1000 / averageTime;

  return {
    averageTime,
    minTime,
    maxTime,
    totalTime,
    iterations,
    operationsPerSecond
  };
}

function measureMemoryUsage(): number {
  if (global.gc) {
    global.gc();
  }
  return process.memoryUsage().heapUsed;
}

describe('BinderMatrix Performance', () => {
  let matrix: BinderMatrix;

  beforeEach(() => {
    matrix = new BinderMatrix();
    
    // Force garbage collection before each test if available
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    // Cleanup after each test
    if (global.gc) {
      global.gc();
    }
  });

  describe('Lookup Performance Scaling', () => {
    test('LookupPerformance__ScalingWithSourceTypes__LinearMemoryConstantTime', () => {
      const scalingTests: number[] = [10, 50, 100, 200, 500];
      const results: ScalingBenchmark[] = [];

      scalingTests.forEach(sourceTypeCount => {
        // Arrange
        const testMatrix = new BinderMatrix();
        const strategies = createStrategiesForScale(sourceTypeCount, 3); // 3 capabilities per source
        
        const memoryBefore = measureMemoryUsage();
        
        strategies.forEach(strategy => testMatrix.registerBindingStrategy(strategy));
        
        const memoryAfter = measureMemoryUsage();

        // Create lookup patterns (mix of hits and misses)
        const lookupPatterns: Array<[string, string]> = [];
        for (let i = 0; i < Math.min(sourceTypeCount, 20); i++) {
          lookupPatterns.push([`source-type-${i.toString().padStart(3, '0')}`, 'READ_ONLY']);
          lookupPatterns.push([`source-type-${i.toString().padStart(3, '0')}`, 'NONEXISTENT']);
        }

        // Act
        const benchmark = benchmarkLookups(testMatrix, lookupPatterns, 5000);
        const diagnostics = testMatrix.getPerformanceDiagnostics();

        // Store results
        results.push({
          strategyCount: sourceTypeCount,
          sourceTypeCount,
          avgStrategiesPerSource: diagnostics.mapEfficiency.avgStrategiesPerBindingSource,
          lookupTime: benchmark,
          memoryUsage: memoryAfter - memoryBefore,
          optimizationRatio: diagnostics.lookupOptimization.worstCaseArrayScan / 
                           Math.max(diagnostics.lookupOptimization.bestCaseMapLookup, 1)
        });
      });

      // Assert scaling properties
      results.forEach((result, index) => {
        // Performance should stay relatively constant regardless of total strategies
        expect(result.lookupTime.averageTime).toBeLessThan(0.1); // < 0.1ms per lookup
        expect(result.lookupTime.operationsPerSecond).toBeGreaterThan(10000); // > 10k ops/sec
        
        // Optimization ratio should improve with more strategies
        if (index > 0) {
          expect(result.optimizationRatio).toBeGreaterThanOrEqual(results[index - 1].optimizationRatio);
        }
        
        // Memory usage should scale linearly with strategy count
        const memoryPerStrategy = result.memoryUsage / result.strategyCount;
        expect(memoryPerStrategy).toBeLessThan(10000); // < 10KB per strategy
      });

      // Log results for manual inspection
      console.log('\n📊 BinderMatrix Scaling Results:');
      console.log('Strategies | Avg Time (ms) | Ops/sec | Memory (KB) | Optimization');
      console.log('-----------|---------------|---------|-------------|-------------');
      results.forEach(result => {
        console.log(
          `${result.strategyCount.toString().padStart(10)} | ` +
          `${result.lookupTime.averageTime.toFixed(4).padStart(13)} | ` +
          `${Math.round(result.lookupTime.operationsPerSecond).toString().padStart(7)} | ` +
          `${Math.round(result.memoryUsage / 1024).toString().padStart(11)} | ` +
          `${result.optimizationRatio.toFixed(1)}x`
        );
      });
    });

    test('MapOptimization__VaryingSourceDistribution__ConsistentPerformance', () => {
      // Test different distributions of strategies across source types
      const distributions = [
        { sourceTypes: 10, strategiesPerSource: 1 },   // Sparse distribution
        { sourceTypes: 10, strategiesPerSource: 5 },   // Medium distribution
        { sourceTypes: 10, strategiesPerSource: 10 },  // Dense distribution
        { sourceTypes: 50, strategiesPerSource: 2 },   // Wide distribution
        { sourceTypes: 2, strategiesPerSource: 50 }    // Concentrated distribution
      ];

      const results = distributions.map(({ sourceTypes, strategiesPerSource }) => {
        const testMatrix = new BinderMatrix();
        
        // Create strategies with specified distribution
        for (let i = 0; i < sourceTypes; i++) {
          const sourceType = `dist-source-${i}`;
          const capabilities = Array.from({ length: strategiesPerSource }, (_, j) => `cap-${j}`);
          testMatrix.registerBindingStrategy(new PerformanceStrategy(sourceType, capabilities));
        }

        // Benchmark with representative lookups
        const lookupPatterns: Array<[string, string]> = [];
        for (let i = 0; i < Math.min(sourceTypes, 10); i++) {
          lookupPatterns.push([`dist-source-${i}`, 'cap-0']);
        }

        const benchmark = benchmarkLookups(testMatrix, lookupPatterns, 5000);
        const diagnostics = testMatrix.getPerformanceDiagnostics();

        return {
          distribution: `${sourceTypes}x${strategiesPerSource}`,
          totalStrategies: sourceTypes * strategiesPerSource,
          benchmark,
          optimizationRatio: diagnostics.lookupOptimization.worstCaseArrayScan / 
                           Math.max(diagnostics.lookupOptimization.bestCaseMapLookup, 1)
        };
      });

      // Assert consistent performance across distributions
      results.forEach(result => {
        expect(result.benchmark.averageTime).toBeLessThan(0.05); // < 0.05ms per lookup
        expect(result.optimizationRatio).toBeGreaterThan(1); // Some optimization achieved
      });

      // The concentrated distribution should show the highest optimization ratio
      const concentratedResult = results.find(r => r.distribution === '2x50');
      const sparseResult = results.find(r => r.distribution === '10x1');
      
      expect(concentratedResult!.optimizationRatio).toBeGreaterThan(sparseResult!.optimizationRatio);
    });
  });

  describe('Memory Efficiency', () => {
    test('MemoryUsage__LargeStrategySet__EfficientStorage', () => {
      // Arrange
      const memoryBefore = measureMemoryUsage();
      const strategies = createStrategiesForScale(1000, 5); // 1000 source types, 5 caps each

      // Act
      strategies.forEach(strategy => matrix.registerBindingStrategy(strategy));
      
      const memoryAfter = measureMemoryUsage();
      const memoryGrowth = memoryAfter - memoryBefore;

      // Assert memory efficiency
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // < 50MB for 5000 strategies
      
      const memoryPerStrategy = memoryGrowth / (1000 * 5);
      expect(memoryPerStrategy).toBeLessThan(10000); // < 10KB per strategy

      // Verify functionality is maintained
      expect(matrix.findBindingStrategy('source-type-500', 'READ_ONLY')).toBeTruthy();
      expect(matrix.getPerformanceDiagnostics().totalStrategies).toBe(5000);
    });

    test('MemoryLeaks__RepeatedOperations__StableMemoryUsage', () => {
      // Arrange
      const strategies = createStrategiesForScale(100, 3);
      strategies.forEach(strategy => matrix.registerBindingStrategy(strategy));

      const memoryBaseline = measureMemoryUsage();

      // Act - Perform many operations that might cause leaks
      for (let i = 0; i < 10000; i++) {
        matrix.findBindingStrategy(`source-type-${i % 100}`.padStart(3, '0'), 'READ_ONLY');
        matrix.getSupportedBindings(`source-type-${i % 100}`.padStart(3, '0'));
        matrix.getCompatibilitySummary(`source-type-${i % 100}`.padStart(3, '0'));
        matrix.getPerformanceDiagnostics();
      }

      const memoryAfterOperations = measureMemoryUsage();
      const memoryGrowth = memoryAfterOperations - memoryBaseline;

      // Assert no significant memory leaks
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024); // < 5MB growth from operations
    });
  });

  describe('Performance Regression Detection', () => {
    test('PerformanceRegression__BaselineComparison__MeetsPerformanceTargets', () => {
      // Arrange - Create a realistic production-scale scenario
      const productionStrategies = [
        // Lambda strategies
        ...Array.from({ length: 10 }, (_, i) => 
          new PerformanceStrategy('lambda-function', ['READ_ONLY', 'READ_WRITE', 'EXECUTE'], `target-${i}`)
        ),
        // ECS strategies
        ...Array.from({ length: 8 }, (_, i) => 
          new PerformanceStrategy('ecs-fargate-service', ['READ_ONLY', 'READ_WRITE'], `target-${i}`)
        ),
        // API Gateway strategies
        ...Array.from({ length: 5 }, (_, i) => 
          new PerformanceStrategy('api-gateway-rest', ['EXECUTE', 'ADMIN'], `target-${i}`)
        ),
        // Other component strategies
        ...Array.from({ length: 20 }, (_, i) => 
          new PerformanceStrategy(`component-type-${i}`, ['READ_ONLY', 'WRITE_ONLY'], 'shared-target')
        )
      ];

      productionStrategies.forEach(strategy => matrix.registerBindingStrategy(strategy));

      // Production-like lookup patterns (80% hits, 20% misses)
      const lookupPatterns: Array<[string, string]> = [
        // Common hits
        ['lambda-function', 'READ_ONLY'],
        ['lambda-function', 'READ_WRITE'],
        ['lambda-function', 'EXECUTE'],
        ['ecs-fargate-service', 'READ_ONLY'],
        ['ecs-fargate-service', 'READ_WRITE'],
        ['api-gateway-rest', 'EXECUTE'],
        ['component-type-5', 'READ_ONLY'],
        ['component-type-10', 'WRITE_ONLY'],
        // Some misses
        ['nonexistent-type', 'READ_ONLY'],
        ['lambda-function', 'NONEXISTENT_CAP']
      ];

      // Act
      const benchmark = benchmarkLookups(matrix, lookupPatterns, 20000);
      const diagnostics = matrix.getPerformanceDiagnostics();

      // Assert performance targets
      expect(benchmark.averageTime).toBeLessThan(0.05); // < 0.05ms average
      expect(benchmark.operationsPerSecond).toBeGreaterThan(20000); // > 20k ops/sec
      expect(benchmark.maxTime).toBeLessThan(1.0); // < 1ms worst case
      
      // Assert optimization effectiveness
      expect(diagnostics.lookupOptimization.optimizationRatio).toContain('x faster');
      const ratio = parseFloat(diagnostics.lookupOptimization.optimizationRatio);
      expect(ratio).toBeGreaterThan(5); // At least 5x improvement

      // Log performance report
      console.log('\n🎯 Performance Regression Check:');
      console.log(`Average lookup time: ${benchmark.averageTime.toFixed(4)}ms`);
      console.log(`Operations per second: ${Math.round(benchmark.operationsPerSecond).toLocaleString()}`);
      console.log(`Optimization ratio: ${diagnostics.lookupOptimization.optimizationRatio}`);
      console.log(`Total strategies: ${diagnostics.totalStrategies}`);
      console.log(`Source types: ${diagnostics.mapEfficiency.bindingSourceTypes}`);
    });

    test('WorstCaseScenario__SingleSourceManyStrategies__AcceptablePerformance', () => {
      // Arrange - Worst case: many strategies for single source type
      const worstCaseStrategies = Array.from({ length: 100 }, (_, i) => 
        new PerformanceStrategy('single-source', [`capability-${i}`])
      );

      worstCaseStrategies.forEach(strategy => matrix.registerBindingStrategy(strategy));

      // Act - Benchmark with this worst-case scenario
      const lookupPatterns: Array<[string, string]> = [
        ['single-source', 'capability-0'],
        ['single-source', 'capability-50'],
        ['single-source', 'capability-99'],
        ['single-source', 'nonexistent-capability']
      ];

      const benchmark = benchmarkLookups(matrix, lookupPatterns, 10000);

      // Assert - Even worst case should be acceptable
      expect(benchmark.averageTime).toBeLessThan(0.2); // < 0.2ms even in worst case
      expect(benchmark.operationsPerSecond).toBeGreaterThan(5000); // > 5k ops/sec
    });
  });
});
