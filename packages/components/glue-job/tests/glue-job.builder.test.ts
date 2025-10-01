/**
 * GlueJobComponent ConfigBuilder tests
 * Validates the configuration precedence chain and compliance defaults.
 */

import { GlueJobComponentConfigBuilder, GlueJobConfig } from '../glue-job.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { Construct } from 'constructs';

const BASE_SCRIPT_LOCATION = 's3://test-bucket/scripts/job.py';

const createMockContext = (
  framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial'
): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: framework,
  scope: {} as Construct,
  region: 'us-east-1',
  accountId: '123456789012'
} as unknown as ComponentContext);

const createSpec = (config: Partial<GlueJobConfig> = {}): ComponentSpec => ({
  name: 'test-glue-job',
  type: 'glue-job',
  config: {
    scriptLocation: BASE_SCRIPT_LOCATION,
    ...config
  }
});

describe('GlueJobComponentConfigBuilder', () => {
  it('applies commercial defaults', () => {
    const builder = new GlueJobComponentConfigBuilder(createMockContext('commercial'), createSpec());

    const config = builder.buildSync();

    expect(config.glueVersion).toBe('4.0');
    expect(config.jobType).toBe('glueetl');
    expect(config.maxConcurrentRuns).toBe(1);
    expect(config.maxRetries).toBe(0);
    expect(config.timeout).toBe(2880);
    expect(config.security.encryption.enabled).toBe(false);
    expect(config.logging.groups).toHaveLength(1);
    expect(config.monitoring.enabled).toBe(false);
  });

  it('applies fedramp-moderate hardened defaults', () => {
    const builder = new GlueJobComponentConfigBuilder(createMockContext('fedramp-moderate'), createSpec());
    const config = builder.buildSync();

    expect(config.maxConcurrentRuns).toBe(3);
    expect(config.maxRetries).toBe(3);
    expect(config.timeout).toBe(1440);
    expect(config.security.encryption.enabled).toBe(true);
    expect(config.security.encryption.createCustomerManagedKey).toBe(true);
    expect(config.security.encryption.removalPolicy).toBe('retain');
    expect(config.defaultArguments['--enable-continuous-cloudwatch-log']).toBe('true');
    expect(config.defaultArguments['--enable-metrics']).toBe('true');
    expect(config.logging.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'security', retentionDays: 90 }),
        expect.objectContaining({ id: 'compliance', retentionDays: 365 })
      ])
    );
    expect(config.monitoring.enabled).toBe(true);
  });

  it('applies fedramp-high hardened defaults', () => {
    const builder = new GlueJobComponentConfigBuilder(createMockContext('fedramp-high'), createSpec());
    const config = builder.buildSync();

    expect(config.maxConcurrentRuns).toBe(5);
    expect(config.maxRetries).toBe(5);
    expect(config.timeout).toBe(720);
    expect(config.workerConfiguration.workerType).toBe('G.4X');
    expect(config.workerConfiguration.numberOfWorkers).toBe(50);
    expect(config.defaultArguments['--enable-auto-scaling']).toBe('true');
    expect(config.logging.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'audit', retentionDays: 3650, removalPolicy: 'retain' })
      ])
    );
    expect(config.monitoring.enabled).toBe(true);
  });

  it('allows manifest overrides to win over defaults', () => {
    const builder = new GlueJobComponentConfigBuilder(
      createMockContext('fedramp-moderate'),
      createSpec({
        maxRetries: 1,
        workerConfiguration: {
          workerType: 'G.1X',
          numberOfWorkers: 5
        },
        logging: {
          groups: [
            {
              id: 'custom-security',
              enabled: true,
              logGroupSuffix: 'custom',
              retentionDays: 30,
              removalPolicy: 'destroy'
            }
          ]
        },
        defaultArguments: {
          '--enable-metrics': 'false'
        }
      })
    );

    const config = builder.buildSync();

    expect(config.maxRetries).toBe(1);
    expect(config.workerConfiguration.workerType).toBe('G.1X');
    expect(config.workerConfiguration.numberOfWorkers).toBe(5);
    expect(config.logging.groups).toHaveLength(1);
    expect(config.logging.groups[0].id).toBe('custom-security');
    expect(config.defaultArguments['--enable-metrics']).toBe('false');
  });

  it('requires scriptLocation to be provided', () => {
    const context = createMockContext();
    const spec: ComponentSpec = { name: 'missing-script', type: 'glue-job', config: {} };
    const builder = new GlueJobComponentConfigBuilder(context, spec);

    expect(() => builder.buildSync()).toThrow(/scriptLocation/);
  });
});
