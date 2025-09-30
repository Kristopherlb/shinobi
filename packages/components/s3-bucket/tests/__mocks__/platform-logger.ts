export class Logger {
  static setGlobalContext(_context: Record<string, unknown>): void {}

  static getLogger(_name: string) {
    return {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
  }
}
