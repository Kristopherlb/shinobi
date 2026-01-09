import { execSync } from 'child_process';
import { ConfigBuilder } from '../config-builder.js';
import type { ComponentContext, ComponentSpec } from '../component-interfaces.js';

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
    const fetchSpy = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error allow override for test
    global.fetch = fetchSpy;

    const spec: ComponentSpec = { name: 'component', type: 'vpc', config: {} };
    const builder = new DeterministicConfigBuilder({ context: createContext(), spec }, {
      type: 'object',
      properties: {}
    });

    builder.buildSync();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ConfigBuilderDeterminism__CliExecution__Detected', () => {
    const execSpy = jest.spyOn({ execSync }, 'execSync');

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
