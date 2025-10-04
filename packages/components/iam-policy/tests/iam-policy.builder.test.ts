/**
 * IamPolicyComponent ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { IamPolicyComponentConfigBuilder, IamPolicyConfig } from '../iam-policy.builder.ts';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.ts';

const createMockContext = (
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'test-service',
    'owner': 'test-team',
    'environment': environment,
    'compliance-framework': complianceFramework
  }
});

const createMockSpec = (config: Partial<IamPolicyConfig> = {}): ComponentSpec => ({
  name: 'test-iam-policy',
  type: 'iam-policy',
  config
});

describe('IamPolicyComponentConfigBuilder', () => {
  describe('Commercial defaults', () => {
    it('loads platform defaults for commercial environments', () => {
      const builder = new IamPolicyComponentConfigBuilder(createMockContext('commercial'), createMockSpec());
      const config = builder.buildSync();

      expect(config.monitoring?.enabled).toBe(false);
      expect(config.logging?.usage?.enabled).toBe(true);
      expect(config.controls?.denyInsecureTransport).toBe(false);
    });
  });

  describe('FedRAMP defaults', () => {
    it('applies FedRAMP Moderate logging and controls', () => {
      const builder = new IamPolicyComponentConfigBuilder(createMockContext('fedramp-moderate'), createMockSpec());
      const config = builder.buildSync();

      expect(config.controls?.denyInsecureTransport).toBe(true);
      expect(config.logging?.compliance?.enabled).toBe(true);
      expect(config.monitoring?.usageAlarm?.enabled).toBe(true);
      expect(config.monitoring?.usageAlarm?.threshold).toBe(1000);
    });

    it('applies FedRAMP High controls requiring MFA', () => {
      const builder = new IamPolicyComponentConfigBuilder(createMockContext('fedramp-high'), createMockSpec());
      const config = builder.buildSync();

      expect(config.controls?.denyInsecureTransport).toBe(true);
      expect(config.controls?.requireMfaForActions).toContain('iam:*');
      expect(config.logging?.audit?.enabled).toBe(true);
      expect(config.logging?.audit?.retentionInDays).toBe(3653);
    });
  });

  describe('Configuration overrides', () => {
    it('honours component overrides over platform defaults', () => {
      const spec = createMockSpec({
        controls: {
          denyInsecureTransport: false,
          requireMfaForActions: []
        },
        monitoring: {
          enabled: false,
          detailedMetrics: false,
          usageAlarm: {
            enabled: false
          }
        },
        logging: {
          usage: {
            enabled: false
          }
        }
      });

      const builder = new IamPolicyComponentConfigBuilder(createMockContext('fedramp-high'), spec);
      const config = builder.buildSync();

      expect(config.controls?.denyInsecureTransport).toBe(false);
      expect(config.monitoring?.enabled).toBe(false);
      expect(config.logging?.usage?.enabled).toBe(false);
    });
  });
});
