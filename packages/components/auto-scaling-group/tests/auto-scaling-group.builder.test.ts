import {
  AutoScalingGroupComponentConfigBuilder,
  AutoScalingGroupConfig
} from '../src/auto-scaling-group.builder.ts';
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

const createSpec = (config: Partial<AutoScalingGroupConfig> = {}): ComponentSpec => ({
  name: 'asg-test',
  type: 'auto-scaling-group',
  config
});

describe('AutoScalingGroupComponentConfigBuilder', () => {
  /*
   * Test Metadata: TP-auto-scaling-group-config-builder-001
   * {
   *   "id": "TP-auto-scaling-group-config-builder-001",
   *   "level": "unit",
   *   "capability": "Commercial framework applies baseline launch template and storage defaults",
   *   "oracle": "exact",
   *   "invariants": ["IMDSv2 required", "Storage encrypted"],
   *   "fixtures": ["Static component context", "Default manifest"],
   *   "inputs": { "shape": "Empty manifest", "notes": "No overrides provided" },
   *   "risks": ["Regressing baseline hardening"],
   *   "dependencies": [],
   *   "evidence": ["launchTemplate.instanceType", "storage.encrypted"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CommercialDefaults__PlatformBaseline__AppliesCommercialConfiguration', () => {
    const builder = new AutoScalingGroupComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.launchTemplate.instanceType).toBe('t3.micro');
    expect(config.launchTemplate.detailedMonitoring).toBe(false);
    expect(config.launchTemplate.requireImdsv2).toBe(true);
    expect(config.launchTemplate.installAgents.ssm).toBe(true);
    expect(config.launchTemplate.installAgents.cloudwatch).toBe(true);
    expect(config.vpc.subnetType).toBe('PUBLIC');
    expect(config.storage.encrypted).toBe(true);
    expect(config.security.managedPolicies).toHaveLength(0);
  });

  /*
   * Test Metadata: TP-auto-scaling-group-config-builder-002
   * {
   *   "id": "TP-auto-scaling-group-config-builder-002",
   *   "level": "unit",
   *   "capability": "FedRAMP Moderate framework enables hardened launch template and storage controls",
   *   "oracle": "exact",
   *   "invariants": ["Detailed monitoring enabled", "CMK with rotation required"],
   *   "fixtures": ["FedRAMP Moderate component context", "Default manifest"],
   *   "inputs": { "shape": "Empty manifest", "notes": "Stage environment with platform defaults" },
   *   "risks": ["Missing FedRAMP hardening"],
   *   "dependencies": [],
   *   "evidence": ["launchTemplate.detailedMonitoring", "storage.kms.enableKeyRotation"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('FedrampModerateDefaults__PlatformBaseline__AppliesHardenedControls', () => {
    const builder = new AutoScalingGroupComponentConfigBuilder({
      context: createContext('fedramp-moderate', 'stage'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.launchTemplate.instanceType).toBe('t3.medium');
    expect(config.launchTemplate.detailedMonitoring).toBe(true);
    expect(config.launchTemplate.requireImdsv2).toBe(true);
    expect(config.vpc.subnetType).toBe('PRIVATE_WITH_EGRESS');
    expect(config.storage.encrypted).toBe(true);
    expect(config.security.managedPolicies).toContain('AmazonSSMManagedInstanceCore');
    expect(config.storage.kms.useCustomerManagedKey).toBe(true);
    expect(config.storage.kms.enableKeyRotation).toBe(true);
  });

  /*
   * Test Metadata: TP-auto-scaling-group-config-builder-003
   * {
   *   "id": "TP-auto-scaling-group-config-builder-003",
   *   "level": "unit",
   *   "capability": "Manifest overrides take precedence over platform defaults",
   *   "oracle": "exact",
   *   "invariants": ["Instance type honors override", "KMS settings follow manifest"],
   *   "fixtures": ["Commercial component context", "Manifest with overrides"],
   *   "inputs": { "shape": "Manifest overriding launch template and storage", "notes": "User requested hardened agents" },
   *   "risks": ["Overrides ignored"],
   *   "dependencies": [],
   *   "evidence": ["launchTemplate.instanceType", "storage.kms.useCustomerManagedKey"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ManifestOverrides__UserProvidedValues__OverridePlatformDefaults', () => {
    const builder = new AutoScalingGroupComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        launchTemplate: {
          instanceType: 'm5.large',
          detailedMonitoring: true,
          requireImdsv2: true,
          installAgents: {
            ssm: true,
            cloudwatch: true,
            stigHardening: true
          }
        },
        storage: {
          rootVolumeSize: 200,
          rootVolumeType: 'io2',
          encrypted: true,
          kms: {
            useCustomerManagedKey: true,
            enableKeyRotation: true
          }
        }
      })
    });

    const config = builder.buildSync();

    expect(config.launchTemplate.instanceType).toBe('m5.large');
    expect(config.launchTemplate.installAgents.cloudwatch).toBe(true);
    expect(config.storage.rootVolumeSize).toBe(200);
    expect(config.storage.kms.useCustomerManagedKey).toBe(true);
  });
});
