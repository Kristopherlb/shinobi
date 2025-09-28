/**
 * SecretsManagerComponent ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { SecretsManagerComponentConfigBuilder, SecretsManagerConfig } from '../secrets-manager.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

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

const createMockSpec = (config: Partial<SecretsManagerConfig> = {}): ComponentSpec => ({
  name: 'test-secrets-manager',
  type: 'secrets-manager',
  config
});

describe('SecretsManagerComponentConfigBuilder', () => {
  describe('Compliance defaults', () => {
    it('applies commercial defaults without compliance hardening', () => {
      const builder = new SecretsManagerComponentConfigBuilder({
        context: createMockContext('commercial'),
        spec: createMockSpec()
      });

      const config = builder.buildSync();

      expect(config.monitoring?.enabled).toBe(false);
      expect(config.encryption?.createCustomerManagedKey).toBe(false);
      expect(config.accessPolicies?.restrictToVpce).toBe(false);
    });

    it('applies FedRAMP Moderate defaults', () => {
      const builder = new SecretsManagerComponentConfigBuilder({
        context: createMockContext('fedramp-moderate'),
        spec: createMockSpec()
      });

      const config = builder.buildSync();

      expect(config.automaticRotation?.enabled).toBe(true);
      expect(config.automaticRotation?.schedule?.automaticallyAfterDays).toBe(90);
      expect(config.encryption?.createCustomerManagedKey).toBe(true);
      expect(config.accessPolicies?.restrictToVpce).toBe(true);
      expect(config.monitoring?.enabled).toBe(true);
    });

    it('applies FedRAMP High defaults', () => {
      const builder = new SecretsManagerComponentConfigBuilder({
        context: createMockContext('fedramp-high'),
        spec: createMockSpec()
      });

      const config = builder.buildSync();

      expect(config.automaticRotation?.schedule?.automaticallyAfterDays).toBe(30);
      expect(config.encryption?.enableKeyRotation).toBe(true);
      expect(config.recovery?.recoveryWindowInDays).toBe(7);
      expect(config.accessPolicies?.requireTemporaryCredentials).toBe(true);
    });
  });

  describe('Precedence chain', () => {
    it('honours component overrides of compliance defaults', () => {
      const builder = new SecretsManagerComponentConfigBuilder({
        context: createMockContext('fedramp-high'),
        spec: createMockSpec({
          encryption: {
            createCustomerManagedKey: false,
            enableKeyRotation: false
          },
          automaticRotation: {
            enabled: false
          }
        })
      });

      const config = builder.buildSync();

      expect(config.encryption?.createCustomerManagedKey).toBe(false);
      expect(config.encryption?.enableKeyRotation).toBe(false);
      expect(config.automaticRotation?.enabled).toBe(false);
    });
  });
});
