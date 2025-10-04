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

describe('DynamoDbTableComponent synthesis', () => {
  it('creates commercial PAYG table with defaults', () => {
    const { template } = synthesize(
      createContext('commercial'),
      createSpec({
        partitionKey: { name: 'id', type: 'string' }
      })
    );

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: Match.arrayWith([
        Match.objectLike({ AttributeName: 'id', KeyType: 'HASH' })
      ]),
      SSESpecification: Match.objectLike({ SSEType: 'KMS' })
    });
  });

  it('applies FedRAMP High defaults', () => {
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

  it('respects manifest overrides for provisioned throughput and indexes', () => {
    const { template, component } = synthesize(
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

    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
      ResourceId: Match.stringLikeRegexp('table/orders-service-orders-table/index/status-index'),
      ScalableDimension: 'dynamodb:index:ReadCapacityUnits'
    });

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
