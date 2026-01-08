/**
 * Console Logger
 *
 * CLI-specific logger that wraps the platform's structured logger to provide
 * ergonomic helpers for command implementations. This logger bridges the gap
 * between the platform's structured logging (JSON) and CLI-friendly output
 * (human-readable messages with emoji indicators).
 *
 * Features:
 * - Dual-mode output: human-readable for interactive use, JSON for CI mode
 * - Log level filtering based on verbose flag
 * - Success/warn/error/info/debug methods with consistent formatting
 * - Structured data support with optional verbose JSON output
 * - Log capture for testing and programmatic access
 *
 * The logger automatically switches to structured JSON output when `--ci` flag
 * is set, making it suitable for CI/CD pipeline integration.
 */

import { randomUUID } from 'crypto';
import {
  PlatformLogger,
  type LoggerOptions,
  type PlatformLogLevel as LogLevel,
  type Timer
} from '@shinobi/core';

type PlatformLoggerInstance = InstanceType<typeof PlatformLogger>;

export interface LoggerConfig {
  verbose: boolean;
  ci: boolean;
  environment?: string;
  compliance?: string;
  serviceName?: string;
  region?: string;
}

interface CapturedLog {
  level: LogLevel | 'SUCCESS';
  message: string;
  data?: any;
  timestamp: string;
}

/**
 * CLI logger that wraps the platform structured logger to provide
 * ergonomic helpers used by the existing commands (e.g. `success`).
 */
export class Logger {
  private readonly instanceId = randomUUID();
  private capturedLogs: CapturedLog[] = [];
  private verbose = false;
  private ci = false;
  private readonly baseLogger: PlatformLoggerInstance;
  private currentConfig: LoggerConfig = { verbose: false, ci: false };

  constructor(name = 'shinobi.cli') {
    this.baseLogger = PlatformLogger.getLogger?.(name) ?? new PlatformLogger(name);
  }

  configure(config: LoggerConfig): void {
    this.currentConfig = { ...this.currentConfig, ...config };
    this.verbose = !!this.currentConfig.verbose;
    this.ci = !!this.currentConfig.ci;
    this.applyGlobalContext();
  }

  get platformLogger(): PlatformLoggerInstance {
    return this.baseLogger;
  }

  updateContext(context: Partial<Omit<LoggerConfig, 'verbose' | 'ci'>>): void {
    this.configure({ ...this.currentConfig, ...context });
  }

  getCurrentConfig(): LoggerConfig {
    return { ...this.currentConfig };
  }

  /**
   * Check if running in CI mode
   */
  get isCi(): boolean {
    return this.ci;
  }

  info(message: string, options?: LoggerOptions): void {
    this.capture('INFO', message, options?.data);
    
    if (this.ci) {
      // CI mode: structured JSON output only (via baseLogger)
      this.baseLogger.info(message, options);
    } else {
      // Interactive mode: human-readable output only
      // Logs are still captured via capture() for testing
      console.log(`ℹ️  ${message}`);
      if (options?.data && this.verbose) {
        console.log(JSON.stringify(options.data, null, 2));
      }
    }
  }

  success(message: string, data?: any): void {
    this.capture('SUCCESS', message, data);
    
    if (this.ci) {
      // CI mode: structured JSON output only (via baseLogger)
      this.baseLogger.info(message, this.buildOptions({ status: 'success', ...toObject(data) }));
    } else {
      // Interactive mode: human-readable output only
      // Logs are still captured via capture() for testing
      console.log(`✅ ${message}`);
      if (data && this.verbose) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  warn(message: string, options?: LoggerOptions): void {
    this.capture('WARN', message, options?.data);
    
    if (this.ci) {
      // CI mode: structured JSON output only (via baseLogger)
      this.baseLogger.warn(message, options);
    } else {
      // Interactive mode: human-readable output only
      // Logs are still captured via capture() for testing
      console.warn(`⚠️  ${message}`);
      if (options?.data && this.verbose) {
        console.warn(JSON.stringify(options.data, null, 2));
      }
    }
  }

  error(message: string, error?: Error | any, options?: LoggerOptions): void {
    this.capture('ERROR', message, error);
    
    if (this.ci) {
      // CI mode: structured JSON output only (via baseLogger)
      this.baseLogger.error(message, error, options);
    } else {
      // Interactive mode: human-readable output only
      // Logs are still captured via capture() for testing
      console.error(`❌ ${message}`);
      if (error instanceof Error) {
        console.error(error.stack || error.message);
      } else if (error && this.verbose) {
        console.error(JSON.stringify(error, null, 2));
      }
      if (options?.data && this.verbose) {
        console.error(JSON.stringify(options.data, null, 2));
      }
    }
  }

  debug(message: string, options?: LoggerOptions): void {
    if (!this.verbose) {
      return;
    }

    this.capture('DEBUG', message, options?.data);
    
    if (this.ci) {
      // CI mode: structured JSON output only (via baseLogger)
      this.baseLogger.debug(message, options);
    } else {
      // Interactive mode: human-readable output only
      // Logs are still captured via capture() for testing
      console.log(`🔍 ${message}`);
      if (options?.data) {
        console.log(JSON.stringify(options.data, null, 2));
      }
    }
  }

  trace(message: string, options?: LoggerOptions): void {
    if (!this.verbose) {
      return;
    }
    
    this.capture('TRACE', message, options?.data);
    
    if (this.ci) {
      // CI mode: structured JSON output only (via baseLogger)
      this.baseLogger.trace(message, options);
    } else {
      // Interactive mode: human-readable output only
      // Logs are still captured via capture() for testing
      console.log(`🔎 ${message}`);
      if (options?.data) {
        console.log(JSON.stringify(options.data, null, 2));
      }
    }
  }

  isDebugEnabled(): boolean {
    return this.verbose && this.baseLogger.isDebugEnabled();
  }

  isTraceEnabled(): boolean {
    return this.verbose && this.baseLogger.isTraceEnabled();
  }

  startTimer(): Timer {
    return this.baseLogger.startTimer();
  }

  async flush(): Promise<void> {
    await this.baseLogger.flush();
  }

  getLogs(): CapturedLog[] {
    return [...this.capturedLogs];
  }

  private capture(level: LogLevel | 'SUCCESS', message: string, data?: any): void {
    this.capturedLogs.push({
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  private buildOptions(data?: any): LoggerOptions | undefined {
    const normalized = toObject(data);
    return normalized ? { data: normalized } : undefined;
  }

  private applyGlobalContext(): void {
    const config = this.currentConfig;
    const serviceName = config.serviceName ?? 'shinobi-cli';
    const serviceVersion = process.env.SHINOBI_CLI_VERSION ?? process.env.SVC_VERSION ?? '0.1.0';
    const environmentName = config.environment ?? 'unknown';
    const region = config.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'unknown';
    const compliance = config.compliance ?? 'unknown';

    PlatformLogger.setGlobalContext({
      service: {
        name: serviceName,
        version: serviceVersion,
        instance: `cli-${this.instanceId}`
      },
      environment: {
        name: environmentName,
        region,
        compliance
      }
    });
  }
}

/**
 * Convert data to a plain object for structured logging
 * Handles primitives, objects, and null/undefined
 */
function toObject(data?: any): Record<string, unknown> | undefined {
  if (data === undefined || data === null) {
    return undefined;
  }

  if (typeof data === 'object' && !Array.isArray(data) && !(data instanceof Error)) {
    return data as Record<string, unknown>;
  }

  // Wrap primitives and arrays in a value property
  return { value: data };
}
