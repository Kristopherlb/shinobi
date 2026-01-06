import * as cdk from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { EcsFargateServiceComponentConfigBuilder } from '../src/ecs-fargate-service.builder';

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

  it('applies commercial defaults with framework-aware values', () => {
    const builder = new EcsFargateServiceComponentConfigBuilder(baseContext, baseSpec);
    const config = builder.buildSync();

    expect(config.cpu).toBe(256);
    expect(config.memory).toBe(512);
    expect(config.port).toBe(8080);
    expect(config.desiredCount).toBe(1);
    expect(config.logging.retentionInDays).toBe(30); // 30 days for commercial
    expect(config.logging.removalPolicy).toBe('destroy');
    expect(config.diagnostics.enableExecuteCommand).toBe(false);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.alarms.cpuUtilization.enabled).toBe(true);
    expect(config.monitoring.alarms.cpuUtilization.threshold).toBe(85);
    expect(config.monitoring.alarms.memoryUtilization.threshold).toBe(90);
    expect(config.serviceConnect.dnsName).toBe('orders-api');
    expect(config.network).toBeDefined();
    expect(config.network!.allowAllOutbound).toBe(false);
  });

  it('applies fedramp-moderate defaults with stricter requirements', () => {
    const context: ComponentContext = {
      ...baseContext,
      complianceFramework: 'fedramp-moderate'
    } as ComponentContext;

    const builder = new EcsFargateServiceComponentConfigBuilder(context, baseSpec);
    const config = builder.buildSync();
    // Higher resource allocations for FedRAMP
    expect(config.cpu).toBe(512);
    expect(config.memory).toBe(1024);
    expect(config.desiredCount).toBe(2); // High availability

    // Longer log retention (3 years for FedRAMP Moderate)
    expect(config.logging.retentionInDays).toBe(1096);
    expect(config.logging.removalPolicy).toBe('retain');

    // ECS Exec enabled for audit
    expect(config.diagnostics.enableExecuteCommand).toBe(true);

    // Stricter monitoring thresholds
    expect(config.monitoring.alarms.cpuUtilization.threshold).toBe(80);
    expect(config.monitoring.alarms.memoryUtilization.threshold).toBe(85);
    expect(config.monitoring.alarms.runningTaskCount.threshold).toBe(2);
  });

  it('applies fedramp-high defaults with maximum security', () => {
    const context: ComponentContext = {
      ...baseContext,
      complianceFramework: 'fedramp-high'
    } as ComponentContext;

    const builder = new EcsFargateServiceComponentConfigBuilder(context, baseSpec);
    const config = builder.buildSync();
    // Maximum resource allocations
    expect(config.cpu).toBe(1024);
    expect(config.memory).toBe(2048);
    expect(config.desiredCount).toBe(2);

    // 7 year log retention for FedRAMP High
    expect(config.logging.retentionInDays).toBe(2557);
    expect(config.logging.removalPolicy).toBe('retain');

    // ECS Exec enabled
    expect(config.diagnostics.enableExecuteCommand).toBe(true);

    // Strictest monitoring thresholds
    expect(config.monitoring.alarms.cpuUtilization.threshold).toBe(70);
    expect(config.monitoring.alarms.memoryUtilization.threshold).toBe(75);
    expect(config.monitoring.alarms.runningTaskCount.threshold).toBe(2);
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
        },
        network: {
          allowAllOutbound: true
        }
      }
    };

    const builder = new EcsFargateServiceComponentConfigBuilder(baseContext, spec);
    const config = builder.buildSync();

    expect(config.cpu).toBe(2048);
    expect(config.memory).toBe(4096);
    expect(config.logging.retentionInDays).toBe(90);
    expect(config.diagnostics.enableExecuteCommand).toBe(true);
    expect(config.network).toBeDefined();
    expect(config.network!.allowAllOutbound).toBe(true);
  });
});
