/**
 * Console Logger Tests
 * 
 * Tests for the CLI console logger implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../console-logger.js';

describe('Logger', () => {
  let logger: Logger;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = new Logger('test-logger');
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('configure', () => {
    it('Configure__VerboseAndCiFlags__SetsConfigCorrectly', () => {
      logger.configure({ verbose: true, ci: true });
      
      expect(logger.getCurrentConfig().verbose).toBe(true);
      expect(logger.getCurrentConfig().ci).toBe(true);
      expect(logger.isCi).toBe(true);
    });

    it('Configure__ExistingConfig__MergesValues', () => {
      logger.configure({ verbose: true, ci: false });
      logger.configure({ verbose: true, ci: false, serviceName: 'test-service' });
      
      const config = logger.getCurrentConfig();
      expect(config.verbose).toBe(true);
      expect(config.ci).toBe(false);
      expect(config.serviceName).toBe('test-service');
    });
  });

  describe('debug and trace', () => {
    it('Debug__VerboseFalse__DoesNotLog', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.debug('debug message');
      logger.trace('trace message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('Debug__VerboseTrue__LogsMessage', () => {
      logger.configure({ verbose: true, ci: false });
      
      logger.debug('debug message');
      logger.trace('trace message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('🔍 debug message');
      expect(consoleLogSpy).toHaveBeenCalledWith('🔎 trace message');
    });
  });

  describe('success', () => {
    it('Success__CiMode__MapsToInfoWithStatus', () => {
      logger.configure({ verbose: false, ci: true });
      const baseLoggerSpy = vi.spyOn(logger.platformLogger, 'info');
      
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

    it('Success__NonCiMode__OutputsEmoji', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.success('Operation completed');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Operation completed');
    });
  });

  describe('capture', () => {
    it('Capture__AllLogLevels__RecordsCorrectly', () => {
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

    it('Capture__WithData__CapturesDataWithEntries', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.info('info message', { data: { key: 'value' } });
      
      const logs = logger.getLogs();
      expect(logs[0].data).toEqual({ key: 'value' });
    });
  });

  describe('getLogs', () => {
    it('GetLogs__MultipleEntries__ReturnsCorrectEntries', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.info('message 1');
      logger.warn('message 2');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('message 1');
      expect(logs[1].message).toBe('message 2');
    });

    it('GetLogs__MultipleCalls__ReturnsCopy', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.info('message 1');
      const logs1 = logger.getLogs();
      const logs2 = logger.getLogs();
      
      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });
  });

  describe('updateContext', () => {
    it('UpdateContext__NewContext__MergesProperly', () => {
      logger.configure({ verbose: false, ci: false });
      
      logger.updateContext({ serviceName: 'test-service', environment: 'dev' });
      
      const config = logger.getCurrentConfig();
      expect(config.serviceName).toBe('test-service');
      expect(config.environment).toBe('dev');
    });

    it('UpdateContext__PartialContext__PreservesExistingConfig', () => {
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
    it('GlobalContext__FullConfig__SetsAllFields', () => {
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
    it('HumanReadableFormatting__NonCiMode__UsesEmoji', () => {
      logger.configure({ verbose: true, ci: false });
      
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

    it('HumanReadableFormatting__CiMode__DoesNotUseEmoji', () => {
      logger.configure({ verbose: false, ci: true });
      const baseLoggerSpy = vi.spyOn(logger.platformLogger, 'info');
      
      logger.info('info message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(baseLoggerSpy).toHaveBeenCalled();
    });
  });

  describe('structured JSON in CI mode', () => {
    it('StructuredJson__CiMode__UsesBaseLogger', () => {
      logger.configure({ verbose: false, ci: true });
      const baseLoggerSpy = vi.spyOn(logger.platformLogger, 'info');
      
      logger.info('info message', { data: { key: 'value' } });
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(baseLoggerSpy).toHaveBeenCalledWith('info message', { data: { key: 'value' } });
    });
  });

  describe('isCi getter', () => {
    it('IsCi__Configured__ReturnsCorrectValue', () => {
      logger.configure({ verbose: false, ci: true });
      expect(logger.isCi).toBe(true);
      
      logger.configure({ verbose: false, ci: false });
      expect(logger.isCi).toBe(false);
    });
  });

  describe('toObject utility', () => {
    it('ToObject__Undefined__HandlesGracefully', () => {
      logger.configure({ verbose: false, ci: false });
      logger.info('message', { data: undefined });
      
      // Should not throw and should handle undefined gracefully
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('ToObject__Null__HandlesGracefully', () => {
      logger.configure({ verbose: false, ci: false });
      logger.info('message', { data: null });
      
      // Should not throw and should handle null gracefully
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('ToObject__Objects__HandlesCorrectly', () => {
      logger.configure({ verbose: true, ci: false });
      logger.info('message', { data: { key: 'value' } });
      
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️  message');
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify({ key: 'value' }, null, 2));
    });

    it('ToObject__Primitives__HandlesCorrectly', () => {
      logger.configure({ verbose: true, ci: false });
      logger.info('message', { data: 'string value' });
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('ToObject__Arrays__HandlesCorrectly', () => {
      logger.configure({ verbose: true, ci: false });
      logger.info('message', { data: [1, 2, 3] });
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('ToObject__ErrorObjects__HandlesCorrectly', () => {
      logger.configure({ verbose: false, ci: false });
      const error = new Error('test error');
      
      logger.error('error message', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack || error.message);
    });
  });
});

