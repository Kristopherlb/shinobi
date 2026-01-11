import { describe, it, expect } from 'vitest';
import { App, Stack, Environment } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { ElastiCacheRedisComponent } from '../src/elasticache-redis.component.js';
import { ElastiCacheRedisConfig } from '../src/elasticache-redis.builder.js';

type Framework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

const baseContext = (framework: Framework = 'commercial', stack?: Stack): ComponentContext => {
  const testStack = stack || new Stack(new App(), 'TestStack');
  return {
    serviceName: 'test-service',
    environment: 'dev',
    complianceFramework: framework,
    scope: testStack,
    region: 'us-east-1',
    accountId: '123456789012',
    serviceLabels: {
      'service-name': 'test-service',
      environment: 'dev',
      'compliance-framework': framework
    },
    tags: {
      'service-name': 'test-service',
      environment: 'dev',
      'compliance-framework': framework
    }
  } as ComponentContext;
};

const spec = (config: Partial<ElastiCacheRedisConfig> = {}): ComponentSpec => ({
  name: 'test-redis',
  type: 'elasticache-redis',
  config
});

const synthesize = (framework: Framework, config?: Partial<ElastiCacheRedisConfig>) => {
  const app = new App();
  const stack = new Stack(app, `TestStack-${framework}`, {
    env: {
      account: '123456789012',
      region: 'us-east-1'
    } as Environment
  });
  const vpc = new ec2.Vpc(stack, `TestVpc-${framework}`, { maxAzs: 2 });
  const context = baseContext(framework, stack);
  context.vpc = vpc;
  const component = new ElastiCacheRedisComponent(stack, `Redis-${framework}`, context, spec(config));
  component.synth();
  return {
    component,
    template: Template.fromStack(stack),
    stack
  };
};

describe('ElastiCacheRedisComponent synthesis', () => {
  it('synthesizes a hardened commercial cluster by default', () => {
    const { template, component } = synthesize('commercial');

    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', Match.objectLike({
      AtRestEncryptionEnabled: true,
      TransitEncryptionEnabled: true,
      SnapshotRetentionLimit: 7,
      NumCacheClusters: 1,
      MultiAZEnabled: false
    }));

    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      LogDeliveryConfigurations: Match.arrayWith([
        Match.objectLike({ LogType: 'slow-log', DestinationType: 'cloudwatch-logs' }),
        Match.objectLike({ LogType: 'engine-log', DestinationType: 'cloudwatch-logs' })
      ])
    });

    template.resourceCountIs('AWS::Logs::LogGroup', 2);
    template.resourceCountIs('AWS::KMS::Key', 1);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 4);

    expect(component.getConstruct('securityGroup')).toBeDefined();
    const capability = component.getCapabilities()['cache:redis'];
    expect(capability.multiAz).toBe(false);
    expect(capability.primaryEndpointAddress).toBeDefined();
    expect(capability.sgId).toBeDefined();
    // Verify configurationEndpoint is included for cluster mode support
    expect(capability.configurationEndpointAddress).toBeDefined();
    expect(capability.configurationEndpointPort).toBeDefined();
  });

  it('enables encryption and monitoring for fedramp-high defaults', () => {
    const { template, component } = synthesize('fedramp-high');

    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', Match.objectLike({
      AtRestEncryptionEnabled: true,
      TransitEncryptionEnabled: true,
      AutomaticFailoverEnabled: true,
      SnapshotRetentionLimit: 30
    }));

    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      LogDeliveryConfigurations: Match.arrayWith([
        Match.objectLike({
          LogType: 'slow-log',
          DestinationType: 'cloudwatch-logs'
        })
      ])
    });

    template.resourceCountIs('AWS::Logs::LogGroup', 2);

    const capability = component.getCapabilities()['cache:redis'];
    expect(capability.authTokenSecretArn).toBeDefined();
    expect(capability.multiAz).toBe(true);
    expect(capability.securityGroupIds).toBeDefined();
    // Verify configurationEndpoint is included for cluster mode support
    expect(capability.configurationEndpointAddress).toBeDefined();
    expect(capability.configurationEndpointPort).toBeDefined();

    template.resourceCountIs('AWS::CloudWatch::Alarm', 4);
  });

  it('applies manifest overrides for security groups and alarms', () => {
    const { template } = synthesize('commercial', {
      security: {
        create: false,
        securityGroupIds: ['sg-12345678'],
        allowedCidrs: []
      },
      monitoring: {
        enabled: true,
        logDelivery: [
          {
            enabled: true,
            logType: 'engine-log',
            destinationType: 'cloudwatch-logs',
            destinationName: '/aws/elasticache/redis/engine/test-service-test-redis',
            logFormat: 'json'
          }
        ],
        alarms: {
          cpuUtilization: { enabled: true, threshold: 60, evaluationPeriods: 2, periodMinutes: 5 },
          cacheMisses: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 },
          evictions: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 },
          connections: { enabled: true, threshold: 250, evaluationPeriods: 2, periodMinutes: 5 }
        }
      }
    });

    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', Match.objectLike({
      SecurityGroupIds: Match.arrayWith(['sg-12345678'])
    }));

    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
  });

  it('throws when neither config.vpc.vpcId nor context.vpc is provided', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack-NoVpc', {
      env: {
        account: '123456789012',
        region: 'us-east-1'
      } as Environment
    });
    const context = baseContext('commercial', stack);
    const component = new ElastiCacheRedisComponent(stack, 'Redis-NoVpc', context, spec());

    expect(() => component.synth()).toThrow(/requires an explicit VPC/);
  });

  it('throws error when conflicting log destination types are configured', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack-ConflictingLogs', {
      env: {
        account: '123456789012',
        region: 'us-east-1'
      } as Environment
    });
    const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });
    const context = baseContext('commercial', stack);
    context.vpc = vpc;

    const component = new ElastiCacheRedisComponent(
      stack,
      'Redis-ConflictingLogs',
      context,
      spec({
        monitoring: {
          enabled: true,
          logDelivery: [
            {
              enabled: true,
              logType: 'slow-log',
              destinationType: 'cloudwatch-logs',
              destinationName: '/aws/elasticache/redis/slow/test-service-test-redis',
              logFormat: 'json'
            },
            {
              enabled: true,
              logType: 'slow-log',
              destinationType: 'kinesis-firehose',
              destinationName: 'my-delivery-stream',
              logFormat: 'json'
            }
          ],
          alarms: {
            cpuUtilization: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 },
            cacheMisses: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 },
            evictions: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 },
            connections: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 }
          }
        }
      })
    );

    expect(() => component.synth()).toThrow(/Conflicting log destination types for slow-log/);
  });

  it('includes configurationEndpoint in capabilities for cluster mode support', () => {
    const { component } = synthesize('commercial');

    const capability = component.getCapabilities()['cache:redis'];
    expect(capability).toHaveProperty('configurationEndpointAddress');
    expect(capability).toHaveProperty('configurationEndpointPort');
    expect(typeof capability.configurationEndpointAddress).toBe('string');
    expect(typeof capability.configurationEndpointPort).toBe('string');
  });
});
