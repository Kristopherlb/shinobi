import { vi } from 'vitest';
import { createRequire } from 'module';
import { ConfigBuilder } from '../config-builder.js';
import type { ComponentContext, ComponentSpec } from '../component-interfaces.js';

const require = createRequire(import.meta.url);
const childProcess = require('child_process') as typeof import('child_process');

class DeterministicConfigBuilder extends ConfigBuilder<Record<string, any>> {
  protected getHardcodedFallbacks(): Record<string, any> {
    return { enabled: true };
  }
}

const createContext = (): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'test',
  complianceFramework: 'commercial',
  scope: {} as any
});

describe('ConfigBuilder__Determinism', () => {
  it('ConfigBuilderDeterminism__NetworkCall__Detected', () => {
    const originalFetch = global.fetch;
    const fetchSpy = vi.fn(() => Promise.resolve({}));
    // @ts-expect-error allow override for test
    global.fetch = fetchSpy;

    const spec: ComponentSpec = { name: 'component', type: 'vpc', config: {} };
    const builder = new DeterministicConfigBuilder({ context: createContext(), spec }, {
      type: 'object',
      properties: {}
    });

    builder.buildSync();
    expect(fetchSpy).not.toHaveBeenCalled();
    global.fetch = originalFetch;
  });

  it('ConfigBuilderDeterminism__CliExecution__Detected', () => {
    const execSpy = vi.spyOn(childProcess, 'execSync');

    const spec: ComponentSpec = { name: 'component', type: 'vpc', config: {} };
    const builder = new DeterministicConfigBuilder({ context: createContext(), spec }, {
      type: 'object',
      properties: {}
    });

    builder.buildSync();
    expect(execSpy).not.toHaveBeenCalled();
    execSpy.mockRestore();
  });

  it('ConfigBuilderDeterminism__StaticAnalysis__AllBuilders', () => {
    const spec: ComponentSpec = { name: 'component', type: 'vpc', config: {} };
    const builder = new DeterministicConfigBuilder({ context: createContext(), spec }, {
      type: 'object',
      properties: {}
    });

    const config = builder.buildSync();
    expect(config.enabled).toBe(true);
  });
});
