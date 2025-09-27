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
   *   "capability": "FedRAMP overrides that weaken controls are rejected",
   *   "oracle": "trace",
   *   "invariants": ["FedRAMP requires KMS encryption"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP moderate context"],
   *   "inputs": { "shape": "Component config overriding encryption to AES256", "notes": "Should fail validation" },
   *   "risks": ["Non-compliant encryption"],
   *   "dependencies": [],
   *   "evidence": ["Thrown validation error"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationPrecedence__FedRAMPOverrides__RejectsWeakEncryption', () => {
    const builder = new S3BucketComponentConfigBuilder({
      context: createContext('fedramp-moderate'),
      spec: createSpec({ encryption: { type: 'AES256' } })
    });

    expect(() => builder.buildSync()).toThrow(/FedRAMP deployments require encryption\.type to be "KMS"/);
  });

  /*
   * Test Metadata: TP-S3-BUCKET-CONFIG-004
   * {
   *   "id": "TP-S3-BUCKET-CONFIG-004",
   *   "level": "unit",
   *   "capability": "FedRAMP overrides that disable audit logging are rejected",
   *   "oracle": "trace",
   *   "invariants": ["Access logging mandatory"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP high context"],
   *   "inputs": { "shape": "Component config disabling audit logging", "notes": "Should fail validation" },
   *   "risks": ["Missing access logs"],
   *   "dependencies": [],
   *   "evidence": ["Thrown validation error"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationPrecedence__FedRAMPOverrides__RejectsDisabledAuditLogging', () => {
    const builder = new S3BucketComponentConfigBuilder({
      context: createContext('fedramp-high'),
      spec: createSpec({ compliance: { auditLogging: false } })
    });

    expect(() => builder.buildSync()).toThrow(/FedRAMP deployments must enable compliance\.auditLogging/);
  });
});
