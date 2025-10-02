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
import { DynamoDbTableComponent } from '../src/dynamodb-table.component.js';
import { DynamoDbTableConfig } from '../src/dynamodb-table.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';

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

    const capability = component.getCapabilities()['db:dynamodb'];
    expect(capability.billingMode).toBe('provisioned');
    expect(capability.hardeningProfile).toBe('baseline');
  });
});
