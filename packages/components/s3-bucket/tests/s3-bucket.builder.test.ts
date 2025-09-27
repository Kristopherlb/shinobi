/**
 * S3 Bucket ConfigBuilder Tests
 * Validates configuration precedence against the Platform Configuration Standard.
 */

import { App, Stack } from 'aws-cdk-lib';
import {
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';
import {
  S3BucketComponentConfigBuilder,
  S3BucketConfig
} from '../s3-bucket.builder';

const createContext = (framework: ComponentContext['complianceFramework']): ComponentContext => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  return {
    serviceName: 'test-service',
    environment: 'dev',
    complianceFramework: framework,
    scope: stack,
    region: 'us-east-1',
    accountId: '123456789012'
  } as ComponentContext;
};

const createSpec = (config: Partial<S3BucketConfig> = {}): ComponentSpec => ({
  name: 'test-bucket',
  type: 's3-bucket',
  config
});

describe('S3BucketComponentConfigBuilder__ConfigurationPrecedence__PlatformDefaults', () => {
  /*
   * Test Metadata: TP-S3-BUCKET-CONFIG-001
   * {
   *   "id": "TP-S3-BUCKET-CONFIG-001",
   *   "level": "unit",
   *   "capability": "Configuration precedence applies commercial defaults",
   *   "oracle": "exact",
   *   "invariants": ["Commercial framework uses safe defaults"],
   *   "fixtures": ["ConfigBuilder", "Commercial framework context"],
   *   "inputs": { "shape": "Empty component configuration", "notes": "Relies on /config/commercial.yml" },
   *   "risks": [],
   *   "dependencies": ["config/commercial.yml"],
   *   "evidence": ["Merged configuration values"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationPrecedence__CommercialDefaults__UsesPlatformValues', () => {
    const builder = new S3BucketComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.versioning).toBe(true);
    expect(config.encryption?.type).toBe('AES256');
    expect(config.security?.tools?.clamavScan).toBe(false);
    expect(config.monitoring?.enabled).toBe(false);
  });

  /*
   * Test Metadata: TP-S3-BUCKET-CONFIG-002
   * {
   *   "id": "TP-S3-BUCKET-CONFIG-002",
   *   "level": "unit",
   *   "capability": "FedRAMP Moderate defaults override commercial baseline",
   *   "oracle": "exact",
   *   "invariants": ["FedRAMP defaults match platform config"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP moderate context"],
   *   "inputs": { "shape": "Empty component configuration", "notes": "Relies on /config/fedramp-moderate.yml" },
   *   "risks": [],
   *   "dependencies": ["config/fedramp-moderate.yml"],
   *   "evidence": ["Merged configuration values"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationPrecedence__FedRAMPModerate__AppliesComplianceDefaults', () => {
    const builder = new S3BucketComponentConfigBuilder({
      context: createContext('fedramp-moderate'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.versioning).toBe(true);
    expect(config.encryption?.type).toBe('KMS');
    expect(config.security?.requireMfaDelete).toBe(true);
    expect(config.monitoring?.enabled).toBe(true);
    expect(config.security?.tools?.clamavScan).toBe(false);
  });

  /*
   * Test Metadata: TP-S3-BUCKET-CONFIG-003
   * {
   *   "id": "TP-S3-BUCKET-CONFIG-003",
   *   "level": "unit",
   *   "capability": "FedRAMP overrides are honored by precedence chain",
   *   "oracle": "exact",
   *   "invariants": ["Manifest overrides win over framework defaults"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP moderate context"],
   *   "inputs": { "shape": "Component config overriding encryption to AES256", "notes": "Ensures override is respected" },
   *   "risks": ["Operator responsibility for compliance"],
   *   "dependencies": [],
   *   "evidence": ["Merged configuration values"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationPrecedence__FedRAMPOverrides__HonorsEncryptionOverride', () => {
    const builder = new S3BucketComponentConfigBuilder({
      context: createContext('fedramp-moderate'),
      spec: createSpec({ encryption: { type: 'AES256' } })
    });

    const config = builder.buildSync();

    expect(config.encryption?.type).toBe('AES256');
  });

  /*
   * Test Metadata: TP-S3-BUCKET-CONFIG-004
   * {
   *   "id": "TP-S3-BUCKET-CONFIG-004",
   *   "level": "unit",
   *   "capability": "FedRAMP overrides allow disabling audit logging when specified",
   *   "oracle": "exact",
   *   "invariants": ["Component manifest drives final setting"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP high context"],
   *   "inputs": { "shape": "Component config disabling audit logging", "notes": "Ensures override propagates" },
   *   "risks": ["Reduced logging visibility"],
   *   "dependencies": [],
   *   "evidence": ["Merged configuration values"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationPrecedence__FedRAMPOverrides__AllowsAuditLoggingOverride', () => {
    const builder = new S3BucketComponentConfigBuilder({
      context: createContext('fedramp-high'),
      spec: createSpec({ compliance: { auditLogging: false } })
    });

    const config = builder.buildSync();

    expect(config.compliance?.auditLogging).toBe(false);
  });
});
