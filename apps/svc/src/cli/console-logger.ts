import { randomUUID } from 'crypto';
import {
  Logger as PlatformLogger,
  type LoggerOptions,
  type LogLevel,
  type Timer
} from '@platform/logger';

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

  info(message: string, options?: LoggerOptions): void {
    this.capture('INFO', message, options?.data);
    this.baseLogger.info(message, options);
  }

  success(message: string, data?: any): void {
    this.capture('SUCCESS', message, data);
    this.baseLogger.info(message, this.buildOptions({ status: 'success', ...toObject(data) }));
  }

  warn(message: string, options?: LoggerOptions): void {
    this.capture('WARN', message, options?.data);
    this.baseLogger.warn(message, options);
  }

  error(message: string, error?: Error | any, options?: LoggerOptions): void {
    this.capture('ERROR', message, error);
    this.baseLogger.error(message, error, options);
  }

  debug(message: string, options?: LoggerOptions): void {
    if (!this.verbose) {
      return;
    }

    this.capture('DEBUG', message, options?.data);
    this.baseLogger.debug(message, options);
  }

  trace(message: string, options?: LoggerOptions): void {
    if (!this.verbose) {
      return;
    }
    this.capture('TRACE', message, options?.data);
    this.baseLogger.trace(message, options);
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

function toObject(data?: any): Record<string, unknown> | undefined {
  if (data === undefined || data === null) {
    return undefined;
  }

  if (typeof data === 'object') {
    return data as Record<string, unknown>;
  }

  return { value: data };
}
