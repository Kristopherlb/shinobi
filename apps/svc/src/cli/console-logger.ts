import { randomUUID } from 'crypto';
import { Logger as PlatformLogger, LoggerOptions, LogLevel, Timer } from '@platform/logger';

export interface LoggerConfig {
  verbose: boolean;
  ci: boolean;
  environment?: string;
  compliance?: string;
  serviceName?: string;
}

interface CapturedLog {
  level: LogLevel | 'SUCCESS';
  message: string;
  data?: any;
  timestamp: string;
}

/**
 * CLI logger that extends the platform structured logger to provide
 * ergonomic helpers used by the existing commands (e.g. `success`).
 */
export class Logger extends PlatformLogger {
  private readonly instanceId = randomUUID();
  private capturedLogs: CapturedLog[] = [];
  private verbose = false;
  private ci = false;

  constructor(name = 'svc.cli') {
    super(name);
  }

  configure(config: LoggerConfig): void {
    this.verbose = !!config.verbose;
    this.ci = !!config.ci;

    PlatformLogger.setGlobalContext({
      service: {
        name: config.serviceName ?? 'svc-cli',
        version: process.env.SVC_VERSION ?? '0.1.0',
        instance: `cli-${this.instanceId}`
      },
      environment: {
        name: config.environment ?? (this.ci ? 'ci' : 'local'),
        region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
        compliance: config.compliance ?? 'commercial'
      }
    });
  }

  override info(message: string, options?: LoggerOptions): void {
    this.capture('INFO', message, options?.data);
    super.info(message, options);
  }

  success(message: string, data?: any): void {
    this.capture('SUCCESS', message, data);
    super.info(message, this.buildOptions({ status: 'success', ...toObject(data) }));
  }

  override warn(message: string, options?: LoggerOptions): void {
    this.capture('WARN', message, options?.data);
    super.warn(message, options);
  }

  override error(message: string, error?: Error | any, options?: LoggerOptions): void {
    this.capture('ERROR', message, error);
    super.error(message, error, options);
  }

  override debug(message: string, options?: LoggerOptions): void {
    if (!this.verbose) {
      return;
    }

    this.capture('DEBUG', message, options?.data);
    super.debug(message, options);
  }

  override trace(message: string, options?: LoggerOptions): void {
    if (!this.verbose) {
      return;
    }
    this.capture('TRACE', message, options?.data);
    super.trace(message, options);
  }

  override isDebugEnabled(): boolean {
    return this.verbose && super.isDebugEnabled();
  }

  override isTraceEnabled(): boolean {
    return this.verbose && super.isTraceEnabled();
  }

  override startTimer(): Timer {
    return super.startTimer();
  }

  override async flush(): Promise<void> {
    await super.flush();
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
