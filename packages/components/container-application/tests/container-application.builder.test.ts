import { ContainerApplicationComponentConfigBuilder } from '../src/container-application.builder.ts';
import type { ComponentContext, ComponentSpec } from '@shinobi/core';

describe('ContainerApplicationComponentConfigBuilder', () => {
  const createContext = (overrides: Partial<ComponentContext> = {}): ComponentContext => ({
    serviceName: 'demo-service',
    environment: 'dev',
    complianceFramework: 'commercial',
    region: 'us-east-1',
    accountId: '123456789012',
    ...overrides
  }) as ComponentContext;

  const createSpec = (config: Record<string, any> = {}): ComponentSpec => ({
    name: 'web',
    type: 'container-application',
    config
  }) as ComponentSpec;

  it('applies hardcoded fallbacks for minimal configuration', () => {
    const builder = new ContainerApplicationComponentConfigBuilder(createContext(), createSpec());
    const config = builder.buildSync();

    expect(config.application.name).toBe('container-app');
    expect(config.application.port).toBe(3000);
    expect(config.service.cpu).toBe(512);
    expect(config.service.autoScaling.enabled).toBe(true);
    expect(config.service.autoScaling.maxCapacity).toBeGreaterThan(2);
    expect(config.network.assignPublicIp).toBe(true);
    expect(config.network.natGateways).toBe(0);
    expect(config.loadBalancer.port).toBe(80);
    expect(config.observability.enabled).toBe(true);
    expect(config.security.enableEncryption).toBe(true);
  });

  it('merges manifest overrides for service and network layers', () => {
    const builder = new ContainerApplicationComponentConfigBuilder(
      createContext({ environment: 'prod' }),
      createSpec({
        application: {
          name: 'orders',
          port: 8080,
          environment: {
            FEATURE_FLAG: 'enabled'
          }
        },
        service: {
          desiredCount: 4,
          cpu: 1024,
          memory: 2048,
          autoScaling: {
            enabled: true,
            maxCapacity: 6,
            cpuTarget: 65,
            memoryTarget: 70
          }
        },
        network: {
          vpcId: 'vpc-abc123',
          assignPublicIp: true,
          loadBalancerScheme: 'internal'
        },
        ecr: {
          createRepository: false,
          repositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/orders'
        }
      })
    );

    const config = builder.buildSync();

    expect(config.application.name).toBe('orders');
    expect(config.application.environment.FEATURE_FLAG).toBe('enabled');
    expect(config.service.desiredCount).toBe(4);
    expect(config.service.autoScaling.maxCapacity).toBe(6);
    expect(config.service.autoScaling.cpuTarget).toBe(65);
    expect(config.network.vpcId).toBe('vpc-abc123');
    expect(config.network.assignPublicIp).toBe(true);
    expect(config.ecr.createRepository).toBe(false);
    expect(config.ecr.repositoryArn).toContain('repository/orders');
  });
});
