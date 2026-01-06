/**
 * SecretsManagerComponent ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { SecretsManagerComponentConfigBuilder, SecretsManagerConfig } from '../secrets-manager.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock platform configuration loading to avoid requiring config files in tests
let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(SecretsManagerComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

afterEach(() => {
  platformConfigSpy?.mockRestore();
});

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => {
  const { App, Stack } = require('aws-cdk-lib');
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  
  return {
    serviceName: 'test-service',
    owner: 'test-team',
    environment,
    complianceFramework,
    region: 'us-east-1',
    accountId: '123456789012',
    scope: stack,
    serviceLabels: {
      'service-name': 'test-service',
      'owner': 'test-team',
      'environment': environment,
      'compliance-framework': complianceFramework
    },
    tags: {
      'service-name': 'test-service',
      'owner': 'test-team',
      'environment': environment,
      'compliance-framework': complianceFramework
    }
  };
};

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

    it.skip('applies FedRAMP Moderate defaults', () => {
      // Mock platform config to return highRiskEnvironment for FedRAMP Moderate
      // (In real usage, platform config files would set this flag)
      platformConfigSpy.mockReturnValue({ highRiskEnvironment: true });
      
      const builder = new SecretsManagerComponentConfigBuilder({
        context: createMockContext('fedramp-moderate'),
        spec: createMockSpec() // Flag comes from platform config, not spec
      });

      const config = builder.buildSync();

      expect(config.automaticRotation?.enabled).toBe(true);
      expect(config.automaticRotation?.schedule?.automaticallyAfterDays).toBe(90);
      expect(config.encryption?.createCustomerManagedKey).toBe(true);
      expect(config.accessPolicies?.restrictToVpce).toBe(true);
      expect(config.monitoring?.enabled).toBe(true);
    });

    it.skip('applies FedRAMP High defaults', () => {
      // Mock platform config to return highRiskEnvironment for FedRAMP High
      // (In real usage, platform config files would set this flag)
      platformConfigSpy.mockReturnValue({ highRiskEnvironment: true });
      
      const builder = new SecretsManagerComponentConfigBuilder({
        context: createMockContext('fedramp-high'),
        spec: createMockSpec({
          // Additional high-risk settings beyond moderate defaults
          // These override the defaults from getComplianceFrameworkDefaults()
          automaticRotation: {
            enabled: true,
            schedule: {
              automaticallyAfterDays: 30 // More frequent rotation for high-risk
            }
          },
          encryption: {
            createCustomerManagedKey: true,
            enableKeyRotation: true // Key rotation required for high-risk
          },
          recovery: {
            recoveryWindowInDays: 7 // Shorter recovery window for high-risk
          },
          accessPolicies: {
            restrictToVpce: true,
            requireTemporaryCredentials: true // Temporary credentials required for high-risk
          }
        })
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

  describe('Validation - SecretValue Conflicts', () => {
    it('should allow single secretValue option', () => {
      const builder = new SecretsManagerComponentConfigBuilder({
        context: createMockContext('commercial'),
        spec: createMockSpec({
          secretValue: {
            secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:existing-secret'
          }
        })
      });

      const config = builder.buildSync();
      expect(config.secretValue?.secretArn).toBeDefined();
    });

    it('should allow generateSecret with allowUnsafePlainText', () => {
      const builder = new SecretsManagerComponentConfigBuilder({
        context: createMockContext('commercial'),
        spec: createMockSpec({
          secretValue: {
            secretStringValue: 'non-sensitive-value',
            allowUnsafePlainText: true
          }
        })
      });

      const config = builder.buildSync();
      expect(config.secretValue?.secretStringValue).toBeDefined();
      expect(config.secretValue?.allowUnsafePlainText).toBe(true);
    });
  });
});
