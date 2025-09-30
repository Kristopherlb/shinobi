/**
 * ShinobiComponent ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { ShinobiComponentConfigBuilder, ShinobiConfig, SHINOBI_CONFIG_SCHEMA } from '../src/shinobi.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

type PartialConfig = Partial<ShinobiConfig>;

const createMockContext = (
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework,
  region: 'us-east-1',
  accountId: '123456789012',
  account: '123456789012',
  scope: undefined as any,
  tags: {
    'service-name': 'test-service',
    owner: 'test-team',
    environment,
    'compliance-framework': complianceFramework
  }
});

const createMockSpec = (config: PartialConfig = {}): ComponentSpec => ({
  name: 'test-shinobi',
  type: 'shinobi',
  config
});

describe('ShinobiComponentConfigBuilder', () => {
  const buildConfig = (framework: string, config: PartialConfig = {}): ShinobiConfig => {
    const context = createMockContext(framework);
    const spec = createMockSpec(config);
    const builder = new ShinobiComponentConfigBuilder({ context, spec });
    return builder.buildSync();
  };

  describe('Configuration Defaults', () => {
    it('Commercial defaults reflect platform configuration', () => {
      const config = buildConfig('commercial');

      expect(config.compute).toMatchObject({
        mode: 'ecs',
        cpu: 256,
        memory: 512,
        taskCount: 1,
        containerPort: 3000
      });
      expect(config.api).toMatchObject({
        exposure: 'internal',
        version: '1.0',
        loadBalancer: { enabled: true },
        rateLimit: { requestsPerMinute: 1000, burstCapacity: 2000 }
      });
      expect(config.featureFlags?.defaults).toMatchObject({
        'shinobi.cost-optimization': true,
        'shinobi.security-scanning': true,
        'shinobi.compliance-monitoring': true
      });
      expect(config.dataSources).toMatchObject({
        components: true,
        services: true,
        dependencies: true,
        compliance: true,
        cost: false,
        security: false,
        performance: false
      });
      expect(config.compliance).toMatchObject({
        securityLevel: 'standard',
        auditLogging: false
      });
      expect(config.logging).toMatchObject({
        retentionDays: 30,
        logLevel: 'info',
        structuredLogging: true
      });
    });

    it('FedRAMP Moderate defaults apply compliance hardening from configuration', () => {
      const config = buildConfig('fedramp-moderate');

      expect(config.compute).toMatchObject({
        cpu: 512,
        memory: 1024,
        taskCount: 2
      });
      expect(config.dataSources).toEqual({
        components: true,
        services: true,
        dependencies: true,
        compliance: true,
        cost: true,
        security: true,
        performance: true
      });
      expect(config.observability?.alerts?.thresholds).toMatchObject({
        cpuUtilization: 70,
        memoryUtilization: 70,
        responseTime: 1.5
      });
      expect(config.compliance).toMatchObject({
        securityLevel: 'enhanced',
        auditLogging: true
      });
      expect(config.logging?.retentionDays).toBe(90);
    });

    it('FedRAMP High defaults enforce maximum security posture', () => {
      const config = buildConfig('fedramp-high');

      expect(config.compute).toMatchObject({
        cpu: 1024,
        memory: 2048,
        taskCount: 3
      });
      const defaults = config.featureFlags?.defaults ?? {};
      expect(Object.values(defaults).every(value => value === true)).toBe(true);
      expect(config.observability?.dashboards).toEqual([
        'reliability',
        'performance',
        'security',
        'compliance'
      ]);
      expect(config.observability?.alerts?.thresholds).toMatchObject({
        cpuUtilization: 60,
        memoryUtilization: 60,
        responseTime: 1
      });
      expect(config.logging?.retentionDays).toBe(2555);
    });
  });

  describe('Configuration Merging', () => {
    it('merges user overrides with platform defaults', () => {
      const config = buildConfig('commercial', {
        compute: {
          cpu: 1024,
          memory: 2048
        },
        api: {
          exposure: 'public',
          loadBalancer: {
            enabled: true,
            certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
          }
        },
        featureFlags: {
          enabled: false
        }
      });

      expect(config.compute).toMatchObject({
        cpu: 1024,
        memory: 2048,
        taskCount: 1
      });
      expect(config.api?.exposure).toBe('public');
      expect(config.featureFlags?.enabled).toBe(false);
      expect(config.featureFlags?.provider).toBe('aws-appconfig');
    });

    it('supports environment variable interpolation for numeric values', () => {
      process.env.SHINOBI_CPU = '1536';
      process.env.SHINOBI_TASKS = '4';

      const config = buildConfig('commercial', {
        compute: {
          cpu: '${env:SHINOBI_CPU}',
          taskCount: '${env:SHINOBI_TASKS}'
        }
      });

      expect(config.compute?.cpu).toBe('1536');
      expect(config.compute?.taskCount).toBe('4');

      delete process.env.SHINOBI_CPU;
      delete process.env.SHINOBI_TASKS;
    });
  });

  describe('Schema Definition', () => {
    it('exposes a JSON schema for configuration validation', () => {
      expect(SHINOBI_CONFIG_SCHEMA.type).toBe('object');
      expect(SHINOBI_CONFIG_SCHEMA.properties.compute).toBeDefined();
      expect(SHINOBI_CONFIG_SCHEMA.properties.api).toBeDefined();
      expect(SHINOBI_CONFIG_SCHEMA.properties.observability).toBeDefined();
      expect(SHINOBI_CONFIG_SCHEMA.properties.logging).toBeDefined();
    });
  });
});
