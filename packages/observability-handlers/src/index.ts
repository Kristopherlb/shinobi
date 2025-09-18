/**
 * Observability Handlers
 * Mock implementation for testing
 */

export interface IObservabilityHandler {
  handle(context: any): Promise<void>;
}

export interface ObservabilityConfig {
  enabled: boolean;
  level: string;
}

export class LambdaObservabilityHandler implements IObservabilityHandler {
  async handle(context: any): Promise<void> {
    // Mock implementation
  }
}

export class VpcObservabilityHandler implements IObservabilityHandler {
  async handle(context: any): Promise<void> {
    // Mock implementation
  }
}

export class AlbObservabilityHandler implements IObservabilityHandler {
  async handle(context: any): Promise<void> {
    // Mock implementation
  }
}
