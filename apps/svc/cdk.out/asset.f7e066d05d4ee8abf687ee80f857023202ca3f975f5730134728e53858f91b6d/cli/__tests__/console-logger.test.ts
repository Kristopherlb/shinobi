/**
 * Console Logger Tests
 * 
 * Tests for the CLI console logger implementation.
 */

import { Logger } from '../console-logger.js';

// Mock console methods to verify output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('Logger', () => {
  let logger: Logger;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger('test-logger');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('configure', () => {
    it('sets verbose/ci correctly', () => {
      logger.configure({ verbose: true, ci: true });
      
      expect(logger.getCurrentConfig().verbose).toBe(true);
      expect(logger.getCurrentConfig().ci).toBe(true);
      expect(logger.isCi).toBe(true);
    });

    it('merges config with existing values', () => {
      logger.configure({ verbose: true, ci: false });
      logger.configure({ verbose: true, ci: false, serviceName: 'test-service' });
      
      const config = logger.getCurrentConfig();
      expect(config.verbose).toBe(true);
      expect(config.ci).toBe(false);
      expect(config.serviceName).toBe('test-service');
    });
  });

  describe('debug and trace', () => {
    it('only log when verbose = true', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.debug('debug message');
      logger.trace('trace message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('log when verbose = true', () => {
      logger.configure({ verbose: true, ci: false });
      
      logger.debug('debug message');
      logger.trace('trace message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('🔍 debug message');
      expect(consoleLogSpy).toHaveBeenCalledWith('🔎 trace message');
    });
  });

  describe('success', () => {
    it('maps to info with status: success in CI mode', () => {
      logger.configure({ verbose: false, ci: true });
      const baseLoggerSpy = jest.spyOn(logger.platformLogger, 'info');
      
      logger.success('Operation completed');
      
      expect(baseLoggerSpy).toHaveBeenCalledWith(
        'Operation completed',
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'success'
          })
        })
      );
    });

    it('outputs emoji in non-CI mode', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.success('Operation completed');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Operation completed');
    });
  });

  describe('capture', () => {
    it('records all log levels correctly', () => {
      logger.configure({ verbose: true, ci: false });
      
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.success('success message');
      logger.debug('debug message');
      logger.trace('trace message');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(6);
      expect(logs[0].level).toBe('INFO');
      expect(logs[1].level).toBe('WARN');
      expect(logs[2].level).toBe('ERROR');
      expect(logs[3].level).toBe('SUCCESS');
      expect(logs[4].level).toBe('DEBUG');
      expect(logs[5].level).toBe('TRACE');
    });

    it('captures data with log entries', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.info('info message', { data: { key: 'value' } });
      
      const logs = logger.getLogs();
      expect(logs[0].data).toEqual({ key: 'value' });
    });
  });

  describe('getLogs', () => {
    it('returns correct captured entries', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.info('message 1');
      logger.warn('message 2');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('message 1');
      expect(logs[1].message).toBe('message 2');
    });

    it('returns a copy of captured logs', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.info('message 1');
      const logs1 = logger.getLogs();
      const logs2 = logger.getLogs();
      
      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });
  });

  describe('updateContext', () => {
    it('merges context properly', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.updateContext({ serviceName: 'test-service', environment: 'dev' });
      
      const config = logger.getCurrentConfig();
      expect(config.serviceName).toBe('test-service');
      expect(config.environment).toBe('dev');
    });

    it('preserves existing config when updating context', () => {
      logger.configure({ verbose: true, ci: false });
      
      // updateContext accepts Partial<Omit<LoggerConfig, 'verbose' | 'ci'>>
      logger.updateContext({ serviceName: 'test-service' } as any);
      
      const config = logger.getCurrentConfig();
      expect(config.verbose).toBe(true);
      expect(config.ci).toBe(false);
      expect(config.serviceName).toBe('test-service');
    });
  });

  describe('global context', () => {
    it('sets service/version/instance/environment', () => {
      logger.configure({
        verbose: false,
        ci: false,
        serviceName: 'test-service',
        environment: 'dev',
        region: 'us-east-1',
        compliance: 'commercial'
      });
      
      // Global context is set via PlatformLogger.setGlobalContext
      // We can verify the config was stored correctly
      const config = logger.getCurrentConfig();
      expect(config.serviceName).toBe('test-service');
      expect(config.environment).toBe('dev');
      expect(config.region).toBe('us-east-1');
      expect(config.compliance).toBe('commercial');
    });
  });

  describe('human-readable formatting', () => {
    it('uses emoji in non-CI mode', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.success('success message');
      logger.debug('debug message');
      logger.trace('trace message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️  info message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  warn message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ error message');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ success message');
      expect(consoleLogSpy).toHaveBeenCalledWith('🔍 debug message');
      expect(consoleLogSpy).toHaveBeenCalledWith('🔎 trace message');
    });

    it('does not use emoji in CI mode', () => {
      logger.configure({ verbose: false, ci: true });
      const baseLoggerSpy = jest.spyOn(logger.platformLogger, 'info');
      
      logger.info('info message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(baseLoggerSpy).toHaveBeenCalled();
    });
  });

  describe('structured JSON in CI mode', () => {
    it('uses baseLogger in CI mode', () => {
      logger.configure({ verbose: false, ci: true });
      const baseLoggerSpy = jest.spyOn(logger.platformLogger, 'info');
      
      logger.info('info message', { data: { key: 'value' } });
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(baseLoggerSpy).toHaveBeenCalledWith('info message', { data: { key: 'value' } });
    });
  });

  describe('isCi getter', () => {
    it('returns correct value', () => {
      logger.configure({ verbose: false, ci: true });
      expect(logger.isCi).toBe(true);
      
      logger.configure({ verbose: false, ci: false });
      expect(logger.isCi).toBe(false);
    });
  });

  describe('toObject utility', () => {
    it('handles undefined', () => {
      logger.configure({ verbose: false, ci: false });
      logger.info('message', { data: undefined });
      
      // Should not throw and should handle undefined gracefully
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('handles null', () => {
      logger.configure({ verbose: false, ci: false });
      logger.info('message', { data: null });
      
      // Should not throw and should handle null gracefully
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('handles objects', () => {
      logger.configure({ verbose: true, ci: false });
      logger.info('message', { data: { key: 'value' } });
      
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️  message');
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify({ key: 'value' }, null, 2));
    });

    it('handles primitives', () => {
      logger.configure({ verbose: true, ci: false });
      logger.info('message', { data: 'string value' });
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('handles arrays', () => {
      logger.configure({ verbose: true, ci: false });
      logger.info('message', { data: [1, 2, 3] });
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('handles Error objects', () => {
      logger.configure({ verbose: false, ci: false });
      const error = new Error('test error');
      
      logger.error('error message', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack || error.message);
    });
  });
});

