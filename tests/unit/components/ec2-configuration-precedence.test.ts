import * as cdk from 'aws-cdk-lib';
import { 
  Ec2InstanceConfigBuilder,
  EC2_INSTANCE_CONFIG_SCHEMA,
  Ec2InstanceConfig 
} from '../../../src/components/ec2-instance/ec2-instance.component';
import { ComponentContext, ComponentSpec } from '../../../src/platform/contracts/component-interfaces';

describe('EC2 Configuration Precedence Chain', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let mockContext: ComponentContext;
  let baseSpec: ComponentSpec;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1'
      }
    });
    
    mockContext = {
      scope: stack,
      serviceName: 'test-service',
      environment: 'test',
      region: 'us-east-1',
      complianceFramework: 'commercial',
      serviceLabels: {
        version: '1.0.0'
      }
    };

    baseSpec = {
      name: 'test-instance',
      type: 'ec2-instance',
      config: {}
    };
  });

  describe('Layer 2: Segregated Platform Configuration', () => {
    it('should load commercial platform defaults', () => {
      const builder = new Ec2InstanceConfigBuilder(mockContext, baseSpec);
      const config = builder.buildSync();

      // These should come from /config/commercial.yml
      expect(config.instanceType).toBe('t3.micro');
      expect(config.storage?.rootVolumeSize).toBe(20);
      expect(config.storage?.rootVolumeType).toBe('gp3');
      expect(config.storage?.encrypted).toBe(false);
      expect(config.security?.requireImdsv2).toBe(false);
      expect(config.monitoring?.detailed).toBe(false);
    });

    it('should load FedRAMP Moderate platform defaults', () => {
      const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      const builder = new Ec2InstanceConfigBuilder(fedrampContext, baseSpec);
      const config = builder.buildSync();

      // These should come from /config/fedramp-moderate.yml  
      expect(config.instanceType).toBe('m5.large');
      expect(config.storage?.rootVolumeSize).toBe(50);
      expect(config.storage?.rootVolumeType).toBe('gp3');
      expect(config.storage?.encrypted).toBe(true);  // Different from commercial
      expect(config.security?.requireImdsv2).toBe(true);  // Different from commercial
      expect(config.monitoring?.detailed).toBe(true);  // Different from commercial
    });

    it('should load FedRAMP High platform defaults', () => {
      const fedrampHighContext = { ...mockContext, complianceFramework: 'fedramp-high' as 'fedramp-high' };
      const builder = new Ec2InstanceConfigBuilder(fedrampHighContext, baseSpec);
      const config = builder.buildSync();

      // These should come from /config/fedramp-high.yml
      expect(config.instanceType).toBe('m5.xlarge');
      expect(config.storage?.rootVolumeSize).toBe(100);
      expect(config.storage?.rootVolumeType).toBe('io2');  // Different from moderate  
      expect(config.storage?.encrypted).toBe(true);
      expect(config.security?.requireImdsv2).toBe(true);
      expect(config.security?.nitroEnclaves).toBe(true);  // Different from moderate
      expect(config.monitoring?.detailed).toBe(true);
    });
  });

  describe('Layer 4: Component-Level Overrides', () => {
    it('should override platform defaults with component config', () => {
      const specWithOverrides: ComponentSpec = {
        ...baseSpec,
        config: {
          instanceType: 'c5.large',  // Override platform default
          storage: {
            rootVolumeSize: 200,  // Override platform default
            encrypted: true  // Override commercial default (false)
          }
        }
      };

      const builder = new Ec2InstanceConfigBuilder(mockContext, specWithOverrides);
      const config = builder.buildSync();

      // Component overrides should win
      expect(config.instanceType).toBe('c5.large');  // Overridden
      expect(config.storage?.rootVolumeSize).toBe(200);  // Overridden
      expect(config.storage?.encrypted).toBe(true);  // Overridden

      // Non-overridden values should come from platform defaults
      expect(config.storage?.rootVolumeType).toBe('gp3');  // From commercial.yml
      expect(config.security?.requireImdsv2).toBe(false);  // From commercial.yml
    });

    it('should perform deep merge of nested objects', () => {
      const specWithPartialOverrides: ComponentSpec = {
        ...baseSpec,
        config: {
          storage: {
            rootVolumeSize: 300  // Only override volume size, not type or encryption
          },
          security: {
            requireImdsv2: true  // Only override this security setting
          }
        }
      };

      const builder = new Ec2InstanceConfigBuilder(mockContext, specWithPartialOverrides);
      const config = builder.buildSync();

      // Overridden nested values
      expect(config.storage?.rootVolumeSize).toBe(300);
      expect(config.security?.requireImdsv2).toBe(true);

      // Non-overridden nested values should remain from platform defaults
      expect(config.storage?.rootVolumeType).toBe('gp3');  // From commercial.yml
      expect(config.storage?.encrypted).toBe(false);  // From commercial.yml
      expect(config.security?.httpTokens).toBe('optional');  // From commercial.yml
    });
  });

  describe('Precedence Chain Integration', () => {
    it('should demonstrate full precedence: Component overrides beat Platform defaults', () => {
      // Use FedRAMP Moderate as platform base
      const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      
      // Component explicitly overrides some FedRAMP settings
      const specWithOverrides: ComponentSpec = {
        ...baseSpec,
        config: {
          instanceType: 't3.small',  // Smaller than FedRAMP default (m5.large)
          storage: {
            encrypted: false  // Override FedRAMP requirement (should be true)
          }
        }
      };

      const builder = new Ec2InstanceConfigBuilder(fedrampContext, specWithOverrides);
      const config = builder.buildSync();

      // Component overrides should win (Layer 4 beats Layer 2)
      expect(config.instanceType).toBe('t3.small');
      expect(config.storage?.encrypted).toBe(false);

      // Non-overridden values should come from FedRAMP platform defaults
      expect(config.storage?.rootVolumeSize).toBe(50);  // FedRAMP moderate default
      expect(config.security?.requireImdsv2).toBe(true);  // FedRAMP moderate default
      expect(config.monitoring?.detailed).toBe(true);  // FedRAMP moderate default
    });
  });

  describe('Error Handling', () => {
    it('should throw clear error for unknown compliance framework', () => {
      const badContext = { ...mockContext, complianceFramework: 'invalid-framework' as any };
      
      expect(() => {
        const builder = new Ec2InstanceConfigBuilder(badContext, baseSpec);
        builder.buildSync();
      }).toThrow(/unknown compliance framework/i);
    });
  });

  describe('Layer 1: Hardcoded Fallbacks', () => {
    it('should provide hardcoded fallbacks when platform config is missing', () => {
      // Simulate missing platform config by using invalid framework
      // The builder should fall back to hardcoded defaults
      
      // This test will be implemented once we refactor the ConfigBuilder
      // to properly separate hardcoded fallbacks from platform config
    });
  });
});
