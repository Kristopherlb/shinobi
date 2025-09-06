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
}

// Legacy singleton export - deprecated, use dependency injection instead
export const logger = new Logger();