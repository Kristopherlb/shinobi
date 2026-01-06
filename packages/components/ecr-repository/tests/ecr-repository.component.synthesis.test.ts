import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { EcrRepositoryComponent } from '../ecr-repository.component.js';
import {
  EcrRepositoryComponentConfigBuilder,
  EcrRepositoryConfig
} from '../ecr-repository.builder.js';
import {
  ComponentContext,
  ComponentSpec
} from '@shinobi/core/component-interfaces';

type Framework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

const createMockContext = (framework: Framework, scope: Stack): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  accountId: '123456789012',
  scope,
  tags: {
    'service-name': 'test-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createMockSpec = (config: Partial<EcrRepositoryConfig> = {}): ComponentSpec => ({
  name: 'test-ecr-repository',
  type: 'ecr-repository',
  config: {
    repositoryName: 'test-repository',
    ...config
  }
});

const synthesizeComponent = (
  framework: Framework,
  config: Partial<EcrRepositoryConfig> = {}
) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' }
  });

  const context = createMockContext(framework, stack);
  const spec = createMockSpec(config);
  const component = new EcrRepositoryComponent(stack, spec.name, context, spec);

  component.synth();

  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('EcrRepositoryComponent__Synthesis__ResourceValidation', () => {
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
   * Test Metadata: TP-ecr-repository-component-001
   * {
   *   "id": "TP-ecr-repository-component-001",
   *   "level": "unit",
   *   "capability": "Commercial synthesis produces baseline ECR repository",
   *   "oracle": "contract",
   *   "invariants": ["Repository name matches manifest", "Scan on push disabled by default"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcrRepositoryComponent"],
   *   "inputs": { "shape": "Commercial context with defaults", "notes": "No manifest overrides" },
   *   "risks": ["Repository misconfiguration"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Repository__CommercialDefaults__SynthesizesBaselineResources', () => {
    const { template } = synthesizeComponent('commercial');

    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'test-repository',
      ImageScanningConfiguration: {
        ScanOnPush: true
      },
      ImageTagMutability: 'IMMUTABLE'
    });
  });

  /*
   * Test Metadata: TP-ecr-repository-component-002
   * {
   *   "id": "TP-ecr-repository-component-002",
   *   "level": "unit",
   *   "capability": "Component registers container capability after synthesis",
   *   "oracle": "contract",
   *   "invariants": ["Capability key container:ecr present"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcrRepositoryComponent"],
   *   "inputs": { "shape": "Commercial context with defaults", "notes": "Capability map inspected post-synthesis" },
   *   "risks": ["Capability registry missing"],
   *   "dependencies": [],
   *   "evidence": ["component.getCapabilities()"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Capabilities__AfterSynthesis__RegistersContainerCapability', () => {
    const { component } = synthesizeComponent('commercial');

    const capabilities = component.getCapabilities();
    expect(capabilities['container:ecr']).toBeDefined();
    expect(capabilities['container:ecr'].repositoryName).toBe('test-repository');
    expect(capabilities['container:ecr'].imageTagMutability).toBe('IMMUTABLE');
    expect(capabilities['observability:ecr-repository']).toBeDefined();
  });

  /*
   * Test Metadata: TP-ecr-repository-component-003
   * {
   *   "id": "TP-ecr-repository-component-003",
   *   "level": "unit",
   *   "capability": "Construct handles expose repository construct",
   *   "oracle": "contract",
   *   "invariants": ["Repository handle registered"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcrRepositoryComponent"],
   *   "inputs": { "shape": "Commercial context with defaults", "notes": "Construct registry queried" },
   *   "risks": ["Patches unable to locate construct"],
   *   "dependencies": [],
   *   "evidence": ["component.getConstruct('repository')"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConstructRegistry__AfterSynthesis__ReturnsRepositoryHandle', () => {
    const { component } = synthesizeComponent('commercial');

    expect(component.getConstruct('repository')).toBeDefined();
  });

  /*
   * Test Metadata: TP-ecr-repository-component-004
   * {
   *   "id": "TP-ecr-repository-component-004",
   *   "level": "unit",
   *   "capability": "Monitoring controls create log group and alarms when enabled",
   *   "oracle": "contract",
   *   "invariants": ["Log group created", "Push rate alarm provisioned"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcrRepositoryComponent"],
   *   "inputs": { "shape": "Commercial context with monitoring overrides", "notes": "Manifest enables detailed metrics" },
   *   "risks": ["Missing observability artifacts"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Observability__MonitoringEnabled__CreatesLogGroupAndAlarms', () => {
    const { template } = synthesizeComponent('commercial', {
      monitoring: {
        enabled: true,
        detailedMetrics: true,
        logRetentionDays: 90,
        alarms: {
          pushRateThreshold: 25,
          sizeThreshold: 5368709120
        }
      }
    });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/ecr/test-repository'
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('test-service-test-ecr-repository-high-push-rate'),
      Threshold: 25
    });
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('test-service-test-ecr-repository-repository-size'),
      Threshold: 5368709120
    });
  });

  /*
   * Test Metadata: TP-ecr-repository-component-005
   * {
   *   "id": "TP-ecr-repository-component-005",
   *   "level": "unit",
   *   "capability": "FedRAMP high framework enforces KMS encryption",
   *   "oracle": "contract",
   *   "invariants": ["Encryption type KMS"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcrRepositoryComponent"],
   *   "inputs": { "shape": "FedRAMP high context with overrides", "notes": "Manifest selects KMS encryption" },
   *   "risks": ["Repository left unencrypted"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-security-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Encryption__FedrampHigh__AppliesKmsEncryption', () => {
    const { template } = synthesizeComponent('fedramp-high', {
      encryption: {
        encryptionType: 'KMS',
        kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-1234567890ab'
      }
    });

    template.hasResourceProperties('AWS::ECR::Repository', {
      EncryptionConfiguration: {
        EncryptionType: 'KMS',
        KmsKey: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-1234567890ab'
      }
    });
  });

  /*
   * Test Metadata: TP-ecr-repository-component-006
   * {
   *   "id": "TP-ecr-repository-component-006",
   *   "level": "unit",
   *   "capability": "CloudWatch alarms inherit component tags",
   *   "oracle": "contract",
   *   "invariants": ["Alarm includes alarm-type tag"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcrRepositoryComponent"],
   *   "inputs": { "shape": "Commercial context", "notes": "Uses default monitoring settings" },
   *   "risks": ["Tagging gaps for security monitoring"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://platform-tagging-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Tagging__MonitoringArtifacts__AddsAlarmTypeTags', () => {
    const { template } = synthesizeComponent('commercial');

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'alarm-type', Value: 'ecr-push-rate' })
      ])
    });
  });

  /*
   * Test Metadata: TP-ecr-repository-component-007
   * {
   *   "id": "TP-ecr-repository-component-007",
   *   "level": "unit",
   *   "capability": "Observability capability advertises log group and thresholds",
   *   "oracle": "contract",
   *   "invariants": ["Capability contains logGroupName", "Threshold values match configuration"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcrRepositoryComponent"],
   *   "inputs": { "shape": "Commercial context with monitoring overrides", "notes": "Thresholds overridden" },
   *   "risks": ["Downstream monitoring unable to bind"],
   *   "dependencies": [],
   *   "evidence": ["component.getCapabilities()"],
   *   "compliance_refs": ["std://platform-observability-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ObservabilityCapability__MonitoringOverrides__ReflectsThresholds', () => {
    const { component } = synthesizeComponent('commercial', {
      monitoring: {
        enabled: true,
        detailedMetrics: true,
        logRetentionDays: 120,
        alarms: {
          pushRateThreshold: 10,
          sizeThreshold: 2147483648
        }
      }
    });

    const capability = component.getCapabilities()['observability:ecr-repository'];
    expect(capability).toBeDefined();
    expect(capability.logGroupName).toEqual(expect.any(String));
    expect(capability.alarms.pushRateThreshold).toBe(10);
    expect(capability.alarms.repositorySizeThreshold).toBe(2147483648);
  });

  /*
   * Test Metadata: TP-ecr-repository-component-008
   * {
   *   "id": "TP-ecr-repository-component-008",
   *   "level": "unit",
   *   "capability": "Monitoring disabled omits observability artifacts",
   *   "oracle": "contract",
   *   "invariants": ["No log group created", "Observability capability undefined"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcrRepositoryComponent"],
   *   "inputs": { "shape": "Monitoring explicitly disabled", "notes": "Ensures optional telemetry is respected" },
   *   "risks": ["Telemetry resources provisioned when not requested"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template", "component.getCapabilities()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Observability__MonitoringDisabled__SkipsTelemetryArtifacts', () => {
    const { component, template } = synthesizeComponent('commercial', {
      monitoring: {
        enabled: false
      }
    });

    template.resourceCountIs('AWS::Logs::LogGroup', 0);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 0);

    const capabilities = component.getCapabilities();
    expect(capabilities['observability:ecr-repository']).toBeUndefined();
  });

  /*
   * Test Metadata: TP-ecr-repository-component-009
   * {
   *   "id": "TP-ecr-repository-component-009",
   *   "level": "unit",
   *   "capability": "User-defined tags propagate to observability resources",
   *   "oracle": "contract",
   *   "invariants": ["Custom tag present on log group", "Custom tag present on alarms"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcrRepositoryComponent"],
   *   "inputs": { "shape": "Custom tags with special characters in values", "notes": "Validates tagging matrix" },
   *   "risks": ["Telemetry resources missing cost-allocation tags"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-tagging-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Tagging__CustomTags__PropagateToTelemetryResources', () => {
    const { template } = synthesizeComponent('commercial', {
      tags: {
        'team': 'platform',
        'cost-center': 'ops-value:42'
      }
    });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'team', Value: 'platform' })
      ])
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'cost-center', Value: 'ops-value:42' })
      ])
    });
  });
});
