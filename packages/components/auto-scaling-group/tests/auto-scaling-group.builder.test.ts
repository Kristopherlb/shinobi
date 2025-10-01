import {
  AutoScalingGroupComponentConfigBuilder,
  AutoScalingGroupConfig
} from '../src/auto-scaling-group.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createContext = (
  framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'platform-team',
  environment,
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  scope: {} as any,
  tags: {
    'service-name': 'test-service',
    owner: 'platform-team',
    environment,
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<AutoScalingGroupConfig> = {}): ComponentSpec => ({
  name: 'asg-test',
  type: 'auto-scaling-group',
  config
});

describe('AutoScalingGroupComponentConfigBuilder', () => {
  it('builds commercial defaults from platform configuration', () => {
    const builder = new AutoScalingGroupComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.launchTemplate.instanceType).toBe('t3.micro');
    expect(config.launchTemplate.detailedMonitoring).toBe(false);
    expect(config.launchTemplate.requireImdsv2).toBe(true);
    expect(config.launchTemplate.installAgents.ssm).toBe(true);
    expect(config.launchTemplate.installAgents.cloudwatch).toBe(true);
    expect(config.vpc.subnetType).toBe('PUBLIC');
    expect(config.storage.encrypted).toBe(true);
    expect(config.security.managedPolicies).toHaveLength(0);
  });

  it('builds fedramp-moderate defaults with hardened controls', () => {
    const builder = new AutoScalingGroupComponentConfigBuilder({
      context: createContext('fedramp-moderate', 'stage'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.launchTemplate.instanceType).toBe('t3.medium');
    expect(config.launchTemplate.detailedMonitoring).toBe(true);
    expect(config.launchTemplate.requireImdsv2).toBe(true);
    expect(config.vpc.subnetType).toBe('PRIVATE_WITH_EGRESS');
    expect(config.storage.encrypted).toBe(true);
    expect(config.security.managedPolicies).toContain('AmazonSSMManagedInstanceCore');
    expect(config.storage.kms.useCustomerManagedKey).toBe(true);
    expect(config.storage.kms.enableKeyRotation).toBe(true);
  });

  it('allows manifest overrides to take precedence', () => {
    const builder = new AutoScalingGroupComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        launchTemplate: {
          instanceType: 'm5.large',
          detailedMonitoring: true,
          requireImdsv2: true,
          installAgents: {
            ssm: true,
            cloudwatch: true,
            stigHardening: true
          }
        },
        storage: {
          rootVolumeSize: 200,
          rootVolumeType: 'io2',
          encrypted: true,
          kms: {
            useCustomerManagedKey: true,
            enableKeyRotation: true
          }
        }
      })
    });

    const config = builder.buildSync();

    expect(config.launchTemplate.instanceType).toBe('m5.large');
    expect(config.launchTemplate.installAgents.cloudwatch).toBe(true);
    expect(config.storage.rootVolumeSize).toBe(200);
    expect(config.storage.kms.useCustomerManagedKey).toBe(true);
  });
});
