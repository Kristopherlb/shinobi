import chalk from 'chalk';

export interface LoggerConfig {
  verbose: boolean;
  ci: boolean;
}

export class Logger {
  private config: LoggerConfig = { verbose: false, ci: false };

  configure(config: LoggerConfig) {
    this.config = config;
  }

  info(message: string, data?: any) {
    this.addToLogs('info', message, data);
    
    if (this.config.ci) {
      console.log(JSON.stringify({
        level: 'info',
        message,
        data,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.log(chalk.blue('ℹ'), message);
      if (data && this.config.verbose) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  success(message: string, data?: any) {
    this.addToLogs('success', message, data);
    
    if (this.config.ci) {
      console.log(JSON.stringify({
        level: 'success',
        message,
        data,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.log(chalk.green('✓'), message);
      if (data && this.config.verbose) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  warn(message: string, data?: any) {
    this.addToLogs('warn', message, data);
    
    if (this.config.ci) {
      console.log(JSON.stringify({
        level: 'warn',
        message,
        data,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.warn(chalk.yellow('⚠'), message);
      if (data && this.config.verbose) {
        console.warn(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  error(message: string, error?: any) {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;

    this.addToLogs('error', message, errorData);

    if (this.config.ci) {
      console.error(JSON.stringify({
        level: 'error',
        message,
        error: errorData,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.error(chalk.red('✗'), message);
      if (error && this.config.verbose) {
        console.error(chalk.gray(error instanceof Error ? error.stack : JSON.stringify(errorData, null, 2)));
      }
    }
  }

  debug(message: string, data?: any) {
    if (!this.config.verbose) return;

    if (this.config.ci) {
      console.log(JSON.stringify({
        level: 'debug',
        message,
        data,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.log(chalk.gray('🔍'), chalk.gray(message));
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  // Enhanced methods for migration tool
  private logs: Array<{ level: string; message: string; data?: any; timestamp: string }> = [];

  getLogs(): Array<{ level: number; message: string; data?: any; timestamp: string }> {
    return this.logs.map(log => ({
      level: this.getLevelNumber(log.level),
      message: log.message,
      data: log.data,
      timestamp: log.timestamp
    }));
  }

  private getLevelNumber(level: string): number {
    const levels: Record<string, number> = {
      'debug': 0,
      'info': 1,
      'warn': 2,
      'error': 3,
      'success': 4
    };
    return levels[level] || 1;
  }

  private addToLogs(level: string, message: string, data?: any): void {
    this.logs.push({
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

// Legacy singleton export - deprecated, use dependency injection instead
export const logger = new Logger();