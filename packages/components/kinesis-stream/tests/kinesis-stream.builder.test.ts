import {
  KinesisStreamComponentConfigBuilder,
  KinesisStreamConfig
} from '../kinesis-stream.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

const createMockContext = (framework: string = 'commercial'): ComponentContext => ({
  serviceName: 'analytics-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'analytics-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createMockSpec = (config: Partial<KinesisStreamConfig> = {}): ComponentSpec => ({
  name: 'events-stream',
  type: 'kinesis-stream',
  config
});

describe('KinesisStreamComponentConfigBuilder', () => {
  it('merges commercial defaults with hardcoded fallbacks', () => {
    const builder = new KinesisStreamComponentConfigBuilder(createMockContext('commercial'), createMockSpec());
    const config = builder.buildSync();

    expect(config.streamName).toBe('events-stream');
    expect(config.streamMode).toBe('provisioned');
    expect(config.shardCount).toBe(1);
    expect(config.retentionHours).toBe(24);
    expect(config.encryption.type).toBe('none');
    expect(config.monitoring.enabled).toBe(false);
    expect(config.hardeningProfile).toBe('baseline');
  });

  it('applies FedRAMP High defaults from segregated configuration', () => {
    const builder = new KinesisStreamComponentConfigBuilder(createMockContext('fedramp-high'), createMockSpec());
    const config = builder.buildSync();

    expect(config.streamMode).toBe('provisioned');
    expect(config.shardCount).toBeGreaterThanOrEqual(1);
    expect(config.retentionHours).toBeGreaterThanOrEqual(168);
    expect(config.encryption.type).toBe('kms');
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.enhancedMetrics).toBe(true);
    expect(config.monitoring.alarms?.iteratorAgeMs?.threshold).toBeLessThanOrEqual(60000);
    expect(config.hardeningProfile).toBe('stig');
  });

  it('sanitises stream name and honours manifest overrides', () => {
    const builder = new KinesisStreamComponentConfigBuilder(
      createMockContext('commercial'),
      createMockSpec({
        streamName: 'events stream@dev',
        streamMode: 'on-demand',
        encryption: {
          type: 'aws-managed'
        },
        monitoring: {
          enabled: true,
          alarms: {
            iteratorAgeMs: {
              enabled: true,
              threshold: 180000
            }
          }
        }
      })
    );

    const config = builder.buildSync();

    expect(config.streamName).toBe('events-stream-dev');
    expect(config.streamMode).toBe('on-demand');
    expect(config.shardCount).toBeUndefined();
    expect(config.encryption.type).toBe('aws-managed');
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.alarms?.iteratorAgeMs?.threshold).toBe(180000);
  });

  it('normalises alarm configuration with safe defaults when partially specified', () => {
    const builder = new KinesisStreamComponentConfigBuilder(
      createMockContext('commercial'),
      createMockSpec({
        monitoring: {
          enabled: true,
          alarms: {
            readProvisionedExceeded: { enabled: true }
          }
        }
      })
    );

    const config = builder.buildSync();

    expect(config.monitoring.alarms?.readProvisionedExceeded?.enabled).toBe(true);
    expect(config.monitoring.alarms?.readProvisionedExceeded?.threshold).toBe(1);
    expect(config.monitoring.alarms?.writeProvisionedExceeded?.enabled).toBe(false);
  });
});
