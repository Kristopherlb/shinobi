import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Ec2InstanceComponent } from '../ec2-instance.component.ts';
import { Ec2InstanceComponentConfigBuilder } from '../ec2-instance.builder.ts';
const createContext = (framework, scope) => ({
  serviceName: 'test-service',
  environment: 'test',
  complianceFramework: framework,
  scope,
  region: 'us-east-1',
  accountId: '123456789012'
});

const createSpec = (config = {}) => ({
  name: 'test-instance',
  type: 'ec2-instance',
  config
});

describe('Ec2InstanceComponent__Synthesis__ResourceValidation', () => {
  let app;
  let stack;
  let context;
  let loadPlatformConfigSpy;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    context = createContext('commercial', stack);
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

  const synthesize = (config = {}) => {
    const component = new Ec2InstanceComponent(stack, 'TestInstance', context, createSpec(config));
    component.synth();
    return Template.fromStack(stack);
  };

  /*
   * Test Metadata: TP-EC2-COMPONENT-001
   * {
   *   "id": "TP-EC2-COMPONENT-001",
   *   "level": "unit",
   *   "capability": "Commercial synthesis produces EC2 instance with baseline storage",
   *   "oracle": "contract",
   *   "invariants": ["InstanceType t3.micro", "Root volume gp3"],
   *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
   *   "inputs": { "shape": "Commercial context with defaults", "notes": "Validates base synthesis" },
   *   "risks": ["Instance misconfiguration"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Instance__CommercialDefaults__SynthesizesBaselineInstance', () => {
    const template = synthesize();

    template.hasResourceProperties('AWS::EC2::Instance', Match.objectLike({
      InstanceType: 't3.micro',
      BlockDeviceMappings: Match.arrayWith([
        Match.objectLike({
          DeviceName: '/dev/xvda',
          Ebs: Match.objectLike({
            VolumeType: 'gp3',
            DeleteOnTermination: true
          })
        })
      ])
    }));
  });

  /*
   * Test Metadata: TP-EC2-COMPONENT-002
   * {
   *   "id": "TP-EC2-COMPONENT-002",
   *   "level": "unit",
   *   "capability": "Commercial synthesis provisions security group for SSH access",
   *   "oracle": "contract",
   *   "invariants": ["Security group description references EC2 instance"],
   *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
   *   "inputs": { "shape": "Commercial context with defaults", "notes": "Validates networking resources" },
   *   "risks": ["Missing security group"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('SecurityGroup__CommercialDefaults__CreatesIngressResource', () => {
    const template = synthesize();

    template.hasResourceProperties('AWS::EC2::SecurityGroup', Match.objectLike({
      GroupDescription: Match.stringLikeRegexp('Security group for test-instance EC2 instance')
    }));
  });

  /*
   * Test Metadata: TP-EC2-COMPONENT-003
   * {
   *   "id": "TP-EC2-COMPONENT-003",
   *   "level": "unit",
   *   "capability": "FedRAMP moderate synthesis creates customer KMS key",
   *   "oracle": "contract",
   *   "invariants": ["KMS key description references instance"],
   *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
   *   "inputs": { "shape": "FedRAMP moderate context", "notes": "No manifest overrides" },
   *   "risks": ["Unencrypted storage"],
   *   "dependencies": ["config/fedramp-moderate.yml"],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Encryption__FedrampModerate__CreatesCustomerManagedKey', () => {
    context = createContext('fedramp-moderate', stack);
    const template = synthesize();

    template.hasResourceProperties('AWS::KMS::Key', Match.objectLike({
      Description: Match.stringLikeRegexp('EBS encryption key for test-instance EC2 instance')
    }));
  });

  /*
   * Test Metadata: TP-EC2-COMPONENT-004
   * {
   *   "id": "TP-EC2-COMPONENT-004",
   *   "level": "unit",
   *   "capability": "FedRAMP high synthesis enforces IMDSv2",
   *   "oracle": "contract",
   *   "invariants": ["HttpTokens required"],
   *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
   *   "inputs": { "shape": "FedRAMP high context", "notes": "Security metadata options should be forced" },
   *   "risks": ["Metadata downgrade"],
   *   "dependencies": ["config/fedramp-high.yml"],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Security__FedrampHigh__RequiresImdsv2', () => {
    context = createContext('fedramp-high', stack);
    const template = synthesize({
      security: {
        requireImdsv2: true,
        httpTokens: 'required'
      }
    });

    template.hasResourceProperties('AWS::EC2::LaunchTemplate', Match.objectLike({
      LaunchTemplateData: Match.objectLike({
        MetadataOptions: Match.objectLike({
          HttpTokens: 'required'
        })
      })
    }));
  });

  /*
   * Test Metadata: TP-EC2-COMPONENT-005
   * {
   *   "id": "TP-EC2-COMPONENT-005",
   *   "level": "unit",
   *   "capability": "Detailed monitoring disabled by default in commercial framework",
   *   "oracle": "contract",
   *   "invariants": ["Monitoring false"],
   *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
   *   "inputs": { "shape": "Commercial context with defaults", "notes": "Validates baseline observability" },
   *   "risks": ["Unexpected monitoring costs"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://observability"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Observability__CommercialDefaults__LeavesDetailedMonitoringDisabled', () => {
    const template = synthesize();

    template.hasResourceProperties('AWS::EC2::Instance', Match.objectLike({
      Monitoring: false
    }));
  });

  /*
   * Test Metadata: TP-EC2-COMPONENT-006
   * {
   *   "id": "TP-EC2-COMPONENT-006",
   *   "level": "unit",
   *   "capability": "CPU utilization alarm generated for each instance",
   *   "oracle": "contract",
   *   "invariants": ["Alarm name matches naming convention"],
   *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
   *   "inputs": { "shape": "FedRAMP moderate context", "notes": "Alarm thresholds enforced" },
   *   "risks": ["Missing critical alarm"],
   *   "dependencies": ["config/fedramp-moderate.yml"],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://observability"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Observability__CpuAlarm__CreatesThresholdAlarm', () => {
    context = createContext('fedramp-moderate', stack);
    const template = synthesize();

    template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
      AlarmName: 'test-service-test-instance-cpu-high',
      MetricName: 'CPUUtilization'
    }));
  });
});
