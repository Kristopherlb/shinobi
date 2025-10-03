import {
  DynamoDbTableComponentConfigBuilder,
  DynamoDbTableConfig
} from '../src/dynamodb-table.builder.ts';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.ts';

const createMockContext = (framework: string = 'commercial'): ComponentContext => ({
  serviceName: 'catalog-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'catalog-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createMockSpec = (config: Partial<DynamoDbTableConfig> = {}): ComponentSpec => ({
  name: 'product-table',
  type: 'dynamodb-table',
  config
});

describe('DynamoDbTableComponentConfigBuilder', () => {
  it('merges commercial defaults with hardcoded fallbacks', () => {
    const builder = new DynamoDbTableComponentConfigBuilder(createMockContext('commercial'), createMockSpec({
      partitionKey: { name: 'id', type: 'string' }
    }));

    const config = builder.buildSync();

    expect(config.tableName).toBe('catalog-service-product-table');
    expect(config.billingMode).toBe('pay-per-request');
    expect(config.tableClass).toBe('standard');
    expect(config.pointInTimeRecovery).toBe(true);
    expect(config.encryption.type).toBe('aws-managed');
    expect(config.monitoring.enabled).toBe(false);
    expect(config.hardeningProfile).toBe('baseline');
    expect(config.backup.enabled).toBe(true);
    expect(config.backup.retentionDays).toBe(14);
  });

  it('applies FedRAMP High defaults from segregated configuration', () => {
    const builder = new DynamoDbTableComponentConfigBuilder(createMockContext('fedramp-high'), createMockSpec({
      partitionKey: { name: 'id', type: 'string' }
    }));

    const config = builder.buildSync();

    expect(config.billingMode).toBe('provisioned');
    expect(config.provisioned?.readCapacity).toBeGreaterThanOrEqual(20);
    expect(config.pointInTimeRecovery).toBe(true);
    expect(config.encryption.type).toBe('customer-managed');
    expect(config.backup.enabled).toBe(true);
    expect(config.hardeningProfile).toBe('stig');
  });

  it('normalises provisioned throughput and auto-scaling inputs', () => {
    const builder = new DynamoDbTableComponentConfigBuilder(
      createMockContext('commercial'),
      createMockSpec({
        partitionKey: { name: 'id', type: 'string' },
        billingMode: 'provisioned',
        provisioned: {
          readCapacity: 5,
          writeCapacity: 5,
          autoScaling: {
            maxReadCapacity: 200
          }
        }
      })
    );

    const config = builder.buildSync();

    expect(config.provisioned?.readCapacity).toBe(5);
    expect(config.provisioned?.autoScaling?.maxReadCapacity).toBe(200);
    expect(config.provisioned?.autoScaling?.targetUtilizationPercent).toBe(70);
  });

  it('normalises TTL, stream, and index projections', () => {
    const builder = new DynamoDbTableComponentConfigBuilder(
      createMockContext('commercial'),
      createMockSpec({
        partitionKey: { name: 'id', type: 'string' },
        timeToLive: {
          enabled: true,
          attributeName: 'expiry'
        },
        stream: {
          enabled: true,
          viewType: 'new-image'
        },
        globalSecondaryIndexes: [
          {
            indexName: 'gsi1',
            partitionKey: { name: 'pk', type: 'string' }
          }
        ]
      })
    );

    const config = builder.buildSync();

    expect(config.timeToLive?.enabled).toBe(true);
    expect(config.timeToLive?.attributeName).toBe('expiry');
    expect(config.stream?.enabled).toBe(true);
    expect(config.stream?.viewType).toBe('new-image');
    expect(config.globalSecondaryIndexes?.[0].projectionType).toBe('all');
  });
});
