#!/usr/bin/env tsx
/**
 * Test script for Dagger Pipeline Integration
 * 
 * Validates that the pipeline can be executed with different configurations
 * and provides a simple way to test the integration locally.
 */

import { runPlatformPipeline } from './pipelines/platform-pipeline';
import { dag } from '@dagger.io/dagger';

// Test configurations
const testConfigs = [
  {
    name: 'Development Pipeline',
    config: {
      source: dag.host().directory('.'),
      environment: 'dev',
      complianceFramework: 'commercial' as const,
      useFipsCompliantImages: false,
      enableMtls: false,
      outputFormat: 'pretty' as const,
      steps: {
        validate: true,
        test: false, // Skip tests for quick validation
        audit: false, // Skip audit for quick validation
        plan: true,
        deploy: false,
      },
    },
  },
  {
    name: 'Staging Pipeline',
    config: {
      source: dag.host().directory('.'),
      environment: 'staging',
      complianceFramework: 'fedramp-moderate' as const,
      useFipsCompliantImages: true,
      enableMtls: true,
      outputFormat: 'json' as const,
      steps: {
        validate: true,
        test: false,
        audit: true,
        plan: true,
        deploy: false,
      },
    },
  },
  {
    name: 'Production Pipeline',
    config: {
      source: dag.host().directory('.'),
      environment: 'prod',
      complianceFramework: 'fedramp-high' as const,
      useFipsCompliantImages: true,
      enableMtls: true,
      outputFormat: 'json' as const,
      steps: {
        validate: true,
        test: false,
        audit: true,
        plan: true,
        deploy: false,
      },
    },
  },
];

// Test runner
async function runTests() {
  console.log('🥷 Starting Dagger Pipeline Integration Tests\n');

  let passed = 0;
  let failed = 0;

  for (const test of testConfigs) {
    console.log(`\n📋 Running: ${test.name}`);
    console.log(`   Environment: ${test.config.environment}`);
    console.log(`   Compliance: ${test.config.complianceFramework}`);
    console.log(`   FIPS: ${test.config.useFipsCompliantImages}`);
    console.log(`   mTLS: ${test.config.enableMtls}`);

    try {
      const startTime = Date.now();

      // Run the pipeline
      await runPlatformPipeline(test.config);

      const duration = Date.now() - startTime;
      console.log(`   ✅ PASSED (${duration}ms)`);
      passed++;

    } catch (error) {
      console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log('\n🎉 All tests passed!');
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🥷 Dagger Pipeline Test Runner

Usage: tsx test-pipeline.ts [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Enable verbose output
  --quick        Run only development pipeline test

Examples:
  tsx test-pipeline.ts
  tsx test-pipeline.ts --verbose
  tsx test-pipeline.ts --quick
`);
    process.exit(0);
  }

  const verbose = args.includes('--verbose') || args.includes('-v');
  const quick = args.includes('--quick');

  if (verbose) {
    console.log('🔍 Verbose mode enabled');
  }

  if (quick) {
    console.log('⚡ Quick mode: running only development pipeline test');
    // Run only the first test
    const test = testConfigs[0];
    console.log(`\n📋 Running: ${test.name}`);
    try {
      await runPlatformPipeline(test.config);
      console.log('✅ Quick test passed!');
    } catch (error) {
      console.error('❌ Quick test failed:', error);
      process.exit(1);
    }
  } else {
    await runTests();
  }
}

// Run main function if this is the main module
if (import.meta.main) {
  main().catch(console.error);
}
