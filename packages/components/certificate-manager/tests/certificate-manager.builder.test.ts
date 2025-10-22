import {
  CertificateManagerComponentConfigBuilder,
  CertificateManagerConfig
} from '../src/certificate-manager.builder.ts';
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
  /*
   * Test Metadata: TP-certificate-manager-config-builder-001
   * {
   *   "id": "TP-certificate-manager-config-builder-001",
   *   "level": "unit",
   *   "capability": "Commercial framework applies default validation, logging, and monitoring",
   *   "oracle": "exact",
   *   "invariants": ["DNS validation selected", "Monitoring alarms enabled"],
   *   "fixtures": ["Static component context", "Baseline manifest"],
   *   "inputs": { "shape": "Manifest with domain only", "notes": "No overrides" },
   *   "risks": ["Missing baseline monitoring"],
   *   "dependencies": [],
   *   "evidence": ["validation.method", "monitoring.expiration.enabled"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CommercialDefaults__PlatformBaseline__AppliesCommercialConfiguration', () => {
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

  /*
   * Test Metadata: TP-certificate-manager-config-builder-002
   * {
   *   "id": "TP-certificate-manager-config-builder-002",
   *   "level": "unit",
   *   "capability": "FedRAMP Moderate framework enables transparency logging and compliance log groups",
   *   "oracle": "exact",
   *   "invariants": ["Transparency logging enabled", "Compliance log group provisioned"],
   *   "fixtures": ["FedRAMP Moderate context", "Baseline manifest"],
   *   "inputs": { "shape": "Manifest with domain only", "notes": "Stage environment" },
   *   "risks": ["Audit logging disabled"],
   *   "dependencies": [],
   *   "evidence": ["transparencyLoggingEnabled", "logging.groups"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('FedrampModerateDefaults__PlatformBaseline__AppliesHardenedControls', () => {
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

  /*
   * Test Metadata: TP-certificate-manager-config-builder-003
   * {
   *   "id": "TP-certificate-manager-config-builder-003",
   *   "level": "unit",
   *   "capability": "Manifest overrides replace platform defaults for key algorithm, validation, logging, and monitoring",
   *   "oracle": "exact",
   *   "invariants": ["Key algorithm override honored", "Logging retention respects manifest"],
   *   "fixtures": ["Commercial context", "Manifest with overrides"],
   *   "inputs": { "shape": "Manifest overriding key algorithm, validation, logging, monitoring", "notes": "User hardened configuration" },
   *   "risks": ["Overrides ignored"],
   *   "dependencies": [],
   *   "evidence": ["keyAlgorithm", "monitoring.expiration.enabled"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ManifestOverrides__UserProvidedValues__OverridePlatformDefaults', () => {
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

  /*
   * Test Metadata: TP-certificate-manager-config-builder-004
   * {
   *   "id": "TP-certificate-manager-config-builder-004",
   *   "level": "unit",
   *   "capability": "Email validation requires at least one validation email",
   *   "oracle": "exact",
   *   "invariants": ["Email validation should enforce recipients"],
   *   "fixtures": ["Commercial context", "Manifest selecting email validation"],
   *   "inputs": { "shape": "Manifest with EMAIL validation and no recipients", "notes": "Negative validation" },
   *   "risks": ["Inoperable email validation"],
   *   "dependencies": [],
   *   "evidence": ["Thrown error message"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('EmailValidation__MissingAddresses__ThrowsValidationError', () => {
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

  /*
   * Test Metadata: TP-certificate-manager-config-builder-005
   * {
   *   "id": "TP-certificate-manager-config-builder-005",
   *   "level": "unit",
   *   "capability": "Domain name must be a valid FQDN",
   *   "oracle": "exact",
   *   "invariants": ["Invalid domain triggers error"],
   *   "fixtures": ["Commercial context", "Manifest with invalid domain"],
   *   "inputs": { "shape": "Manifest with invalid domainName", "notes": "Negative validation" },
   *   "risks": ["Certificates created for invalid domains"],
   *   "dependencies": [],
   *   "evidence": ["Thrown error message"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('DomainValidation__InvalidFqdn__ThrowsFormatError', () => {
    const builder = new CertificateManagerComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        domainName: 'invalid-domain'
      })
    });

    expect(() => builder.buildSync()).toThrow('Invalid domain name format: invalid-domain. Must be a valid FQDN.');
  });

  /*
   * Test Metadata: TP-certificate-manager-config-builder-006
   * {
   *   "id": "TP-certificate-manager-config-builder-006",
   *   "level": "unit",
   *   "capability": "Subject alternative names must be valid FQDNs",
   *   "oracle": "exact",
   *   "invariants": ["Invalid SAN triggers error"],
   *   "fixtures": ["Commercial context", "Manifest with invalid SAN"],
   *   "inputs": { "shape": "Manifest with invalid subjectAlternativeNames", "notes": "Negative validation" },
   *   "risks": ["SAN certificates issued to invalid hosts"],
   *   "dependencies": [],
   *   "evidence": ["Thrown error message"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('SanValidation__InvalidFqdn__ThrowsFormatError', () => {
    const builder = new CertificateManagerComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        subjectAlternativeNames: ['invalid-san']
      })
    });

    expect(() => builder.buildSync()).toThrow('Invalid SAN domain format: invalid-san. Must be a valid FQDN.');
  });
});
