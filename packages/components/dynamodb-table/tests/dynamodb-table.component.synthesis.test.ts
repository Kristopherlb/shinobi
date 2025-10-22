jest.mock(
  '@platform/logger',
  () => ({
    Logger: {
      getLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
      setGlobalContext: jest.fn()
    }
  }),
  { virtual: true }
);

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DynamoDbTableComponent } from '../src/dynamodb-table.component.ts';
import { DynamoDbTableConfig } from '../src/dynamodb-table.builder.ts';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.ts';

const createContext = (framework: string): ComponentContext => ({
  serviceName: 'orders-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'orders-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<DynamoDbTableConfig>): ComponentSpec => ({
  name: 'orders-table',
  type: 'dynamodb-table',
  config
});

const synthesize = (context: ComponentContext, spec: ComponentSpec) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const component = new DynamoDbTableComponent(stack, spec.name, context, spec);
  component.synth();
  return { component, template: Template.fromStack(stack) };
};

describe('DynamoDbTableComponent__Synthesis__AppliesPlatformPolicies', () => {
  /*
   * Test Metadata: TP-DDB-TABLE-SYNTH-001
   * {
   *   "id": "TP-DDB-TABLE-SYNTH-001",
   *   "level": "unit",
   *   "capability": "Commercial synthesis produces PAYG table with managed encryption",
   *   "oracle": "contract",
   *   "invariants": ["Billing mode remains PAY_PER_REQUEST", "KMS encryption enforced"],
   *   "fixtures": ["cdk.Stack", "DynamoDbTableComponent"],
   *   "inputs": { "shape": "Commercial framework without overrides", "notes": "Validates platform defaults" },
   *   "risks": ["Loss of baseline security"],
   *   "dependencies": ["config/commercial.yml"],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://configuration", "std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CommercialDefaults__PayPerRequest__SynthesizesManagedTable', () => {
    const { template } = synthesize(
      createContext('commercial'),
      createSpec({
        partitionKey: { name: 'id', type: 'string' }
      })
    );

    template.hasResourceProperties('AWS::DynamoDB::Table', Match.objectLike({
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: Match.arrayWith([
        Match.objectLike({ AttributeName: 'id', KeyType: 'HASH' })
      ]),
      SSESpecification: Match.objectLike({ SSEType: 'KMS' }),
      PointInTimeRecoverySpecification: Match.objectLike({ PointInTimeRecoveryEnabled: true }),
      ContributorInsightsSpecification: Match.objectLike({ Enabled: true })
    }));

    const table = template.findResources('AWS::DynamoDB::Table');
    const tableResource = Object.values(table)[0] as any;
    expect(tableResource.Properties?.TimeToLiveSpecification).toBeUndefined();
    expect(tableResource.Properties?.StreamSpecification).toBeUndefined();
  });

  /*
   * Test Metadata: TP-DDB-TABLE-SYNTH-002
   * {
   *   "id": "TP-DDB-TABLE-SYNTH-002",
   *   "level": "unit",
   *   "capability": "FedRAMP High synthesis enforces provisioned throughput and PITR",
   *   "oracle": "contract",
   *   "invariants": ["Provisioned billing mode", "Point-in-time recovery enabled"],
   *   "fixtures": ["cdk.Stack", "DynamoDbTableComponent"],
   *   "inputs": { "shape": "FedRAMP High framework without overrides", "notes": "Validates segregated defaults" },
   *   "risks": ["Compliance regression"],
   *   "dependencies": ["config/fedramp-high.yml"],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://configuration", "std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('FedrampHighDefaults__ProvisionedMode__EnablesPointInTimeRecovery', () => {
    const { template } = synthesize(
      createContext('fedramp-high'),
      createSpec({
        partitionKey: { name: 'id', type: 'string' }
      })
    );

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PROVISIONED',
      PointInTimeRecoverySpecification: Match.objectLike({ PointInTimeRecoveryEnabled: true })
    });
  });

  /*
   * Test Metadata: TP-DDB-TABLE-SYNTH-003
   * {
   *   "id": "TP-DDB-TABLE-SYNTH-003",
   *   "level": "unit",
   *   "capability": "Provisioned overrides synthesize table resources and scaling artifacts",
   *   "oracle": "contract",
   *   "invariants": ["Provisioned billing mode respected", "GSI configured with scaling"],
   *   "fixtures": ["cdk.Stack", "DynamoDbTableComponent"],
   *   "inputs": { "shape": "Manifest with provisioned table and single GSI", "notes": "Validates resource synthesis" },
   *   "risks": ["Auto-scaling misconfiguration"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://configuration", "std://observability"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ProvisionedOverrides__GsiConfiguration__CreatesExpectedResources', () => {
    const { template } = synthesize(
      createContext('commercial'),
      createSpec({
        partitionKey: { name: 'id', type: 'string' },
        sortKey: { name: 'createdAt', type: 'number' },
        billingMode: 'provisioned',
        provisioned: {
          readCapacity: 5,
          writeCapacity: 5
        },
        globalSecondaryIndexes: [
          {
            indexName: 'status-index',
            partitionKey: { name: 'status', type: 'string' }
          }
        ]
      })
    );

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PROVISIONED',
      KeySchema: Match.arrayWith([
        Match.objectLike({ AttributeName: 'createdAt', KeyType: 'RANGE' })
      ]),
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: 'status-index' })
      ])
    });

    template.resourceCountIs('AWS::Backup::BackupPlan', 1);
    template.resourceCountIs('AWS::Backup::BackupSelection', 1);
    template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);

    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', Match.objectLike({
      ScalableDimension: 'dynamodb:table:ReadCapacityUnits'
    }));

    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', Match.objectLike({
      ScalableDimension: 'dynamodb:table:WriteCapacityUnits'
    }));

    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', Match.objectLike({
      ScalableDimension: 'dynamodb:index:ReadCapacityUnits'
    }));

    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', Match.objectLike({
      ScalableDimension: 'dynamodb:index:WriteCapacityUnits'
    }));

  });

  /*
   * Test Metadata: TP-DDB-TABLE-SYNTH-004
   * {
   *   "id": "TP-DDB-TABLE-SYNTH-004",
   *   "level": "unit",
   *   "capability": "Provisioned overrides expose capability metadata",
   *   "oracle": "exact",
   *   "invariants": ["Capability map mirrors synthesized resources"],
   *   "fixtures": ["cdk.Stack", "DynamoDbTableComponent"],
   *   "inputs": { "shape": "Manifest with provisioned table and single GSI", "notes": "Validates capability export" },
   *   "risks": ["Capability registry drift"],
   *   "dependencies": [],
   *   "evidence": ["Component capability payload"],
   *   "compliance_refs": ["std://configuration", "std://observability"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ProvisionedOverrides__CapabilityExport__PublishesTableAndIndexMetadata', () => {
    const { component } = synthesize(
      createContext('commercial'),
      createSpec({
        partitionKey: { name: 'id', type: 'string' },
        sortKey: { name: 'createdAt', type: 'number' },
        billingMode: 'provisioned',
        provisioned: {
          readCapacity: 5,
          writeCapacity: 5
        },
        globalSecondaryIndexes: [
          {
            indexName: 'status-index',
            partitionKey: { name: 'status', type: 'string' }
          }
        ]
      })
    );

    const capabilities = component.getCapabilities();
    const capability = capabilities['db:dynamodb'];
    expect(capability.billingMode).toBe('provisioned');
    expect(capability.hardeningProfile).toBe('baseline');
    expect(capability.keySchema).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attributeName: 'id', keyType: 'HASH' }),
        expect.objectContaining({ attributeName: 'createdAt', keyType: 'RANGE' })
      ])
    );
    expect(capability.attributeDefinitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attributeName: 'id', attributeType: 'S' }),
        expect.objectContaining({ attributeName: 'createdAt', attributeType: 'N' })
      ])
    );
    expect(capability.backup).toEqual({ enabled: true, retentionDays: 14 });
    expect(capability.observabilityEnv).toBeDefined();
    expect(capabilities['dynamodb:table']).toEqual(capability);

    const indexCapabilities = capabilities['dynamodb:index'];
    expect(Array.isArray(indexCapabilities)).toBe(true);
    expect(indexCapabilities[0]).toEqual(
      expect.objectContaining({
        indexName: 'status-index',
        indexType: 'GLOBAL'
      })
    );
  });
});
