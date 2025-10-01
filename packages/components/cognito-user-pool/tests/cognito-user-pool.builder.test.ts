import {
  CognitoUserPoolComponentConfigBuilder,
  CognitoUserPoolConfig
} from '../cognito-user-pool.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';

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
});
