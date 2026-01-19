import { vi } from 'vitest';

export class Logger {
  static setGlobalContext(_context: Record<string, unknown>): void {}

  static getLogger(_name: string) {
    return {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };
  }
}
