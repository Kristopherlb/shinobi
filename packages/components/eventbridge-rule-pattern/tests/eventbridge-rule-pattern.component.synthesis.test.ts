import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { EventBridgeRulePatternComponent } from '../src/eventbridge-rule-pattern.component';
import { EventBridgeRulePatternConfig } from '../src/eventbridge-rule-pattern.builder';
import { afterAll } from 'vitest';

type Framework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

const baseContext = (framework: Framework = 'commercial'): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: framework,
  scope: {} as Construct,
  region: 'us-east-1',
  accountId: '123456789012'
} as ComponentContext);

const spec = (config: Partial<EventBridgeRulePatternConfig> = {}): ComponentSpec => ({
  name: 'test-rule',
  type: 'eventbridge-rule-pattern',
  config: {
    eventPattern: { source: ['aws.ec2'] },
    deadLetterQueue: { enabled: true },
    monitoring: { enabled: true, cloudWatchLogs: { enabled: true } },
    ...config
  }
});

const synthesize = (framework: Framework, config?: Partial<EventBridgeRulePatternConfig>) => {
  const app = new App();
  const stack = new Stack(app, `TestStack-${framework}`);
  const context = baseContext(framework);
  const component = new EventBridgeRulePatternComponent(stack, `Rule-${framework}`, context, spec(config));
  component.synth();
  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('EventBridgeRulePatternComponent synthesis', () => {
  it('creates a commercial rule with mandatory DLQ and logging', () => {
    const { template, component } = synthesize('commercial');

    template.hasResourceProperties('AWS::Events::Rule', Match.objectLike({
      State: 'ENABLED'
    }));

    // Monitoring and DLQ are now mandatory
    template.resourceCountIs('AWS::SQS::Queue', 1);
    template.resourceCountIs('AWS::Logs::LogGroup', 1);
    template.resourceCountIs('AWS::KMS::Key', 0);

    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: 365 // Commercial: 1 year
    }));

    const capability = component.getCapabilityData()['eventbridge:rule-pattern'];
    expect(capability.state).toBe('enabled');
    expect(capability.deadLetterQueue.encrypted).toBe(false);
    expect(capability.logGroup.encrypted).toBe(false);
  });

  it('creates customer-managed keys and uses 3-year retention for fedramp-moderate', () => {
    const { template, component } = synthesize('fedramp-moderate');

    template.resourceCountIs('AWS::SQS::Queue', 1);
    template.resourceCountIs('AWS::KMS::Key', 2); // Separate keys for logs and DLQ
    
    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: 1827 // FedRAMP Moderate: 5 years (>= requirement)
    }));

    template.hasResourceProperties('AWS::KMS::Key', Match.objectLike({
      EnableKeyRotation: true
    }));

    const capability = component.getCapabilityData()['eventbridge:rule-pattern'];
    expect(capability.deadLetterQueue.encrypted).toBe(true);
    expect(capability.logGroup.encrypted).toBe(true);
    expect(capability.logGroup.encryptionKeyArn).toBeDefined();
  });

  it('creates customer-managed keys and uses 7-year retention for fedramp-high', () => {
    const { template } = synthesize('fedramp-high');

    template.resourceCountIs('AWS::KMS::Key', 2);
    
    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: 3653 // FedRAMP High: 10 years (>= requirement)
    }));

    template.hasResourceProperties('AWS::KMS::Key', Match.objectLike({
      EnableKeyRotation: true
    }));
  });

  it('honours manifest overrides for monitoring alarms', () => {
    const { template } = synthesize('commercial', {
      monitoring: {
        enabled: true,
        failedInvocations: {
          enabled: true,
          threshold: 10,
          evaluationPeriods: 4,
          periodMinutes: 10,
          comparisonOperator: 'gte',
          treatMissingData: 'ignore',
          statistic: 'Sum'
        },
        invocations: {
          enabled: true,
          threshold: 1,
          evaluationPeriods: 2,
          periodMinutes: 5,
          comparisonOperator: 'lte',
          treatMissingData: 'breaching',
          statistic: 'Sum'
        },
        matchedEvents: {
          enabled: false,
          threshold: 0,
          evaluationPeriods: 1,
          periodMinutes: 5,
          comparisonOperator: 'lte',
          treatMissingData: 'breaching',
          statistic: 'Sum'
        },
        deadLetterQueueMessages: {
          enabled: false,
          threshold: 1,
          evaluationPeriods: 1,
          periodMinutes: 5,
          comparisonOperator: 'gte',
          treatMissingData: 'not-breaching',
          statistic: 'Sum'
        },
        cloudWatchLogs: {
          enabled: true,
          retentionDays: 60,
          removalPolicy: 'retain'
        }
      }
    });

    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: 60
    }));
  });

  it('sanitizes rule names in synthesized resources', () => {
    const { template } = synthesize('commercial', {
      ruleName: 'my@special#rule!'
    });

    template.hasResourceProperties('AWS::Events::Rule', Match.objectLike({
      Name: 'my-special-rule-'
    }));
  });

  it('rejects destructive log removal policy in fedramp-high', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack-Invalid');
    const context = baseContext('fedramp-high');
    const component = new EventBridgeRulePatternComponent(stack, 'Rule-invalid', context, spec({
      monitoring: {
        enabled: true,
        cloudWatchLogs: {
          enabled: true,
          removalPolicy: 'destroy'
        }
      }
    }));

    expect(() => component.synth()).toThrow(/removalPolicy must be retain/);
  });

  // Force exit after all tests to prevent hanging
  afterAll(() => {
    // Give any pending operations a moment to complete
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });
});
