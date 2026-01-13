/**
 * RdsPostgresComponent synthesis tests
 * Validates that the component consumes resolved configuration without
 * embedding compliance-aware logic in the implementation.
 */

import { describe, it, expect } from 'vitest';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { RdsPostgresComponent } from '../src/rds-postgres.component';
import { RdsPostgresConfig } from '../src/rds-postgres.builder';
import { ComponentContext, ComponentSpec } from '../../../core/src/platform/contracts/component-interfaces.js';

const createMockContext = (framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'): ComponentContext => ({
  serviceName: 'checkout',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  scope: {} as any, // Will be replaced with actual stack in synthesize function
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
  const stack = new Stack(app, 'TestStack', {
    env: {
      account: context.account || '123456789012',
      region: context.region || 'us-east-1'
    }
  });
  const contextWithScope = { ...context, scope: stack };
  const component = new RdsPostgresComponent(stack, spec.name, contextWithScope, spec);
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
      EnablePerformanceInsights: false,
      EnableIAMDatabaseAuthentication: false,
      MonitoringInterval: 0
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

  it('applies required security group tags (SG-009)', () => {
    const { template } = synthesize(createMockContext('commercial'), createMockSpec());

    // Verify security group exists
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);

    // Verify required security group tags are present
    // Required tags: resource-type, ingress-policy
    // Extract tags into a map to avoid order dependencies
    const sgResources = template.findResources('AWS::EC2::SecurityGroup');
    const sg = Object.values(sgResources)[0] as any;
    const tags = sg.Properties?.Tags || [];
    
    const tagMap = tags.reduce((acc: Record<string, string>, tag: { Key: string; Value: string }) => {
      acc[tag.Key] = tag.Value;
      return acc;
    }, {});
    
    expect(tagMap['resource-type']).toBe('security-group');
    expect(tagMap['ingress-policy']).toBeDefined();
    expect(['binder-managed', 'manual', 'tier-based']).toContain(tagMap['ingress-policy']);
  });
});
