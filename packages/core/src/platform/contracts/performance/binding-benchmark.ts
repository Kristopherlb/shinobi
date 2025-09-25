/**
 * Binding Benchmark
 * Performance benchmarking utility for binding operations
 */

export interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  throughput: number; // operations per second
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  summary: {
    totalTime: number;
    totalOperations: number;
    averageThroughput: number;
  };
}

/**
 * Performance benchmarking utility for binding operations
 */
export class BindingBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Benchmark a function
   */
  async benchmark(
    name: string,
    fn: () => Promise<any>,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < 5; i++) {
      await fn();
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await fn();
      const end = Date.now();
      times.push(end - start);
    }

    // Calculate statistics
    times.sort((a, b) => a - b);
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const p50 = this.percentile(times, 0.5);
    const p95 = this.percentile(times, 0.95);
    const p99 = this.percentile(times, 0.99);
    const throughput = (iterations / totalTime) * 1000; // ops per second

    const result: BenchmarkResult = {
      operation: name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      p50,
      p95,
      p99,
      throughput
    };

    this.results.push(result);
    return result;
  }

  /**
   * Run comprehensive benchmark suite
   */
  async runBenchmarkSuite(): Promise<BenchmarkSuite> {
    const suite: BenchmarkSuite = {
      name: 'Binding Operations Benchmark',
      results: [...this.results],
      summary: {
        totalTime: 0,
        totalOperations: 0,
        averageThroughput: 0
      }
    };

    // Calculate summary
    for (const result of suite.results) {
      suite.summary.totalTime += result.totalTime;
      suite.summary.totalOperations += result.iterations;
    }

    suite.summary.averageThroughput =
      suite.summary.totalOperations / (suite.summary.totalTime / 1000);

    return suite;
  }

  /**
   * Compare two benchmark results
   */
  compare(before: BenchmarkResult, after: BenchmarkResult): {
    improvement: number;
    throughputGain: number;
    analysis: string;
  } {
    const timeImprovement = ((before.averageTime - after.averageTime) / before.averageTime) * 100;
    const throughputGain = ((after.throughput - before.throughput) / before.throughput) * 100;

    let analysis = '';
    if (timeImprovement > 10) {
      analysis = 'Significant performance improvement';
    } else if (timeImprovement > 0) {
      analysis = 'Modest performance improvement';
    } else if (timeImprovement > -10) {
      analysis = 'Performance is similar';
    } else {
      analysis = 'Performance regression detected';
    }

    return {
      improvement: timeImprovement,
      throughputGain,
      analysis
    };
  }

  /**
   * Get all benchmark results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * Clear all benchmark results
   */
  clear(): void {
    this.results = [];
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }
}