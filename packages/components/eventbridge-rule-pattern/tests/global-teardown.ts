/**
 * Global teardown for eventbridge-rule-pattern tests
 * Ensures clean exit after all tests complete
 * 
 * CDK App/Stack instances can hold references that prevent Node.js from exiting.
 * This teardown ensures the process exits cleanly after all tests complete.
 */

export default async function globalTeardown() {
  // Log that teardown is running (for debugging)
  console.error('[global-teardown] Starting teardown...');
  
  // Give any pending operations a moment to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.error('[global-teardown] Forcing process exit...');
  
  // Force immediate exit - don't wait for event loop
  // This is safe because all tests have completed at this point
  if (typeof process !== 'undefined' && process.exit) {
    process.exit(0);
  }
}

