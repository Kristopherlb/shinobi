import {
  LambdaWorkerComponentConfigBuilder,
  LambdaWorkerConfig
} from '../lambda-worker.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';

const createContext = (framework: string = 'commercial'): ComponentContext => ({
  serviceName: 'worker-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'worker-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<LambdaWorkerConfig> = {}): ComponentSpec => ({
  name: 'image-worker',
  type: 'lambda-worker',
  config: {
    handler: 'index.handler',
    ...config
  }
});

describe('LambdaWorkerComponentConfigBuilder', () => {
  it('normalises baseline commercial configuration', () => {
    const builder = new LambdaWorkerComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    });
    const config = builder.buildSync();

    expect(config.functionName).toBe('worker-service-image-worker');
    expect(config.runtime).toBe('nodejs20.x');
    expect(config.architecture).toBe('x86_64');
    expect(config.memorySize).toBe(256);
    expect(config.eventSources).toHaveLength(0);
    expect(config.monitoring.enabled).toBe(false);
    expect(config.hardeningProfile).toBe('baseline');
  });

  it('applies fedramp-high defaults from platform configuration', () => {
    const builder = new LambdaWorkerComponentConfigBuilder({
      context: createContext('fedramp-high'),
      spec: createSpec()
    });
    const config = builder.buildSync();

    expect(config.runtime).toBeDefined();
    expect(config.monitoring.enabled).toBe(true);
    expect(config.securityTools.falco).toBe(true);
    expect(config.hardeningProfile).toBe('fedramp-high');
    expect(config.tracing.mode).toBeDefined();
  });

  it('honours manifest overrides', () => {
    const builder = new LambdaWorkerComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        functionName: 'custom-worker',
        memorySize: 1024,
        timeoutSeconds: 120,
        environment: {
          STAGE: 'prod'
        },
        eventSources: [
          {
            type: 'sqs',
            queueArn: 'arn:aws:sqs:us-east-1:123456789012:images',
            batchSize: 5
          }
        ],
        logging: {
          logRetentionDays: 90,
          logFormat: 'JSON',
          systemLogLevel: 'WARN',
          applicationLogLevel: 'WARN'
        },
        monitoring: {
          enabled: true,
          alarms: {
            errors: { enabled: true, threshold: 5 }
          }
        },
        tags: {
          team: 'media'
        }
      })
    });

    const config = builder.buildSync();

    expect(config.functionName).toBe('custom-worker');
    expect(config.memorySize).toBe(1024);
    expect(config.environment.STAGE).toBe('prod');
    expect(config.eventSources).toHaveLength(1);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.tags.team).toBe('media');
  });

  it('throws when handler is missing', () => {
    const builder = new LambdaWorkerComponentConfigBuilder({
      context: createContext('commercial'),
      spec: {
        name: 'image-worker',
        type: 'lambda-worker',
        config: {}
      }
    });

    expect(() => builder.buildSync()).toThrow(/handler/i);
  });
});
