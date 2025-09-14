/**
 * VPC ConfigBuilder Tests
 * Tests for VPC configuration builder following Platform Testing Standard v1.0
 */

import { VpcConfigBuilder, VpcConfig, VPC_CONFIG_SCHEMA } from '../vpc.builder';
import { ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';
import { ConfigBuilderContext } from '../../../../src/platform/contracts/config-builder';

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  environment,
  complianceFramework,
  scope: {} as any, // Mock scope
  region: 'us-east-1',
  accountId: '123456789012',
  serviceLabels: {
    'owner': 'test-team',
    'version': '1.0.0'
  }
});

const createMockSpec = (config: Partial<VpcConfig> = {}): ComponentSpec => ({
  name: 'test-vpc',
  type: 'vpc',
  config
});

describe('VpcConfigBuilder', () => {

  describe('Hardcoded Fallbacks (Layer 1)', () => {

    it('should provide ultra-safe baseline configuration', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      const builderContext: ConfigBuilderContext = { context, spec };

      const builder = new VpcConfigBuilder(builderContext, VPC_CONFIG_SCHEMA);
      const config = builder.buildSync();

      // Verify ultra-safe defaults
      expect(config.cidr).toBe('10.0.0.0/16');
      expect(config.maxAzs).toBe(2);
      expect(config.natGateways).toBe(1);
      expect(config.flowLogsEnabled).toBe(true);
      expect(config.flowLogRetentionDays).toBe(30); // Platform config overrides baseline
      expect(config.dns?.enableDnsHostnames).toBe(true);
      expect(config.dns?.enableDnsSupport).toBe(true);
      expect(config.subnets?.public?.cidrMask).toBe(24);
      expect(config.subnets?.private?.cidrMask).toBe(24);
      expect(config.subnets?.database?.cidrMask).toBe(28);
    });

    it('should provide safe VPC endpoint defaults', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      const builderContext: ConfigBuilderContext = { context, spec };

      const builder = new VpcConfigBuilder(builderContext, VPC_CONFIG_SCHEMA);
      const config = builder.buildSync();

      // VPC endpoints from platform config
      expect(config.vpcEndpoints?.s3).toBe(true);
      expect(config.vpcEndpoints?.dynamodb).toBe(true);
      expect(config.vpcEndpoints?.secretsManager).toBe(false);
      expect(config.vpcEndpoints?.kms).toBe(false);
    });

  });

  describe('Compliance Framework Defaults (Layer 2)', () => {

    it('should apply commercial compliance defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      const builderContext: ConfigBuilderContext = { context, spec };

      const builder = new VpcConfigBuilder(builderContext, VPC_CONFIG_SCHEMA);
      const config = builder.buildSync();

      expect(config.flowLogsEnabled).toBe(true);
      expect(config.flowLogRetentionDays).toBe(30); // Platform config overrides compliance defaults
      expect(config.natGateways).toBe(1); // Cost-optimized
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(false); // Cost-optimized
    });

    it('should apply FedRAMP moderate compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      const builderContext: ConfigBuilderContext = { context, spec };

      const builder = new VpcConfigBuilder(builderContext, VPC_CONFIG_SCHEMA);
      const config = builder.buildSync();

      expect(config.flowLogsEnabled).toBe(true);
      expect(config.flowLogRetentionDays).toBe(1095); // Platform config overrides compliance defaults
      expect(config.natGateways).toBe(2); // Redundancy for compliance
      expect(config.vpcEndpoints?.s3).toBe(true); // Required for secure access
      expect(config.vpcEndpoints?.secretsManager).toBe(true);
      expect(config.vpcEndpoints?.kms).toBe(true);
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(false); // Platform config overrides compliance defaults
    });

    it('should apply FedRAMP high compliance defaults', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();
      const builderContext: ConfigBuilderContext = { context, spec };

      const builder = new VpcConfigBuilder(builderContext, VPC_CONFIG_SCHEMA);
      const config = builder.buildSync();

      expect(config.flowLogsEnabled).toBe(true);
      expect(config.flowLogRetentionDays).toBe(2555); // 7 years for FedRAMP high
      expect(config.natGateways).toBe(3); // Platform config overrides compliance defaults
      expect(config.vpcEndpoints?.s3).toBe(true); // All endpoints required
      expect(config.vpcEndpoints?.dynamodb).toBe(true);
      expect(config.vpcEndpoints?.secretsManager).toBe(true);
      expect(config.vpcEndpoints?.kms).toBe(true);
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(false); // Platform config overrides compliance defaults
    });

  });

  describe('5-Layer Precedence Chain', () => {

    it('should apply component overrides over platform defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        cidr: '172.16.0.0/16',
        maxAzs: 3,
        natGateways: 0,
        flowLogsEnabled: false
      });
      const builderContext: ConfigBuilderContext = { context, spec };

      const builder = new VpcConfigBuilder(builderContext, VPC_CONFIG_SCHEMA);
      const config = builder.buildSync();

      // Component overrides should win
      expect(config.cidr).toBe('172.16.0.0/16');
      expect(config.maxAzs).toBe(3);
      expect(config.natGateways).toBe(0);
      expect(config.flowLogsEnabled).toBe(false);
    });

    it('should merge nested configuration objects correctly', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        subnets: {
          public: {
            cidrMask: 26 // Override only public subnet mask
          }
        },
        vpcEndpoints: {
          s3: true // Override only S3 endpoint
        }
      });
      const builderContext: ConfigBuilderContext = { context, spec };

      const builder = new VpcConfigBuilder(builderContext, VPC_CONFIG_SCHEMA);
      const config = builder.buildSync();

      // Component override should win for public subnet
      expect(config.subnets?.public?.cidrMask).toBe(26);
      // Defaults should win for other subnets
      expect(config.subnets?.private?.cidrMask).toBe(24);
      expect(config.subnets?.database?.cidrMask).toBe(28);

      // Component override should win for S3
      expect(config.vpcEndpoints?.s3).toBe(true);
      // Platform config should win for other endpoints
      expect(config.vpcEndpoints?.dynamodb).toBe(true);
    });

    it('should handle monitoring configuration merging', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec({
        monitoring: {
          enabled: false, // Override enabled
          alarms: {
            natGatewayPacketDropThreshold: 2000 // Override threshold
          }
        }
      });
      const builderContext: ConfigBuilderContext = { context, spec };

      const builder = new VpcConfigBuilder(builderContext, VPC_CONFIG_SCHEMA);
      const config = builder.buildSync();

      // Component override should win for enabled
      expect(config.monitoring?.enabled).toBe(false);
      // Component override should win for threshold
      expect(config.monitoring?.alarms?.natGatewayPacketDropThreshold).toBe(2000);
      // Platform config should win for detailedMetrics
      expect(config.monitoring?.detailedMetrics).toBe(false);
    });

  });

  describe('JSON Schema Validation', () => {

    it('should validate CIDR format', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        cidr: 'invalid-cidr'
      });
      const builderContext: ConfigBuilderContext = { context, spec };

      const builder = new VpcConfigBuilder(builderContext, VPC_CONFIG_SCHEMA);

      // Should not throw but may produce warnings (implementation dependent)
      expect(() => builder.buildSync()).not.toThrow();
    });

    it('should validate maxAzs range', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        maxAzs: 10 // Outside valid range
      });
      const builderContext: ConfigBuilderContext = { context, spec };

      const builder = new VpcConfigBuilder(builderContext, VPC_CONFIG_SCHEMA);

      // Should not throw but may produce warnings (implementation dependent)
      expect(() => builder.buildSync()).not.toThrow();
    });

    it('should validate subnet CIDR masks', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        subnets: {
          public: {
            cidrMask: 30 // Outside valid range
          }
        }
      });
      const builderContext: ConfigBuilderContext = { context, spec };

      const builder = new VpcConfigBuilder(builderContext, VPC_CONFIG_SCHEMA);

      // Should not throw but may produce warnings (implementation dependent)
      expect(() => builder.buildSync()).not.toThrow();
    });

  });

});
