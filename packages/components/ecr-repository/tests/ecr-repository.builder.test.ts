import { Stack } from 'aws-cdk-lib';
import {
  EcrRepositoryComponentConfigBuilder,
  EcrRepositoryConfig
} from '../ecr-repository.builder.ts';
import {
  ComponentContext,
  ComponentSpec
} from '@shinobi/core/component-interfaces';

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment = 'dev'
): ComponentContext => {
  const stack = new Stack();
  return {
    serviceName: 'test-service',
    environment,
    complianceFramework,
    region: 'us-east-1',
    accountId: '123456789012',
    scope: stack,
    tags: {
      'service-name': 'test-service',
      environment,
      'compliance-framework': complianceFramework
    }
  };
};

const createMockSpec = (config: Partial<EcrRepositoryConfig> = {}): ComponentSpec => ({
  name: 'test-ecr-repository',
  type: 'ecr-repository',
  config
});

describe('EcrRepositoryComponentConfigBuilder__Precedence__AppliesFrameworkDefaults', () => {
  let platformConfigSpy: jest.SpyInstance;

  beforeEach(() => {
    platformConfigSpy = jest
      .spyOn(EcrRepositoryComponentConfigBuilder.prototype, '_loadPlatformConfiguration')
      .mockImplementation(function (this: EcrRepositoryComponentConfigBuilder) {
        const framework = this.builderContext.context.complianceFramework;

        if (framework === 'fedramp-moderate') {
          return {
            imageScanningConfiguration: { scanOnPush: true },
            monitoring: { enabled: true, detailedMetrics: true },
            compliance: { retentionPolicy: 'destroy', auditLogging: true }
          };
        }

        if (framework === 'fedramp-high') {
          return {
            imageScanningConfiguration: { scanOnPush: true },
            encryption: { encryptionType: 'KMS', kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/mock' },
            monitoring: { enabled: true, detailedMetrics: true },
            compliance: { retentionPolicy: 'retain', auditLogging: true }
          };
        }

        return {
          monitoring: { enabled: true, detailedMetrics: false }
        };
      });
  });

  afterEach(() => {
    platformConfigSpy.mockRestore();
  });

  /*
   * Test Metadata: TP-ecr-repository-config-builder-001
   * {
   *   "id": "TP-ecr-repository-config-builder-001",
   *   "level": "unit",
   *   "capability": "Hardcoded fallbacks populate safe baseline ECR configuration",
   *   "oracle": "exact",
   *   "invariants": ["Scan on push defaults to false", "Lifecycle policy retains only 10 images"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Empty manifest", "notes": "No platform overrides returned" },
   *   "risks": ["Unexpected baseline regression"],
   *   "dependencies": [],
   *   "evidence": ["config.imageScanningConfiguration", "config.lifecyclePolicy"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('HardcodedFallbacks__MinimalConfig__AppliesSafeDefaults', () => {
    const context = createMockContext('commercial');
    const spec = createMockSpec();

    const builder = new EcrRepositoryComponentConfigBuilder({ context, spec });
    const config = builder.buildSync();

    expect(config.imageScanningConfiguration?.scanOnPush).toBe(false);
    expect(config.imageTagMutability).toBe('MUTABLE');
    expect(config.encryption?.encryptionType).toBe('AES256');
    expect(config.lifecyclePolicy?.maxImageCount).toBe(10);
    expect(config.monitoring?.enabled).toBe(true);
    expect(config.monitoring?.detailedMetrics).toBe(false);
    expect(config.compliance?.retentionPolicy).toBe('destroy');
  });

  /*
   * Test Metadata: TP-ecr-repository-config-builder-002
   * {
   *   "id": "TP-ecr-repository-config-builder-002",
   *   "level": "unit",
   *   "capability": "Commercial framework preserves baseline monitoring controls",
   *   "oracle": "exact",
   *   "invariants": ["Monitoring enabled", "Detailed metrics disabled"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Commercial framework context", "notes": "Platform config provides defaults" },
   *   "risks": ["Monitoring disabled inadvertently"],
   *   "dependencies": [],
   *   "evidence": ["config.monitoring"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ComplianceFrameworkDefaults__CommercialFramework__RetainsBaselineMonitoring', () => {
    const context = createMockContext('commercial');
    const spec = createMockSpec();

    const builder = new EcrRepositoryComponentConfigBuilder({ context, spec });
    const config = builder.buildSync();

    expect(config.monitoring?.enabled).toBe(true);
    expect(config.monitoring?.detailedMetrics).toBe(false);
  });

  /*
   * Test Metadata: TP-ecr-repository-config-builder-003
   * {
   *   "id": "TP-ecr-repository-config-builder-003",
   *   "level": "unit",
   *   "capability": "FedRAMP defaults enforce detailed monitoring and audit logging",
   *   "oracle": "exact",
   *   "invariants": ["Detailed metrics enabled", "Audit logging true"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP moderate context"],
   *   "inputs": { "shape": "FedRAMP moderate framework", "notes": "Platform defaults injected" },
   *   "risks": ["Compliance monitoring disabled"],
   *   "dependencies": [],
   *   "evidence": ["config.monitoring", "config.compliance"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ComplianceFrameworkDefaults__FedrampModerate__EnforcesMonitoringControls', () => {
    const context = createMockContext('fedramp-moderate');
    const spec = createMockSpec();

    const builder = new EcrRepositoryComponentConfigBuilder({ context, spec });
    const config = builder.buildSync();

    expect(config.monitoring?.enabled).toBe(true);
    expect(config.monitoring?.detailedMetrics).toBe(true);
    expect(config.compliance?.auditLogging).toBe(true);
  });

  /*
   * Test Metadata: TP-ecr-repository-config-builder-004
   * {
   *   "id": "TP-ecr-repository-config-builder-004",
   *   "level": "unit",
   *   "capability": "Component manifest overrides win over platform defaults",
   *   "oracle": "exact",
   *   "invariants": ["Monitoring enabled flag matches manifest", "Scan on push follows manifest"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Manifest disables monitoring and enables scan on push", "notes": "Component overrides present" },
   *   "risks": ["Overrides ignored"],
   *   "dependencies": [],
   *   "evidence": ["config.monitoring", "config.imageScanningConfiguration"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationPrecedence__ComponentOverrides__TrumpPlatformDefaults', () => {
    const context = createMockContext('commercial');
    const spec = createMockSpec({
      monitoring: {
        enabled: false,
        detailedMetrics: false
      },
      imageScanningConfiguration: {
        scanOnPush: true
      }
    });

    const builder = new EcrRepositoryComponentConfigBuilder({ context, spec });
    const config = builder.buildSync();

    expect(config.monitoring?.enabled).toBe(false);
    expect(config.monitoring?.detailedMetrics).toBe(false);
    expect(config.imageScanningConfiguration?.scanOnPush).toBe(true);
  });
});
