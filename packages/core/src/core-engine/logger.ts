/**
 * Enterprise-grade logger for the CDK Platform
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
}

export class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  success(message: string, data?: any): void {
    this.log(LogLevel.SUCCESS, message, data);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.logLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data
    };

    this.logs.push(logEntry);

    // Console output with colors
    const timestamp = logEntry.timestamp.toISOString();
    const prefix = this.getLevelPrefix(level);
    
    if (data) {
      console.log(`${timestamp} ${prefix} ${message}`, data);
    } else {
      console.log(`${timestamp} ${prefix} ${message}`);
    }
  }

  private getLevelPrefix(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '[DEBUG]';
      case LogLevel.INFO:
        return '[INFO] ';
      case LogLevel.WARN:
        return '[WARN] ';
      case LogLevel.ERROR:
        return '[ERROR]';
      case LogLevel.SUCCESS:
        return '[SUCCESS]';
      default:
        return '[UNKNOWN]';
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}