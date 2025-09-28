/**
 * RdsPostgresComponent ConfigBuilder Test Suite
 * Validates the configuration precedence chain and normalisation logic.
 */

import {
  RdsPostgresComponentConfigBuilder,
  RdsPostgresConfig
} from '../rds-postgres.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

const createMockContext = (
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'platform-team',
  environment,
  complianceFramework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'test-service',
    'owner': 'platform-team',
    environment,
    'compliance-framework': complianceFramework
  }
});

const createMockSpec = (config: Partial<RdsPostgresConfig> = {}): ComponentSpec => ({
  name: 'orders-database',
  type: 'rds-postgres',
  config
});

describe('RdsPostgresComponentConfigBuilder', () => {
  it('merges commercial platform defaults with hardcoded fallbacks', () => {
    const context = createMockContext('commercial');
    const spec = createMockSpec();

    const builder = new RdsPostgresComponentConfigBuilder(context, spec);
    const config = builder.buildSync();

    expect(config.dbName).toBe('orders_database');
    expect(config.instance?.instanceType).toBe('t3.micro');
    expect(config.encryption?.enabled).toBe(false);
    expect(config.backup?.retentionDays).toBe(7);
    expect(config.hardeningProfile).toBe('baseline');
    expect(config.monitoring?.performanceInsights?.enabled).toBe(false);
  });

  it('applies FedRAMP High defaults from segregated configuration', () => {
    const context = createMockContext('fedramp-high');
    const spec = createMockSpec();

    const builder = new RdsPostgresComponentConfigBuilder(context, spec);
    const config = builder.buildSync();

    expect(config.instance?.multiAz).toBe(true);
    expect(config.encryption?.enabled).toBe(true);
    expect(config.encryption?.customerManagedKey?.create).toBe(true);
    expect(config.logging?.audit?.enabled).toBe(true);
    expect(config.security?.iamAuthentication).toBe(true);
    expect(config.hardeningProfile).toBe('stig');
    expect(config.monitoring?.performanceInsights?.retentionDays).toBeGreaterThanOrEqual(2555);
  });

  it('honours component-level overrides over platform defaults', () => {
    const context = createMockContext('commercial');
    const spec = createMockSpec({
      instance: {
        instanceType: 'c6g.large',
        multiAz: true
      },
      backup: {
        retentionDays: 14
      },
      monitoring: {
        performanceInsights: {
          enabled: true,
          retentionDays: 93,
          useCustomerManagedKey: false
        }
      }
    });

    const builder = new RdsPostgresComponentConfigBuilder(context, spec);
    const config = builder.buildSync();

    expect(config.instance?.instanceType).toBe('c6g.large');
    expect(config.instance?.multiAz).toBe(true);
    expect(config.backup?.retentionDays).toBe(14);
    expect(config.monitoring?.performanceInsights?.enabled).toBe(true);
    expect(config.monitoring?.performanceInsights?.retentionDays).toBe(93);
  });

  it('normalises optional structures and provides safe defaults', () => {
    const context = createMockContext();
    const spec = createMockSpec({
      logging: {
        database: { enabled: true }
      }
    });

    const builder = new RdsPostgresComponentConfigBuilder(context, spec);
    const config = builder.buildSync();

    expect(config.logging?.database?.enabled).toBe(true);
    expect(config.logging?.database?.retentionInDays).toBeGreaterThan(0);
    expect(config.rotation?.scheduleInDays).toBeGreaterThan(0);
    expect(config.networking?.ingressCidrs?.length).toBeGreaterThan(0);
  });
});
