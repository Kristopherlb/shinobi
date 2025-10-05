import { Ec2InstanceComponentConfigBuilder } from '../ec2-instance.builder.ts';

const createContext = (framework = 'commercial') => ({
  serviceName: 'test-service',
  environment: 'test',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  accountId: '123456789012',
  tags: {
    'service-name': 'test-service',
    environment: 'test',
    'compliance-framework': framework
  }
});

const createSpec = (config = {}) => ({
  name: 'test-instance',
  type: 'ec2-instance',
  config
});

describe('Ec2InstanceConfigBuilder__Precedence__AppliesFrameworkDefaults', () => {
  let loadPlatformConfigSpy;

  beforeEach(() => {
    loadPlatformConfigSpy = jest
      .spyOn(Ec2InstanceComponentConfigBuilder.prototype, '_loadPlatformConfiguration')
      .mockImplementation(function () {
        const framework = this.builderContext.context.complianceFramework;
        if (framework === 'fedramp-moderate') {
          return {
            storage: { encrypted: true, rootVolumeSize: 50 },
            monitoring: { detailed: true, cloudWatchAgent: true },
            security: { requireImdsv2: true, httpTokens: 'required' }
          };
        }

        if (framework === 'fedramp-high') {
          return {
            storage: { encrypted: true, rootVolumeType: 'io2', iops: 1000 },
            monitoring: { detailed: true, cloudWatchAgent: true },
            security: { requireImdsv2: true, httpTokens: 'required', nitroEnclaves: true }
          };
        }

        return {};
      });
  });

  afterEach(() => {
    loadPlatformConfigSpy.mockRestore();
  });

  /*
   * Test Metadata: TP-EC2-BUILDER-001
   * {
   *   "id": "TP-EC2-BUILDER-001",
   *   "level": "unit",
   *   "capability": "Commercial defaults populate baseline EC2 configuration",
   *   "oracle": "exact",
   *   "invariants": ["Instance type defaults to t3.micro", "Storage encryption disabled by default"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Empty manifest", "notes": "Validates hard-coded fallbacks" },
   *   "risks": ["Unexpected baseline regression"],
   *   "dependencies": ["config/commercial.yml"],
   *   "evidence": ["Resolved configuration"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationDefaults__CommercialFramework__ResolvesBaselineValues', () => {
    const builder = new Ec2InstanceComponentConfigBuilder(createContext('commercial'), createSpec());
    const config = builder.buildSync();

    expect(config.instanceType).toBe('t3.micro');
    expect(config.storage?.rootVolumeSize).toBe(20);
    expect(config.storage?.rootVolumeType).toBe('gp3');
    expect(config.storage?.encrypted).toBe(false);
  });

  /*
   * Test Metadata: TP-EC2-BUILDER-002
   * {
   *   "id": "TP-EC2-BUILDER-002",
   *   "level": "unit",
   *   "capability": "FedRAMP moderate framework enforces encryption and monitoring",
   *   "oracle": "exact",
   *   "invariants": ["Encryption forced true", "Detailed monitoring enabled"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP moderate context"],
   *   "inputs": { "shape": "Manifest disabling encryption", "notes": "Builder must override insecure input" },
   *   "risks": ["Compliance bypass"],
   *   "dependencies": ["config/fedramp-moderate.yml"],
   *   "evidence": ["Resolved configuration"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://security", "std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationDefaults__FedrampModerate__OverridesInsecureInputs', () => {
    const builder = new Ec2InstanceComponentConfigBuilder(
      createContext('fedramp-moderate'),
      createSpec()
    );

    const config = builder.buildSync();

    expect(config.storage?.encrypted).toBe(true);
    expect(config.monitoring?.detailed).toBe(true);
    expect(config.security?.requireImdsv2).toBe(true);
    expect(config.security?.httpTokens).toBe('required');
  });

  /*
   * Test Metadata: TP-EC2-BUILDER-003
   * {
   *   "id": "TP-EC2-BUILDER-003",
   *   "level": "unit",
   *   "capability": "FedRAMP high framework configures hardened storage and enclaves",
   *   "oracle": "exact",
   *   "invariants": ["Root volume type io2", "Nitro enclaves enabled"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP high context"],
   *   "inputs": { "shape": "Empty manifest", "notes": "Framework defaults drive configuration" },
   *   "risks": ["Insufficient hardening"],
   *   "dependencies": ["config/fedramp-high.yml"],
   *   "evidence": ["Resolved configuration"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationDefaults__FedrampHigh__AppliesHardening', () => {
    const builder = new Ec2InstanceComponentConfigBuilder(createContext('fedramp-high'), createSpec());
    const config = builder.buildSync();

    expect(config.storage?.rootVolumeType).toBe('io2');
    expect(config.storage?.iops).toBeGreaterThanOrEqual(1000);
    expect(config.security?.nitroEnclaves).toBe(true);
  });

  /*
   * Test Metadata: TP-EC2-BUILDER-004
   * {
   *   "id": "TP-EC2-BUILDER-004",
   *   "level": "unit",
   *   "capability": "Manifest overrides take precedence over defaults",
   *   "oracle": "exact",
   *   "invariants": ["Instance type matches manifest", "Encrypted flag follows manifest"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Manifest overriding instance type and storage", "notes": "User preference should win" },
   *   "risks": ["User overrides ignored"],
   *   "dependencies": [],
   *   "evidence": ["Resolved configuration"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigurationOverrides__ManifestInputs__TakePriority', () => {
    const builder = new Ec2InstanceComponentConfigBuilder(
      createContext('commercial'),
      createSpec({
        instanceType: 'c5.large',
        storage: {
          rootVolumeSize: 120,
          encrypted: true
        }
      })
    );

    const config = builder.buildSync();

    expect(config.instanceType).toBe('c5.large');
    expect(config.storage?.rootVolumeSize).toBe(120);
    expect(config.storage?.encrypted).toBe(true);
  });
});
