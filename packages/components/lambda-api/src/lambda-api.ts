import { ComponentSpec, ComponentConfig } from '@platform/contracts';

export class LambdaApiComponent implements ComponentSpec {
  name = 'lambda-api';
  config: ComponentConfig;

  constructor(config: ComponentConfig = {}) {
    this.config = {
      runtime: 'nodejs18.x',
      handler: 'index.handler',
      timeout: 30,
      memorySize: 128,
      ...config
    };
  }

  getRuntime(): string {
    return this.config.runtime as string;
  }

  getHandler(): string {
    return this.config.handler as string;
  }

  getTimeout(): number {
    return this.config.timeout as number;
  }

  getMemorySize(): number {
    return this.config.memorySize as number;
  }
}
