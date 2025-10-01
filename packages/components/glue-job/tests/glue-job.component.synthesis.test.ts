/**
 * GlueJobComponent synthesis tests
 * Validates that the component consumes resolved configuration and synthesizes
 * the correct AWS resources across compliance frameworks.
 */

import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { GlueJobComponent } from '../glue-job.component.js';
import { GlueJobConfig } from '../glue-job.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const BASE_SCRIPT_LOCATION = 's3://test-bucket/scripts/job.py';

const createSpec = (config: Partial<GlueJobConfig> = {}): ComponentSpec => ({
  name: 'test-glue-job',
  type: 'glue-job',
  config: {
    scriptLocation: BASE_SCRIPT_LOCATION,
    ...config
  }
});

const createContext = (stack: Stack, complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework,
  scope: stack,
  region: 'us-east-1',
  accountId: '123456789012'
} as ComponentContext);

const synthesize = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high',
  override?: Partial<GlueJobConfig>
) => {
  const app = new App();
  const stack = new Stack(app, `TestStack-${complianceFramework}`);
  const context = createContext(stack, complianceFramework);
  const spec = createSpec(override);
  const component = new GlueJobComponent(stack, `GlueJob-${complianceFramework}`, context, spec);

  component.synth();

  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('GlueJobComponent synthesis', () => {
  it('synthesizes commercial configuration without encryption or monitoring', () => {
    const { template, component } = synthesize('commercial');

    template.hasResourceProperties('AWS::Glue::Job', Match.objectLike({
      GlueVersion: '4.0',
      MaxRetries: 0,
      NumberOfWorkers: 10,
      WorkerType: 'G.1X',
      DefaultArguments: Match.objectLike({
        '--enable-glue-datacatalog': 'true'
      })
    }));

    template.resourceCountIs('AWS::KMS::Key', 0);
    template.resourceCountIs('AWS::Glue::SecurityConfiguration', 0);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 0);

    const capabilities = component.getCapabilities();
    expect(capabilities['etl:glue-job'].monitoringEnabled).toBe(false);
  });

  it('creates encryption resources and alarms for fedramp-high', () => {
    const { template, component } = synthesize('fedramp-high');

    template.hasResourceProperties('AWS::Glue::Job', Match.objectLike({
      MaxRetries: 5,
      NumberOfWorkers: 50,
      WorkerType: 'G.4X',
      DefaultArguments: Match.objectLike({
        '--enable-auto-scaling': 'true',
        '--enable-metrics': 'true'
      }),
      SecurityConfiguration: Match.anyValue()
    }));

    template.resourceCountIs('AWS::KMS::Key', 1);
    template.hasResourceProperties('AWS::Glue::SecurityConfiguration', Match.objectLike({
      EncryptionConfiguration: Match.objectLike({
        CloudWatchEncryption: Match.objectLike({ CloudWatchEncryptionMode: 'SSE-KMS' })
      })
    }));

    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.resourceCountIs('AWS::Logs::LogGroup', 3);

    expect(component.getConstruct('kmsKey')).toBeDefined();
    expect(component.getConstruct('securityConfiguration')).toBeDefined();
    expect(component.getConstruct('alarm:jobFailure')).toBeDefined();
    expect(component.getConstruct('alarm:jobDuration')).toBeDefined();

    const capability = component.getCapabilities()['etl:glue-job'];
    expect(capability.monitoringEnabled).toBe(true);
    expect(capability.securityConfiguration).toContain('test-service-test-glue-job');
    expect(capability.kmsKeyArn).toBeDefined();
  });

  it('honours manifest overrides for logging groups and retries', () => {
    const { template, component } = synthesize('fedramp-moderate', {
      maxRetries: 2,
      logging: {
        groups: [
          {
            id: 'custom',
            enabled: true,
            logGroupSuffix: 'custom-log',
            retentionDays: 30,
            removalPolicy: 'destroy'
          }
        ]
      }
    });

    template.hasResourceProperties('AWS::Glue::Job', Match.objectLike({ MaxRetries: 2 }));
    template.resourceCountIs('AWS::Logs::LogGroup', 1);
    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      LogGroupName: `/aws/glue/jobs/test-service-test-glue-job/custom-log`,
      RetentionInDays: 30
    }));

    expect(component.getConstruct('logGroup:custom')).toBeDefined();
  });
});
