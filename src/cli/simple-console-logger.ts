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
      console.log('ℹ', message);
      if (data && this.config.verbose) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  debug(message: string, data?: any) {
    this.addToLogs('debug', message, data);

    if (this.config.verbose) {
      if (this.config.ci) {
        console.log(JSON.stringify({
          level: 'debug',
          message,
          data,
          timestamp: new Date().toISOString()
        }));
      } else {
        console.log('🔍', message);
        if (data) {
          console.log(JSON.stringify(data, null, 2));
        }
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
      console.log('⚠', message);
      if (data && this.config.verbose) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  error(message: string, data?: any) {
    this.addToLogs('error', message, data);

    if (this.config.ci) {
      console.error(JSON.stringify({
        level: 'error',
        message,
        data,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.error('❌', message);
      if (data && this.config.verbose) {
        console.error(JSON.stringify(data, null, 2));
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
      console.log('✅', message);
      if (data && this.config.verbose) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  private addToLogs(level: string, message: string, data?: any) {
    // Simple in-memory log storage for debugging
    // In a real implementation, this would be more sophisticated
  }
}
