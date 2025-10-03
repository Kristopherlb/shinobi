/**
 * Enhanced Binder Strategy System Example
 * Demonstrates all enhancements: additional strategies, caching, monitoring, and performance optimization
 */

import { EnhancedBinderRegistry } from './enhanced-binder-registry.ts';
import { BindingBenchmark } from './performance/binding-benchmark.ts';
import { EnhancedBindingContext, CapabilityData } from './enhanced-binding-context.ts';
import { Component } from './component.ts';

/**
 * Enhanced example showing all binder strategy system capabilities
 */
export class EnhancedBinderExample {
  private registry: EnhancedBinderRegistry;
  private benchmark: BindingBenchmark;

  constructor() {
    // Initialize registry with cache configuration
    this.registry = new EnhancedBinderRegistry({
      maxEntries: 1000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      enabled: true,
      cleanupInterval: 60 * 1000 // 1 minute
    });

    // Initialize benchmark suite
    this.benchmark = new BindingBenchmark(this.registry);
  }

  /**
   * Demonstrate comprehensive binding scenarios
   */
  async demonstrateEnhancedBindings(): Promise<void> {
    console.log('🚀 Starting Enhanced Binder Strategy System Demo...\n');

    try {
      // 1. Demonstrate multiple binding types
      await this.demonstrateMultipleBindings();

      // 2. Show caching performance
      await this.demonstrateCachingPerformance();

      // 3. Display metrics and monitoring
      await this.displayMetricsAndMonitoring();

      // 4. Run performance benchmarks
      await this.runPerformanceBenchmarks();

      // 5. Show optimization recommendations
      await this.showOptimizationRecommendations();

      console.log('✅ Enhanced Binder Strategy System Demo completed successfully!');

    } catch (error) {
      console.error('❌ Demo failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Demonstrate multiple binding types with new strategies
   */
  private async demonstrateMultipleBindings(): Promise<void> {
    console.log('📊 Demonstrating Multiple Binding Types...\n');

    const components = this.createMockComponents();

    // Database binding
    const dbContext = this.createDatabaseBindingContext(components);
    const dbResult = await this.registry.bind(dbContext);
    console.log(`✅ Database Binding: ${Object.keys(dbResult.environmentVariables).length} env vars, ${dbResult.iamPolicies.length} policies`);

    // Storage binding
    const storageContext = this.createStorageBindingContext(components);
    const storageResult = await this.registry.bind(storageContext);
    console.log(`✅ Storage Binding: ${Object.keys(storageResult.environmentVariables).length} env vars, ${storageResult.iamPolicies.length} policies`);

    // Cache binding
    const cacheContext = this.createCacheBindingContext(components);
    const cacheResult = await this.registry.bind(cacheContext);
    console.log(`✅ Cache Binding: ${Object.keys(cacheResult.environmentVariables).length} env vars, ${cacheResult.securityGroupRules.length} security rules`);

    // Queue binding
    const queueContext = this.createQueueBindingContext(components);
    const queueResult = await this.registry.bind(queueContext);
    console.log(`✅ Queue Binding: ${Object.keys(queueResult.environmentVariables).length} env vars, ${queueResult.complianceActions.length} compliance actions`);

    // Lambda binding (new)
    const lambdaContext = this.createLambdaBindingContext(components);
    const lambdaResult = await this.registry.bind(lambdaContext);
    console.log(`✅ Lambda Binding: ${Object.keys(lambdaResult.environmentVariables).length} env vars, ${lambdaResult.iamPolicies.length} policies`);

    // API Gateway binding (new)
    const apiContext = this.createApiGatewayBindingContext(components);
    const apiResult = await this.registry.bind(apiContext);
    console.log(`✅ API Gateway Binding: ${Object.keys(apiResult.environmentVariables).length} env vars, ${apiResult.complianceActions.length} compliance actions`);

    console.log('');
  }

  /**
   * Demonstrate caching performance benefits
   */
  private async demonstrateCachingPerformance(): Promise<void> {
    console.log('⚡ Demonstrating Caching Performance...\n');

    const components = this.createMockComponents();
    const context = this.createDatabaseBindingContext(components);

    // First binding (cache miss)
    const start1 = Date.now();
    await this.registry.bind(context);
    const duration1 = Date.now() - start1;

    // Second binding (cache hit)
    const start2 = Date.now();
    await this.registry.bind(context);
    const duration2 = Date.now() - start2;

    const improvement = ((duration1 - duration2) / duration1 * 100).toFixed(1);

    console.log(`📈 First binding (cache miss): ${duration1}ms`);
    console.log(`⚡ Second binding (cache hit): ${duration2}ms`);
    console.log(`🚀 Performance improvement: ${improvement}%`);

    // Display cache statistics
    const cacheStats = this.registry.getCacheStats();
    console.log(`📊 Cache Stats: ${cacheStats.hits} hits, ${cacheStats.misses} misses, ${(cacheStats.hitRatio * 100).toFixed(1)}% hit ratio`);
    console.log('');
  }

  /**
   * Display comprehensive metrics and monitoring
   */
  private async displayMetricsAndMonitoring(): Promise<void> {
    console.log('📊 Displaying Metrics and Monitoring...\n');

    // Get comprehensive metrics
    const metrics = this.registry.getMetrics();
    console.log('📈 Binding Metrics:');
    console.log(`  Total Bindings: ${metrics.totalBindings}`);
    console.log(`  Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    console.log(`  Average Duration: ${metrics.averageDuration.toFixed(2)}ms`);
    console.log(`  P95 Duration: ${metrics.percentiles.p95.toFixed(2)}ms`);

    console.log('\n🏛️ By Compliance Framework:');
    Object.entries(metrics.byFramework).forEach(([framework, count]) => {
      console.log(`  ${framework}: ${count} bindings`);
    });

    console.log('\n🔧 By Capability Type:');
    Object.entries(metrics.byCapability).forEach(([capability, count]) => {
      console.log(`  ${capability}: ${count} bindings`);
    });

    if (Object.keys(metrics.errorTypes).length > 0) {
      console.log('\n❌ Error Types:');
      Object.entries(metrics.errorTypes).forEach(([errorType, count]) => {
        console.log(`  ${errorType}: ${count} errors`);
      });
    }

    // Get recent event history
    const events = this.registry.getEventHistory(5);
    console.log('\n📋 Recent Events:');
    events.forEach(event => {
      const timestamp = new Date(event.timestamp).toLocaleTimeString();
      console.log(`  ${timestamp}: ${event.type} - ${event.context.sourceType} -> ${event.context.capability}`);
    });

    console.log('');
  }

  /**
   * Run comprehensive performance benchmarks
   */
  private async runPerformanceBenchmarks(): Promise<void> {
    console.log('🏃‍♂️ Running Performance Benchmarks...\n');

    // Add benchmark scenarios
    this.addBenchmarkScenarios();

    // Run benchmark suite
    const results = await this.benchmark.runBenchmarkSuite();

    console.log('📊 Benchmark Results:');
    console.log(`  Total Duration: ${results.totalDuration}ms`);
    console.log(`  Scenarios: ${results.overall.totalScenarios}`);
    console.log(`  Passed: ${results.overall.passedScenarios}`);
    console.log(`  Average Ops/Sec: ${results.overall.averageOpsPerSecond.toFixed(2)}`);
    console.log(`  Best Performer: ${results.overall.bestPerformer}`);
    console.log(`  Worst Performer: ${results.overall.worstPerformer}`);

    console.log('\n📋 Individual Results:');
    results.scenarios.forEach(scenario => {
      const status = scenario.passed ? '✅' : '❌';
      console.log(`  ${status} ${scenario.name}: ${scenario.result.opsPerSecond.toFixed(2)} ops/sec (${scenario.performance})`);
    });

    // Generate and display report
    const report = this.benchmark.generateReport(results);
    console.log('\n📄 Performance Report Generated');

    console.log('');
  }

  /**
   * Show optimization recommendations
   */
  private async showOptimizationRecommendations(): Promise<void> {
    console.log('🔧 Optimization Recommendations...\n');

    // Run a quick benchmark to get recommendations
    this.addBenchmarkScenarios();
    const results = await this.benchmark.runBenchmarkSuite();

    const recommendations = this.benchmark.getOptimizationRecommendations(results);

    if (recommendations.length === 0) {
      console.log('✅ No optimization recommendations - system is performing well!');
    } else {
      console.log(`📋 Found ${recommendations.length} optimization opportunities:`);
      recommendations.forEach((rec, index) => {
        const priority = rec.priority.toUpperCase();
        const effort = rec.effort.toUpperCase();
        console.log(`  ${index + 1}. [${priority}] ${rec.title}`);
        console.log(`     ${rec.description}`);
        console.log(`     Expected: ${rec.expectedImprovement} (${effort} effort)`);
        console.log('');
      });
    }

    console.log('');
  }

  /**
   * Add benchmark scenarios for testing
   */
  private addBenchmarkScenarios(): void {
    const components = this.createMockComponents();

    // Database binding benchmark
    this.benchmark.addScenario({
      name: 'Database Binding',
      description: 'Benchmark database binding performance',
      context: this.createDatabaseBindingContext(components),
      config: {
        iterations: 100,
        warmupIterations: 10,
        trackMemory: true,
        trackCpu: false
      },
      expected: {
        maxDuration: 100,
        minOpsPerSecond: 50,
        maxMemoryUsage: 10 * 1024 * 1024 // 10MB
      }
    });

    // Storage binding benchmark
    this.benchmark.addScenario({
      name: 'Storage Binding',
      description: 'Benchmark storage binding performance',
      context: this.createStorageBindingContext(components),
      config: {
        iterations: 100,
        warmupIterations: 10,
        trackMemory: true,
        trackCpu: false
      },
      expected: {
        maxDuration: 80,
        minOpsPerSecond: 60,
        maxMemoryUsage: 8 * 1024 * 1024 // 8MB
      }
    });

    // Cache binding benchmark
    this.benchmark.addScenario({
      name: 'Cache Binding',
      description: 'Benchmark cache binding performance',
      context: this.createCacheBindingContext(components),
      config: {
        iterations: 100,
        warmupIterations: 10,
        trackMemory: true,
        trackCpu: false
      },
      expected: {
        maxDuration: 90,
        minOpsPerSecond: 55,
        maxMemoryUsage: 12 * 1024 * 1024 // 12MB
      }
    });
  }

  /**
   * Create mock components for testing
   */
  private createMockComponents(): Component[] {
    // This would create actual mock components in a real implementation
    return [];
  }

  /**
   * Create database binding context
   */
  private createDatabaseBindingContext(components: Component[]): EnhancedBindingContext {
    return {
      source: {
        getName: () => 'api-service',
        getType: () => 'lambda-api'
      } as any,
      target: {
        getName: () => 'user-database',
        getType: () => 'rds-postgres'
      } as any,
      directive: {
        capability: 'db:postgres',
        access: 'readwrite',
        env: {}
      },
      environment: 'prod',
      complianceFramework: 'fedramp-moderate',
      targetCapabilityData: {
        type: 'db:postgres',
        endpoints: {
          host: 'user-db.cluster-xyz.us-east-1.rds.amazonaws.com',
          port: 5432
        },
        resources: {
          arn: 'arn:aws:rds:us-east-1:123456789012:cluster:user-database',
          name: 'users'
        },
        securityGroups: ['sg-user-database'],
        secrets: {
          secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:user-database-credentials'
        }
      }
    };
  }

  /**
   * Create storage binding context
   */
  private createStorageBindingContext(components: Component[]): EnhancedBindingContext {
    return {
      source: {
        getName: () => 'api-service',
        getType: () => 'lambda-api'
      } as any,
      target: {
        getName: () => 'user-storage',
        getType: () => 's3-bucket'
      } as any,
      directive: {
        capability: 'storage:s3',
        access: 'readwrite',
        env: {}
      },
      environment: 'prod',
      complianceFramework: 'fedramp-moderate',
      targetCapabilityData: {
        type: 'storage:s3',
        resources: {
          name: 'user-storage-bucket',
          arn: 'arn:aws:s3:::user-storage-bucket'
        },
        region: 'us-east-1',
        encryption: {
          algorithm: 'AES256'
        }
      }
    };
  }

  /**
   * Create cache binding context
   */
  private createCacheBindingContext(components: Component[]): EnhancedBindingContext {
    return {
      source: {
        getName: () => 'api-service',
        getType: () => 'lambda-api'
      } as any,
      target: {
        getName: () => 'user-cache',
        getType: () => 'elasticache-redis'
      } as any,
      directive: {
        capability: 'cache:redis',
        access: 'readwrite',
        env: {}
      },
      environment: 'prod',
      complianceFramework: 'fedramp-moderate',
      targetCapabilityData: {
        type: 'cache:redis',
        endpoints: {
          host: 'user-cache.cache.amazonaws.com',
          port: 6379
        },
        resources: {
          arn: 'arn:aws:elasticache:us-east-1:123456789012:cluster:user-cache'
        },
        securityGroups: ['sg-user-cache'],
        secrets: {
          authToken: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:user-cache-auth-token'
        },
        auth: { enabled: true }
      }
    };
  }

  /**
   * Create queue binding context
   */
  private createQueueBindingContext(components: Component[]): EnhancedBindingContext {
    return {
      source: {
        getName: () => 'api-service',
        getType: () => 'lambda-api'
      } as any,
      target: {
        getName: () => 'order-queue',
        getType: () => 'sqs-queue'
      } as any,
      directive: {
        capability: 'queue:sqs',
        access: 'write',
        env: {},
        options: {
          deadLetterQueue: {
            maxReceiveCount: 3,
            queueArn: 'arn:aws:sqs:us-east-1:123456789012:order-dlq'
          }
        }
      },
      environment: 'prod',
      complianceFramework: 'fedramp-moderate',
      targetCapabilityData: {
        type: 'queue:sqs',
        resources: {
          url: 'https://sqs.us-east-1.amazonaws.com/123456789012/order-queue',
          arn: 'arn:aws:sqs:us-east-1:123456789012:order-queue'
        },
        region: 'us-east-1',
        deadLetterQueue: {
          url: 'https://sqs.us-east-1.amazonaws.com/123456789012/order-dlq',
          arn: 'arn:aws:sqs:us-east-1:123456789012:order-dlq'
        }
      }
    };
  }

  /**
   * Create Lambda binding context
   */
  private createLambdaBindingContext(components: Component[]): EnhancedBindingContext {
    return {
      source: {
        getName: () => 'api-service',
        getType: () => 'lambda-api'
      } as any,
      target: {
        getName: () => 'notification-service',
        getType: () => 'lambda-function'
      } as any,
      directive: {
        capability: 'lambda:function',
        access: 'read',
        env: {}
      },
      environment: 'prod',
      complianceFramework: 'fedramp-moderate',
      targetCapabilityData: {
        type: 'lambda:function',
        resources: {
          name: 'notification-service',
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:notification-service'
        },
        region: 'us-east-1',
        config: {
          timeout: 30,
          memorySize: 256
        }
      }
    };
  }

  /**
   * Create API Gateway binding context
   */
  private createApiGatewayBindingContext(components: Component[]): EnhancedBindingContext {
    return {
      source: {
        getName: () => 'web-service',
        getType: () => 'ecs-service'
      } as any,
      target: {
        getName: () => 'api-gateway',
        getType: () => 'api-gateway-http'
      } as any,
      directive: {
        capability: 'api:gateway',
        access: 'readwrite',
        env: {}
      },
      environment: 'prod',
      complianceFramework: 'fedramp-moderate',
      targetCapabilityData: {
        type: 'api:gateway',
        endpoints: {
          url: 'https://api.example.com'
        },
        resources: {
          arn: 'arn:aws:execute-api:us-east-1:123456789012:api123/*',
          id: 'api123'
        },
        region: 'us-east-1',
        stage: {
          name: 'prod'
        }
      }
    };
  }
}

// Example usage
if (require.main === module) {
  const example = new EnhancedBinderExample();
  example.demonstrateEnhancedBindings().catch(console.error);
}
