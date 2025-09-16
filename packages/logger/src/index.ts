/**
 * Simple mock logger for testing
 */

export class Logger {
  private static globalContext: any = {};

  static getLogger(name: string): any {
    return {
      info: (message: string, ...args: any[]) => console.log(`[${name}] INFO:`, message, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[${name}] WARN:`, message, ...args),
      error: (message: string, ...args: any[]) => console.error(`[${name}] ERROR:`, message, ...args),
      debug: (message: string, ...args: any[]) => console.debug(`[${name}] DEBUG:`, message, ...args),
    };
  }

  static setGlobalContext(context: any): void {
    this.globalContext = context;
  }

  static getGlobalContext(): any {
    return this.globalContext;
  }
}

export default Logger;
