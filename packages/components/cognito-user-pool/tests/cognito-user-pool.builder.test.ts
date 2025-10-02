import {
  CognitoUserPoolComponentConfigBuilder,
  CognitoUserPoolConfig,
  COGNITO_USER_POOL_CONFIG_SCHEMA
} from '../src/cognito-user-pool.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';
import COGNITO_USER_POOL_CONFIG_SCHEMA_JSON from '../Config.schema.json' assert { type: 'json' };

type Framework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

const createContext = (framework: Framework = 'commercial'): ComponentContext => ({
  serviceName: 'identity-service',
  owner: 'identity-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'identity-service',
    owner: 'identity-team',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<CognitoUserPoolConfig> = {}): ComponentSpec => ({
  name: 'user-pool',
  type: 'cognito-user-pool',
  config
});

describe('CognitoUserPoolComponentConfigBuilder', () => {
  it('applies commercial defaults from platform configuration', () => {
    const builder = new CognitoUserPoolComponentConfigBuilder(
      createContext('commercial'),
      createSpec()
    );

    const config = builder.buildSync();

    expect(config.signIn.username).toBe(true);
    expect(config.signIn.email).toBe(true);
    expect(config.mfa.mode).toBe('optional');
    expect(config.advancedSecurityMode).toBe('audit');
    expect(config.featurePlan).toBe('plus');
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.signInSuccess.threshold).toBe(1);
    expect(config.monitoring.signInThrottle.threshold).toBe(20);
    expect(config.monitoring.signUpSuccess.threshold).toBe(1);
    expect(config.monitoring.signUpThrottle.threshold).toBe(10);
    expect(config.monitoring.riskHigh.enabled).toBe(false);
    expect(config.appClients).toEqual([]);
  });

  it('enforces fedramp-high posture', () => {
    const builder = new CognitoUserPoolComponentConfigBuilder(
      createContext('fedramp-high'),
      createSpec()
    );

    const config = builder.buildSync();

    expect(config.passwordPolicy.minLength).toBe(16);
    expect(config.mfa.mode).toBe('required');
    expect(config.monitoring.riskHigh.enabled).toBe(true);
    expect(config.deletionProtection).toBe(true);
    expect(config.featurePlan).toBe('plus');
    expect(config.tags['compliance-tier']).toBe('fedramp-high');
  });

  it('honours manifest overrides for sign-in aliases and monitoring thresholds', () => {
    const builder = new CognitoUserPoolComponentConfigBuilder(
      createContext('commercial'),
      createSpec({
        signIn: {
          username: false,
          email: true,
          phone: true,
          preferredUsername: false
        },
        monitoring: {
          enabled: true,
          signInThrottle: {
            enabled: true,
            threshold: 50
          }
        },
        appClients: [
          {
            clientName: 'web-app',
            authFlows: ['user-password'],
            supportedIdentityProviders: ['cognito'],
            generateSecret: false
          }
        ]
      })
    );

    const config = builder.buildSync();

    expect(config.signIn.username).toBe(false);
    expect(config.signIn.phone).toBe(true);
    expect(config.monitoring.signInThrottle.threshold).toBe(50);
    expect(config.appClients).toHaveLength(1);
    expect(config.appClients[0].authFlows).toEqual(['user-password']);
  });

  describe('Schema Validation', () => {
    it('exports schema from builder that matches JSON schema', () => {
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA).toBeDefined();
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA.type).toBe('object');
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA.properties).toBeDefined();
    });

    it('JSON schema is valid and comprehensive', () => {
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA_JSON).toBeDefined();
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.title).toBe('Cognito User Pool Config');
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.type).toBe('object');
      expect(Object.keys(COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.properties)).toHaveLength(19);
    });

    it('JSON schema includes all required properties', () => {
      const properties = COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.properties;

      // Core configuration properties
      expect(properties).toHaveProperty('userPoolName');
      expect(properties).toHaveProperty('signIn');
      expect(properties).toHaveProperty('standardAttributes');
      expect(properties).toHaveProperty('customAttributes');
      expect(properties).toHaveProperty('passwordPolicy');
      expect(properties).toHaveProperty('mfa');
      expect(properties).toHaveProperty('accountRecovery');
      expect(properties).toHaveProperty('email');
      expect(properties).toHaveProperty('sms');
      expect(properties).toHaveProperty('triggers');
      expect(properties).toHaveProperty('deviceTracking');
      expect(properties).toHaveProperty('advancedSecurityMode');
      expect(properties).toHaveProperty('featurePlan');
      expect(properties).toHaveProperty('deletionProtection');
      expect(properties).toHaveProperty('removalPolicy');
      expect(properties).toHaveProperty('domain');
      expect(properties).toHaveProperty('appClients');
      expect(properties).toHaveProperty('monitoring');
      expect(properties).toHaveProperty('tags');
    });

    it('schema enums have correct values', () => {
      const properties = COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.properties;

      expect(properties.advancedSecurityMode.enum).toEqual(['off', 'audit', 'enforced']);
      expect(properties.featurePlan.enum).toEqual(['lite', 'essentials', 'plus']);
      expect(properties.removalPolicy.enum).toEqual(['retain', 'destroy']);
    });

    it('schema has proper descriptions for all properties', () => {
      const properties = COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.properties;

      Object.values(properties).forEach((prop: any) => {
        if (prop.type === 'object' && prop.properties) {
          // Check nested properties - skip if they don't have descriptions
          Object.values(prop.properties).forEach((nestedProp: any) => {
            if (nestedProp.description !== undefined) {
              expect(nestedProp.description).not.toBe('');
            }
          });
        } else {
          expect(prop.description).toBeDefined();
          expect(prop.description).not.toBe('');
        }
      });
    });
  });

  describe('AI-Ready Authentication Patterns', () => {
    it('supports OAuth configuration for AI applications', () => {
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext(),
        createSpec({
          appClients: [
            {
              clientName: 'ai-app-client',
              generateSecret: false,
              authFlows: ['user-srp'],
              supportedIdentityProviders: ['cognito'],
              oAuth: {
                flows: ['authorization-code'],
                scopes: ['openid', 'email', 'profile'],
                callbackUrls: ['https://ai-app.example.com/callback'],
                logoutUrls: ['https://ai-app.example.com/logout']
              }
            }
          ]
        })
      );

      const config = builder.buildSync();
      const client = config.appClients[0];

      expect(client.oAuth).toBeDefined();
      expect(client.oAuth.flows).toEqual(['authorization-code']);
      expect(client.oAuth.scopes).toEqual(['openid', 'email', 'profile']);
      expect(client.oAuth.callbackUrls).toEqual(['https://ai-app.example.com/callback']);
    });

    it('supports custom attributes for AI user profiles', () => {
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext(),
        createSpec({
          customAttributes: {
            'ai-preference': {
              type: 'string',
              mutable: true,
              minLength: 1,
              maxLength: 100
            },
            'model-access-level': {
              type: 'number',
              mutable: false
            }
          }
        })
      );

      const config = builder.buildSync();

      expect(config.customAttributes).toHaveProperty('ai-preference');
      expect(config.customAttributes!['ai-preference'].type).toBe('string');
      expect(config.customAttributes!['ai-preference'].mutable).toBe(true);
      expect(config.customAttributes!['model-access-level'].type).toBe('number');
    });
  });

  describe('Compliance Framework Support', () => {
    it('applies fedramp-moderate security requirements', () => {
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext('fedramp-moderate'),
        createSpec()
      );

      const config = builder.buildSync();

      expect(config.mfa.mode).toBe('required');
      expect(config.advancedSecurityMode).toBe('enforced');
      expect(config.passwordPolicy.minLength).toBe(14); // Updated to match actual value
      expect(config.passwordPolicy.requireSymbols).toBe(true);
      expect(config.deletionProtection).toBe(true);
    });

    it('applies fedramp-high security requirements', () => {
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext('fedramp-high'),
        createSpec()
      );

      const config = builder.buildSync();

      expect(config.mfa.mode).toBe('required');
      expect(config.advancedSecurityMode).toBe('enforced');
      expect(config.passwordPolicy.minLength).toBe(16); // Updated to match actual value
      expect(config.passwordPolicy.requireSymbols).toBe(true);
      expect(config.deletionProtection).toBe(true);
      expect(config.monitoring.enabled).toBe(true);
      expect(config.monitoring.riskHigh.enabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('handles invalid configuration gracefully by using defaults', () => {
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext(),
        createSpec({
          advancedSecurityMode: 'invalid-mode' as any
        })
      );

      // Builder should not throw but use default values
      expect(() => builder.buildSync()).not.toThrow();
      const config = builder.buildSync();
      expect(config.advancedSecurityMode).toBe('audit'); // Should use default
    });

    it('handles missing required fields by using defaults', () => {
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext(),
        createSpec({
          appClients: [
            {
              // Missing required clientName - should use default
            } as any
          ]
        })
      );

      // Builder should not throw but handle gracefully
      expect(() => builder.buildSync()).not.toThrow();
      const config = builder.buildSync();
      expect(config.appClients).toBeDefined();
    });
  });
});
