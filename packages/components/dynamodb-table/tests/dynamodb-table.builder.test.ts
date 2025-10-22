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

describe('DynamoDbTableComponentConfigBuilder__ConfigurationPrecedence__NormalisesOutput', () => {
  /*
   * Test Metadata: TP-DDB-TABLE-CONFIG-001
   * {
   *   "id": "TP-DDB-TABLE-CONFIG-001",
   *   "level": "unit",
   *   "capability": "Commercial framework inherits platform defaults",
   *   "oracle": "exact",
   *   "invariants": ["Commercial defaults remain stable"],
   *   "fixtures": ["ConfigBuilder", "Commercial framework context"],
   *   "inputs": { "shape": "Component manifest without overrides", "notes": "Expect merge with config/commercial.yml" },
   *   "risks": [],
   *   "dependencies": ["config/commercial.yml"],
   *   "evidence": ["Resolved component configuration"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationPrecedence__CommercialDefaults__AppliesPlatformBaseline', () => {
    const builder = new DynamoDbTableComponentConfigBuilder(createMockContext('commercial'), createMockSpec({
      partitionKey: { name: 'id', type: 'string' }
    }));

    const config = builder.buildSync();

    expect(config.tableName).toBe('catalog-service-product-table');
    expect(config.billingMode).toBe('pay-per-request');
    expect(config.tableClass).toBe('standard');
    expect(config.pointInTimeRecovery).toBe(true);
    expect(config.encryption.type).toBe('aws-managed');
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.alarms?.consumedReadCapacity?.enabled).toBe(true);
    expect(config.monitoring.alarms?.consumedWriteCapacity?.enabled).toBe(true);
    expect(config.hardeningProfile).toBe('baseline');
    expect(config.backup.enabled).toBe(true);
    expect(config.backup.retentionDays).toBe(14);
  });

  /*
   * Test Metadata: TP-DDB-TABLE-CONFIG-002
   * {
   *   "id": "TP-DDB-TABLE-CONFIG-002",
   *   "level": "unit",
   *   "capability": "FedRAMP High segregated defaults applied",
   *   "oracle": "exact",
   *   "invariants": ["Provisioned capacity thresholds honoured"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP High framework context"],
   *   "inputs": { "shape": "Component manifest without overrides", "notes": "Expect merge with config/fedramp-high.yml" },
   *   "risks": ["Regression in security hardening"],
   *   "dependencies": ["config/fedramp-high.yml"],
   *   "evidence": ["Resolved component configuration"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationPrecedence__FedrampHighDefaults__AppliesSegregatedBaseline', () => {
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
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.alarms?.consumedReadCapacity?.enabled).toBe(true);
  });

  /*
   * Test Metadata: TP-DDB-TABLE-CONFIG-003
   * {
   *   "id": "TP-DDB-TABLE-CONFIG-003",
   *   "level": "unit",
   *   "capability": "Provisioned throughput auto-scaling normalisation",
   *   "oracle": "exact",
   *   "invariants": ["Auto-scaling bounds derived from base capacity"],
   *   "fixtures": ["ConfigBuilder", "Provisioned throughput manifest"],
   *   "inputs": { "shape": "Provisioned billing mode with partial autoScaling", "notes": "Max read capacity provided, others derived" },
   *   "risks": ["Under-provisioned scaling policies"],
   *   "dependencies": [],
   *   "evidence": ["Resolved provisioned throughput section"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ProvisionedThroughput__PartialScalingConfig__NormalisesCapacityBounds', () => {
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

  /*
   * Test Metadata: TP-DDB-TABLE-CONFIG-004
   * {
   *   "id": "TP-DDB-TABLE-CONFIG-004",
   *   "level": "unit",
   *   "capability": "Feature toggles normalise TTL, stream, and projections",
   *   "oracle": "exact",
   *   "invariants": ["Optional features default safely"],
   *   "fixtures": ["ConfigBuilder", "Commercial framework context"],
   *   "inputs": { "shape": "Manifest enabling TTL, stream, and GSI", "notes": "Projection type should default to 'all'" },
   *   "risks": ["Inconsistent projection configuration"],
   *   "dependencies": [],
   *   "evidence": ["Resolved TTL, stream, and GSI configuration"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('FeatureNormalisation__OptionalSettings__RetainsSafeDefaults', () => {
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

  /*
   * Test Metadata: TP-DDB-TABLE-CONFIG-005
   * {
   *   "id": "TP-DDB-TABLE-CONFIG-005",
   *   "level": "unit",
   *   "capability": "GSI provisioned throughput inherits table defaults",
   *   "oracle": "exact",
   *   "invariants": ["GSI scaling matches table provisioning"],
   *   "fixtures": ["ConfigBuilder", "Provisioned throughput manifest"],
   *   "inputs": { "shape": "Provisioned billing mode with GSI lacking overrides", "notes": "Expect inheritance from tableProvisioned" },
   *   "risks": ["Inconsistent GSI scaling"],
   *   "dependencies": [],
   *   "evidence": ["Resolved GSI configuration"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ProvisionedThroughput__GsiInheritance__DerivesFromTableProvisioned', () => {
    const builder = new DynamoDbTableComponentConfigBuilder(
      createMockContext('commercial'),
      createMockSpec({
        partitionKey: { name: 'id', type: 'string' },
        billingMode: 'provisioned',
        provisioned: {
          readCapacity: 10,
          writeCapacity: 6
        },
        globalSecondaryIndexes: [
          {
            indexName: 'orders-by-status',
            partitionKey: { name: 'status', type: 'string' }
          }
        ]
      })
    );

    const config = builder.buildSync();
    const gsi = config.globalSecondaryIndexes?.[0];
    expect(gsi?.provisioned?.readCapacity).toBe(10);
    expect(gsi?.provisioned?.writeCapacity).toBe(6);
    expect(gsi?.provisioned?.autoScaling?.minReadCapacity).toBe(10);
    expect(gsi?.provisioned?.autoScaling?.minWriteCapacity).toBe(6);
    expect(gsi?.provisioned?.autoScaling?.targetUtilizationPercent).toBe(70);
  });

  /*
   * Test Metadata: TP-DDB-TABLE-CONFIG-006
   * {
   *   "id": "TP-DDB-TABLE-CONFIG-006",
   *   "level": "unit",
   *   "capability": "Monitoring override disables platform alarms",
   *   "oracle": "exact",
   *   "invariants": ["No alarms remain enabled when monitoring disabled"],
   *   "fixtures": ["ConfigBuilder", "Commercial framework context"],
   *   "inputs": { "shape": "Manifest explicitly disabling monitoring", "notes": "Ensures governance respects manifest" },
   *   "risks": ["Unexpected alarm noise"],
   *   "dependencies": [],
   *   "evidence": ["Resolved monitoring configuration"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('MonitoringOverrides__DisabledFlag__DisablesAlarms', () => {
    const builder = new DynamoDbTableComponentConfigBuilder(
      createMockContext('commercial'),
      createMockSpec({
        partitionKey: { name: 'id', type: 'string' },
        monitoring: {
          enabled: false,
          alarms: {
            readThrottle: { enabled: false },
            consumedReadCapacity: { enabled: false },
            writeThrottle: { enabled: false },
            consumedWriteCapacity: { enabled: false },
            systemErrors: { enabled: false }
          }
        }
      })
    );

    const config = builder.buildSync();
    expect(config.monitoring.enabled).toBe(false);
    const alarms = config.monitoring.alarms!;
    expect(alarms.readThrottle?.enabled).toBe(false);
    expect(alarms.consumedReadCapacity?.enabled).toBe(false);
    expect(alarms.writeThrottle?.enabled).toBe(false);
    expect(alarms.consumedWriteCapacity?.enabled).toBe(false);
    expect(alarms.systemErrors?.enabled).toBe(false);
  });

  /*
   * Test Metadata: TP-DDB-TABLE-CONFIG-007
   * {
   *   "id": "TP-DDB-TABLE-CONFIG-007",
   *   "level": "unit",
   *   "capability": "Customer managed key configuration honours manifest",
   *   "oracle": "exact",
   *   "invariants": ["Alias and rotation flags preserved"],
   *   "fixtures": ["ConfigBuilder", "Commercial framework context"],
   *   "inputs": { "shape": "Manifest requesting customer-managed key", "notes": "Rotation disabled explicitly" },
   *   "risks": ["Incorrect KMS setup"],
   *   "dependencies": [],
   *   "evidence": ["Resolved encryption configuration"],
   *   "compliance_refs": ["std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Encryption__CustomerManagedKey__HonoursAliasAndRotation', () => {
    const builder = new DynamoDbTableComponentConfigBuilder(
      createMockContext('commercial'),
      createMockSpec({
        partitionKey: { name: 'id', type: 'string' },
        encryption: {
          type: 'customer-managed',
          customerManagedKey: {
            create: true,
            alias: 'alias/orders-table',
            enableRotation: false
          }
        }
      })
    );

    const config = builder.buildSync();
    expect(config.encryption.type).toBe('customer-managed');
    expect(config.encryption.customerManagedKey?.create).toBe(true);
    expect(config.encryption.customerManagedKey?.alias).toBe('alias/orders-table');
    expect(config.encryption.customerManagedKey?.enableRotation).toBe(false);
  });
});
