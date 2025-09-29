import * as cdk from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import { EcsEc2ServiceConfig, EcsEc2ServiceConfigBuilder } from '../ecs-ec2-service.builder';

const createContext = (framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'): ComponentContext => ({
  serviceName: 'orders',
  environment: 'dev',
  complianceFramework: framework,
  accountId: '123456789012',
  region: 'us-east-1',
  scope: new cdk.Stack(),
  serviceLabels: {
    owner: 'platform-team',
    version: '1.0.0'
  }
});

const createSpec = (config: Partial<EcsEc2ServiceConfig>): ComponentSpec => ({
  name: 'orders-ec2',
  type: 'ecs-ec2-service',
  config
});

describe('EcsEc2ServiceConfigBuilder', () => {
  const buildConfig = (
    framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high',
    config: Partial<EcsEc2ServiceConfig>
  ) => {
    const builder = new EcsEc2ServiceConfigBuilder(createContext(framework), createSpec(config));
    return builder.buildSync();
  };

  it('applies commercial defaults from platform configuration', () => {
    const config = buildConfig('commercial', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.taskCpu).toBe(256);
    expect(config.taskMemory).toBe(512);
    expect(config.logging.retentionInDays).toBe(30);
    expect(config.logging.removalPolicy).toBe('destroy');
    expect(config.monitoring.alarms.cpu.threshold).toBe(80);
    expect(config.diagnostics.enableExecuteCommand).toBe(false);
  });

  it('applies FedRAMP Moderate defaults', () => {
    const config = buildConfig('fedramp-moderate', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.taskCpu).toBe(512);
    expect(config.logging.retentionInDays).toBe(1827);
    expect(config.monitoring.alarms.cpu.threshold).toBe(70);
    expect(config.diagnostics.enableExecuteCommand).toBe(true);
  });

  it('applies FedRAMP High defaults', () => {
    const config = buildConfig('fedramp-high', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.taskCpu).toBeGreaterThanOrEqual(1024);
    expect(config.logging.retentionInDays).toBe(3653);
    expect(config.monitoring.alarms.cpu.threshold).toBeLessThanOrEqual(60);
    expect(config.diagnostics.enableExecuteCommand).toBe(true);
  });

  it('honours manifest overrides ahead of platform defaults', () => {
    const config = buildConfig('commercial', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: '1.2.3' },
      taskCpu: 2048,
      logging: {
        createLogGroup: true,
        streamPrefix: 'custom',
        retentionInDays: 90,
        removalPolicy: 'retain'
      },
      diagnostics: {
        enableExecuteCommand: true
      }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.taskCpu).toBe(2048);
    expect(config.logging.streamPrefix).toBe('custom');
    expect(config.logging.retentionInDays).toBe(90);
    expect(config.diagnostics.enableExecuteCommand).toBe(true);
  });
});
