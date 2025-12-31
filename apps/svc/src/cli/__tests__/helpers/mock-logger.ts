/**
 * Mock Logger Helpers
 * 
 * Provides utilities for creating mock Logger instances for testing.
 */

import type { Logger } from '../../console-logger.js';

export interface CapturedLog {
  level: string;
  message: string;
  data?: any;
  timestamp: string;
}

/**
 * Creates a mock Logger with all methods stubbed as Jest mocks
 */
export function createMockLogger(): Logger {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    configure: jest.fn(),
    updateContext: jest.fn(),
    getCurrentConfig: jest.fn().mockReturnValue({ verbose: false, ci: false }),
    getLogs: jest.fn().mockReturnValue([]),
    capture: jest.fn(),
    isCi: false,
    platformLogger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn()
    } as any
  } as unknown as Logger;
}

/**
 * Creates a Logger that captures all log calls for assertions
 */
export class CapturingLogger {
  private capturedLogs: CapturedLog[] = [];
  public isCi = false;
  private currentConfig: any = { verbose: false, ci: false };

  info(message: string, options?: any): void {
    this.capture('INFO', message, options?.data);
  }

  warn(message: string, options?: any): void {
    this.capture('WARN', message, options?.data);
  }

  error(message: string, error?: any): void {
    this.capture('ERROR', error instanceof Error ? error.message : String(error), error);
  }

  success(message: string, options?: any): void {
    this.capture('SUCCESS', message, options?.data);
  }

  debug(message: string, options?: any): void {
    this.capture('DEBUG', message, options?.data);
  }

  trace(message: string, options?: any): void {
    this.capture('TRACE', message, options?.data);
  }

  configure(_config: any): void {
    // No-op for capturing logger
  }

  updateContext(_context: any): void {
    // Merge context into currentConfig
    this.currentConfig = { ...this.currentConfig, ..._context };
  }

  capture(level: string, message: string, data?: any): void {
    this.capturedLogs.push({
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  getLogs(): CapturedLog[] {
    return [...this.capturedLogs];
  }

  get platformLogger(): any {
    return {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn()
    };
  }
}

/**
 * Creates a capturing logger instance
 */
export function createCapturingLogger(): CapturingLogger {
  return new CapturingLogger();
}

