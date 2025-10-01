import * as cdk from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import { EcsFargateServiceComponentConfigBuilder } from '../ecs-fargate-service.builder.js';

describe('EcsFargateServiceComponentConfigBuilder', () => {
  const scope = new cdk.Stack();

  const baseContext: ComponentContext = {
    serviceName: 'orders',
    environment: 'dev',
    complianceFramework: 'commercial',
    accountId: '123456789012',
    region: 'us-east-1',
    scope
  } as ComponentContext;

  const baseSpec: ComponentSpec = {
    name: 'orders-api',
    type: 'ecs-fargate-service',
    config: {
      cluster: 'shared-cluster',
      image: {
        repository: 'nginx'
      },
      serviceConnect: {
        portMappingName: 'api'
      }
    }
  };

  it('applies commercial defaults', () => {
    const builder = new EcsFargateServiceComponentConfigBuilder(baseContext, baseSpec);
    const config = builder.buildSync();

    expect(config.cpu).toBe(256);
    expect(config.memory).toBe(512);
    expect(config.port).toBe(8080);
    expect(config.logging.removalPolicy).toBe('destroy');
    expect(config.diagnostics.enableExecuteCommand).toBe(false);
    expect(config.monitoring.alarms.cpuUtilization.threshold).toBe(85);
    expect(config.serviceConnect.dnsName).toBe('orders-api');
  });

  it('applies fedramp-moderate defaults', () => {
    const context: ComponentContext = {
      ...baseContext,
      complianceFramework: 'fedramp-moderate'
    } as ComponentContext;

    const builder = new EcsFargateServiceComponentConfigBuilder(context, baseSpec);
    const config = builder.buildSync();

    expect(config.cpu).toBe(512);
    expect(config.memory).toBe(1024);
    expect(config.logging.retentionInDays).toBe(365);
    expect(config.logging.removalPolicy).toBe('retain');
    expect(config.diagnostics.enableExecuteCommand).toBe(true);
    expect(config.monitoring.alarms.cpuUtilization.threshold).toBe(80);
  });

  it('applies fedramp-high defaults', () => {
    const context: ComponentContext = {
      ...baseContext,
      complianceFramework: 'fedramp-high'
    } as ComponentContext;

    const builder = new EcsFargateServiceComponentConfigBuilder(context, baseSpec);
    const config = builder.buildSync();

    expect(config.cpu).toBe(1024);
    expect(config.memory).toBe(2048);
    expect(config.desiredCount).toBe(2);
    expect(config.monitoring.alarms.runningTaskCount.threshold).toBe(2);
    expect(config.monitoring.alarms.memoryUtilization.threshold).toBe(75);
  });

  it('respects manifest overrides', () => {
    const spec: ComponentSpec = {
      ...baseSpec,
      config: {
        ...baseSpec.config,
        cpu: 2048,
        memory: 4096,
        logging: {
          retentionInDays: 90,
          removalPolicy: 'destroy'
        },
        diagnostics: {
          enableExecuteCommand: true
        }
      }
    };

    const builder = new EcsFargateServiceComponentConfigBuilder(baseContext, spec);
    const config = builder.buildSync();

    expect(config.cpu).toBe(2048);
    expect(config.memory).toBe(4096);
    expect(config.logging.retentionInDays).toBe(90);
    expect(config.diagnostics.enableExecuteCommand).toBe(true);
  });
});
