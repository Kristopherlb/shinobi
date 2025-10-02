import {
  CertificateManagerComponentConfigBuilder,
  CertificateManagerConfig
} from '../src/certificate-manager.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createContext = (
  framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'platform-team',
  environment,
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  scope: {} as any,
  tags: {
    'service-name': 'test-service',
    owner: 'platform-team',
    environment,
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<CertificateManagerConfig> = {}): ComponentSpec => ({
  name: 'cert-test',
  type: 'certificate-manager',
  config: {
    domainName: 'example.com',
    ...config
  }
});

describe('CertificateManagerComponentConfigBuilder', () => {
  it('builds commercial defaults from platform configuration', () => {
    const builder = new CertificateManagerComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.validation.method).toBe('DNS');
    expect(config.keyAlgorithm).toBe('RSA_2048');
    expect(config.logging.groups.length).toBeGreaterThan(0);
    expect(config.logging.groups[0].removalPolicy).toBe('retain');
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.expiration.enabled).toBe(true);
    expect(config.monitoring.status.enabled).toBe(true);
  });

  it('applies fedramp-moderate hardened defaults', () => {
    const builder = new CertificateManagerComponentConfigBuilder({
      context: createContext('fedramp-moderate', 'stage'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.keyAlgorithm).toBe('RSA_2048');
    expect(config.transparencyLoggingEnabled).toBe(true);
    expect(config.logging.groups.some(group => group.id === 'compliance')).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.expiration.enabled).toBe(true);
    expect(config.monitoring.status.enabled).toBe(true);
  });

  it('allows manifest overrides to replace defaults', () => {
    const builder = new CertificateManagerComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        keyAlgorithm: 'EC_prime256v1',
        validation: {
          method: 'EMAIL',
          validationEmails: ['admin@example.com']
        },
        logging: {
          groups: [
            {
              id: 'custom',
              enabled: true,
              retentionInDays: 30,
              removalPolicy: 'destroy'
            }
          ]
        },
        monitoring: {
          enabled: true,
          expiration: {
            enabled: false,
            thresholdDays: 7,
            periodHours: 12
          },
          status: {
            enabled: false,
            threshold: 0,
            periodMinutes: 5
          }
        }
      })
    });

    const config = builder.buildSync();

    expect(config.keyAlgorithm).toBe('EC_prime256v1');
    expect(config.validation.method).toBe('EMAIL');
    expect(config.validation.validationEmails).toEqual(['admin@example.com']);
    expect(config.logging.groups.map(group => group.id)).toEqual(['custom']);
    expect(config.monitoring.expiration.enabled).toBe(false);
    expect(config.monitoring.expiration.enabled).toBe(false);
    expect(config.monitoring.expiration.thresholdDays).toBe(7);
    expect(config.monitoring.status.enabled).toBe(false);
  });

  it('requires validation emails when email validation is selected', () => {
    const builder = new CertificateManagerComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        validation: {
          method: 'EMAIL'
        }
      })
    });

    expect(() => builder.buildSync()).toThrow('Email validation requires at least one validation email address.');
  });

  it('validates domain name format in configuration', () => {
    const builder = new CertificateManagerComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        domainName: 'invalid-domain'
      })
    });

    expect(() => builder.buildSync()).toThrow('Invalid domain name format: invalid-domain. Must be a valid FQDN.');
  });

  it('validates SAN domain name format', () => {
    const builder = new CertificateManagerComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        subjectAlternativeNames: ['invalid-san']
      })
    });

    expect(() => builder.buildSync()).toThrow('Invalid SAN domain format: invalid-san. Must be a valid FQDN.');
  });
});
