test('Infrastructure app runs without errors', () => {
  require('../src/app');
});

test('Infrastructure can import core components', () => {
  const { Logger } = require('@shinobi/core');

  // Test that we can create a logger instance
  const logger = Logger.getLogger('test');
  expect(logger).toBeDefined();
  expect(typeof logger.info).toBe('function');
  expect(typeof logger.error).toBe('function');
  expect(typeof logger.warn).toBe('function');
  expect(typeof logger.debug).toBe('function');
});
