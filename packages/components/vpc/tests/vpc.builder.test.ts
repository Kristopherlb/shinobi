import { Stack } from 'aws-cdk-lib';
import { ConfigBuilderContext } from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '../../@shinobi/core/component-interfaces.js';
import { VpcConfig, VpcConfigBuilder } from '../vpc.builder.js';

const createContext = (framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'): ComponentContext => ({
  serviceName: 'orders',
  environment: 'dev',
  complianceFramework: framework,
  accountId: '123456789012',
  region: 'us-east-1',
  scope: new Stack(),
  serviceLabels: {
    owner: 'platform-team',
    version: '1.0.0'
  }
});

const createSpec = (config: Partial<VpcConfig> = {}): ComponentSpec => ({
  name: 'network',
  type: 'vpc',
  config
});

describe('VpcConfigBuilder', () => {
  const buildConfig = (framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high', config: Partial<VpcConfig> = {}) => {
    const context = createContext(framework);
    const spec = createSpec(config);
    const builderContext: ConfigBuilderContext = { context, spec };
    const builder = new VpcConfigBuilder(builderContext);
    return builder.buildSync();
  };

  it('merges commercial defaults from platform configuration', () => {
    const config = buildConfig('commercial');

    expect(config.cidr).toBe('10.0.0.0/16');
    expect(config.flowLogs).toEqual({
      enabled: true,
      retentionInDays: 30,
      removalPolicy: 'destroy'
    });
    expect(config.vpcEndpoints).toEqual(expect.objectContaining({
      s3: true,
      dynamodb: true,
      secretsManager: false,
      kms: false,
      lambda: false
    }));
    expect(config.security.complianceNacls.enabled).toBe(false);
  });

  it('applies FedRAMP Moderate defaults from configuration', () => {
    const config = buildConfig('fedramp-moderate');

    expect(config.natGateways).toBe(2);
    expect(config.flowLogs.retentionInDays).toBe(1827);
    expect(config.monitoring.detailedMetrics).toBe(true);
    expect(config.vpcEndpoints).toEqual(expect.objectContaining({
      s3: true,
      dynamodb: true,
      secretsManager: true,
      kms: true
    }));
    expect(config.security.complianceNacls.enabled).toBe(true);
    expect(config.security.complianceNacls.mode).toBe('standard');
  });

  it('applies FedRAMP High defaults from configuration', () => {
    const config = buildConfig('fedramp-high');

    expect(config.natGateways).toBe(3);
    expect(config.flowLogs.retentionInDays).toBe(3653);
    expect(config.vpcEndpoints.lambda).toBe(true);
    expect(config.monitoring.alarms.natGatewayPacketDropThreshold).toBe(250);
    expect(config.security.complianceNacls.mode).toBe('high');
    expect(config.security.restrictDefaultSecurityGroup).toBe(true);
  });

  it('honours manifest overrides ahead of platform defaults', () => {
    const config = buildConfig('commercial', {
      cidr: '172.16.0.0/16',
      natGateways: 0,
      flowLogs: {
        enabled: false,
        retentionInDays: 30,
        removalPolicy: 'destroy'
      },
      vpcEndpoints: {
        s3: false,
        dynamodb: false,
        secretsManager: false,
        kms: false,
        lambda: false
      }
    } as Partial<VpcConfig>);

    expect(config.cidr).toBe('172.16.0.0/16');
    expect(config.natGateways).toBe(0);
    expect(config.flowLogs.enabled).toBe(false);
    expect(config.vpcEndpoints.s3).toBe(false);
  });
});
