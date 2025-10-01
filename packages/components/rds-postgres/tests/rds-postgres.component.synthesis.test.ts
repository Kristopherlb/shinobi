/**
 * RdsPostgresComponent synthesis tests
 * Validates that the component consumes resolved configuration without
 * embedding compliance-aware logic in the implementation.
 */

jest.mock(
  '@platform/logger',
  () => ({
    Logger: {
      getLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      }),
      setGlobalContext: jest.fn()
    }
  }),
  { virtual: true }
);

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { RdsPostgresComponent } from '../rds-postgres.component.js';
import { RdsPostgresConfig } from '../rds-postgres.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';

const createMockContext = (framework: string): ComponentContext => ({
  serviceName: 'checkout',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'checkout',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createMockSpec = (config: Partial<RdsPostgresConfig> = {}): ComponentSpec => ({
  name: 'orders-db',
  type: 'rds-postgres',
  config
});

const synthesize = (context: ComponentContext, spec: ComponentSpec) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const component = new RdsPostgresComponent(stack, spec.name, context, spec);
  component.synth();
  return { component, template: Template.fromStack(stack) };
};

describe('RdsPostgresComponent synthesis', () => {
  it('generates commercial baseline resources', () => {
    const { template } = synthesize(createMockContext('commercial'), createMockSpec());

    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.t3.micro',
      MultiAZ: false,
      StorageEncrypted: false,
      EnablePerformanceInsights: Match.absent(),
      EnableIAMDatabaseAuthentication: Match.absent(),
      MonitoringInterval: Match.absent()
    });

    template.resourceCountIs('AWS::KMS::Key', 0);
    template.resourceCountIs('AWS::Logs::LogGroup', 0);
  });

  it('applies FedRAMP High hardened defaults via configuration', () => {
    const { template } = synthesize(createMockContext('fedramp-high'), createMockSpec());

    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true
    });

    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.r5.xlarge',
      MultiAZ: true,
      StorageEncrypted: true,
      EnablePerformanceInsights: true,
      PerformanceInsightsRetentionPeriod: 2555,
      MonitoringInterval: 1,
      EnableIAMDatabaseAuthentication: true,
      EnableCloudwatchLogsExports: ['postgresql'],
      DeletionProtection: true
    });

    template.resourceCountIs('AWS::Logs::LogGroup', 2);
  });

  it('respects manifest overrides for instance and backup configuration', () => {
    const { template, component } = synthesize(
      createMockContext('commercial'),
      createMockSpec({
        instance: {
          instanceType: 'r6g.large',
          multiAz: true
        },
        backup: {
          retentionDays: 21
        },
        logging: {
          database: { enabled: true, retentionInDays: 30 }
        }
      })
    );

    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.r6g.large',
      MultiAZ: true,
      BackupRetentionPeriod: 21
    });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 30
    });

    const capabilities = component.getCapabilities();
    expect(capabilities['db:postgres'].securityProfile).toBe('baseline');
  });
});
