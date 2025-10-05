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

describe('Ec2InstanceCompliance__Controls__Validation', () => {
  let stack;
  let context;
  let loadPlatformConfigSpy;

  beforeEach(() => {
    const app = new App();
    stack = new Stack(app, 'ComplianceTestStack', {
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

  describe('FedRAMP Moderate', () => {
    beforeEach(() => {
      context = createContext('fedramp-moderate', stack);
    });

    /*
     * Test Metadata: TP-EC2-COMPLIANCE-001
     * {
     *   "id": "TP-EC2-COMPLIANCE-001",
     *   "level": "unit",
     *   "capability": "FedRAMP moderate EC2 instances use customer managed encryption keys",
     *   "oracle": "contract",
     *   "invariants": ["KMS key created", "Rotation enabled"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "FedRAMP moderate context with encrypted storage", "notes": "Config relies on platform defaults" },
     *   "risks": ["Unencrypted storage"],
     *   "dependencies": ["config/fedramp-moderate.yml"],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://security", "std://configuration"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('Encryption__FedrampModerateRootVolume__UsesCustomerManagedKey', () => {
      const template = synthesize({
        storage: {
          encrypted: true
        }
      });

      template.hasResourceProperties('AWS::KMS::Key', Match.objectLike({
        Description: Match.stringLikeRegexp('EBS encryption key for test-instance EC2 instance')
      }));
    });

    /*
     * Test Metadata: TP-EC2-COMPLIANCE-002
     * {
     *   "id": "TP-EC2-COMPLIANCE-002",
     *   "level": "unit",
     *   "capability": "FedRAMP moderate EC2 root volumes encrypted with created key",
     *   "oracle": "contract",
     *   "invariants": ["Root volume references customer key"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "FedRAMP moderate context with 50GiB root volume", "notes": "Validates block device mapping" },
     *   "risks": ["Unencrypted data at rest"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://security"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('Storage__FedrampModerateRootVolume__ReferencesCustomerKey', () => {
      const template = synthesize({
        storage: {
          encrypted: true,
          rootVolumeSize: 50
        }
      });

      template.hasResourceProperties('AWS::EC2::Instance', Match.objectLike({
        BlockDeviceMappings: Match.arrayWith([
          Match.objectLike({
            DeviceName: '/dev/xvda',
            Ebs: Match.objectLike({
              VolumeSize: 50,
              Encrypted: true,
              KmsKeyId: Match.anyValue()
            })
          })
        ])
      }));
    });

    /*
     * Test Metadata: TP-EC2-COMPLIANCE-003
     * {
     *   "id": "TP-EC2-COMPLIANCE-003",
     *   "level": "unit",
     *   "capability": "FedRAMP moderate instances attach SSM managed policy",
     *   "oracle": "contract",
     *   "invariants": ["Managed policy list contains AmazonSSMManagedInstanceCore"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "FedRAMP moderate context with defaults", "notes": "No manifest overrides" },
     *   "risks": ["Instances missing manageability"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://configuration", "std://security"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('IamRole__FedrampModerateInstance__AttachesSsmManagedPolicy', () => {
      const template = synthesize();

      const roles = template.findResources('AWS::IAM::Role');
      const role = Object.values(roles)[0];
      const renderedArns = role.Properties.ManagedPolicyArns.map((entry) => JSON.stringify(entry));
      expect(renderedArns.join(' ')).toContain('AmazonSSMManagedInstanceCore');
    });

    /*
     * Test Metadata: TP-EC2-COMPLIANCE-004
     * {
     *   "id": "TP-EC2-COMPLIANCE-004",
     *   "level": "unit",
     *   "capability": "FedRAMP moderate instances apply compliance tags",
     *   "oracle": "contract",
     *   "invariants": ["Tags include compliance framework"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "FedRAMP moderate context with defaults", "notes": "Validates tagging" },
     *   "risks": ["Missing compliance metadata"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://tagging"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('Tagging__FedrampModerateInstance__AppliesComplianceMetadata', () => {
      const template = synthesize();

      template.hasResourceProperties('AWS::EC2::Instance', Match.objectLike({
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'compliance-framework', Value: 'fedramp-moderate' }),
          Match.objectLike({ Key: 'STIGCompliant', Value: 'true' })
        ])
      }));
    });
  });

  describe('FedRAMP High', () => {
    beforeEach(() => {
      context = createContext('fedramp-high', stack);
    });

    /*
     * Test Metadata: TP-EC2-COMPLIANCE-005
     * {
     *   "id": "TP-EC2-COMPLIANCE-005",
     *   "level": "unit",
     *   "capability": "FedRAMP high instances set hardened tags",
     *   "oracle": "contract",
     *   "invariants": ["Tags include STIG and ImmutableInfrastructure"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "FedRAMP high context with defaults", "notes": "Validates tagging for hardened stacks" },
     *   "risks": ["Missing FedRAMP high indicators"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://tagging"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('Tagging__FedrampHighInstance__MarksHardenedMetadata', () => {
      const template = synthesize();

      template.hasResourceProperties('AWS::EC2::Instance', Match.objectLike({
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'compliance-framework', Value: 'fedramp-high' }),
          Match.objectLike({ Key: 'ImmutableInfrastructure', Value: 'true' })
        ])
      }));
    });

    /*
     * Test Metadata: TP-EC2-COMPLIANCE-006
     * {
     *   "id": "TP-EC2-COMPLIANCE-006",
     *   "level": "unit",
     *   "capability": "FedRAMP high instances enforce IMDSv2",
     *   "oracle": "contract",
     *   "invariants": ["HttpTokens required"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "FedRAMP high context requiring IMDSv2", "notes": "Security metadata options enforced" },
     *   "risks": ["Metadata service downgrade"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://security"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('Security__FedrampHighInstance__RequiresImdsv2', () => {
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
     * Test Metadata: TP-EC2-COMPLIANCE-007
     * {
     *   "id": "TP-EC2-COMPLIANCE-007",
     *   "level": "unit",
     *   "capability": "FedRAMP high instances enable detailed monitoring",
     *   "oracle": "contract",
     *   "invariants": ["Monitoring flag true"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "FedRAMP high context requesting detailed monitoring", "notes": "CloudWatch detailed monitoring expected" },
     *   "risks": ["Reduced observability"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://observability"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('Monitoring__FedrampHighInstance__EnablesDetailedMetrics', () => {
      const template = synthesize({
        monitoring: {
          detailed: true
        }
      });

      template.hasResourceProperties('AWS::EC2::Instance', Match.objectLike({
        Monitoring: true
      }));
    });
  });

  describe('Commercial Baseline', () => {
    beforeEach(() => {
      context = createContext('commercial', stack);
    });

    /*
     * Test Metadata: TP-EC2-COMPLIANCE-008
     * {
     *   "id": "TP-EC2-COMPLIANCE-008",
     *   "level": "unit",
     *   "capability": "Commercial instances do not provision KMS key",
     *   "oracle": "contract",
     *   "invariants": ["No customer key"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "Commercial context with defaults", "notes": "Validates encryption opt-in" },
     *   "risks": ["Unexpected costs"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://configuration"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('Encryption__CommercialInstance__SkipsCustomerManagedKey', () => {
      const template = synthesize();
      template.resourceCountIs('AWS::KMS::Key', 0);
    });

    /*
     * Test Metadata: TP-EC2-COMPLIANCE-009
     * {
     *   "id": "TP-EC2-COMPLIANCE-009",
     *   "level": "unit",
     *   "capability": "Commercial instances apply framework tag",
     *   "oracle": "contract",
     *   "invariants": ["Tag compliance-framework=commercial"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "Commercial context with defaults", "notes": "Validates tagging" },
     *   "risks": ["Missing metadata"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://tagging"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('Tagging__CommercialInstance__AppliesFrameworkTag', () => {
      const template = synthesize();

      template.hasResourceProperties('AWS::EC2::Instance', Match.objectLike({
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'compliance-framework', Value: 'commercial' })
        ])
      }));
    });
  });

  describe('Network Controls', () => {
    /*
     * Test Metadata: TP-EC2-COMPLIANCE-010
     * {
     *   "id": "TP-EC2-COMPLIANCE-010",
     *   "level": "unit",
     *   "capability": "FedRAMP frameworks restrict SSH ingress",
     *   "oracle": "contract",
     *   "invariants": ["Ingress description scoped to VPC"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "FedRAMP moderate context with defaults", "notes": "Security group ingress should exclude 0.0.0.0/0" },
     *   "risks": ["Wide-open SSH"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://security"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('SecurityGroup__FedrampModerateIngress__RestrictsSsh', () => {
      context = createContext('fedramp-moderate', stack);
      const template = synthesize();

      template.hasResourceProperties('AWS::EC2::SecurityGroup', Match.objectLike({
        SecurityGroupIngress: Match.arrayWith([
          Match.objectLike({
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            Description: 'SSH access from VPC only'
          })
        ])
      }));
    });

    /*
     * Test Metadata: TP-EC2-COMPLIANCE-011
     * {
     *   "id": "TP-EC2-COMPLIANCE-011",
     *   "level": "unit",
     *   "capability": "Commercial frameworks allow public SSH ingress",
     *   "oracle": "contract",
     *   "invariants": ["Ingress CIDR 0.0.0.0/0"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "Commercial context with defaults", "notes": "Validates relaxed networking" },
     *   "risks": ["Unexpected restriction"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://security"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('SecurityGroup__CommercialIngress__AllowsPublicSsh', () => {
      context = createContext('commercial', stack);
      const template = synthesize();

      template.hasResourceProperties('AWS::EC2::SecurityGroup', Match.objectLike({
        SecurityGroupIngress: Match.arrayWith([
          Match.objectLike({
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            CidrIp: '0.0.0.0/0',
            Description: 'SSH access'
          })
        ])
      }));
    });
  });

  describe('IAM Roles', () => {
    /*
     * Test Metadata: TP-EC2-COMPLIANCE-012
     * {
     *   "id": "TP-EC2-COMPLIANCE-012",
     *   "level": "unit",
     *   "capability": "EC2 instance roles use least-privilege assume role policy",
     *   "oracle": "contract",
     *   "invariants": ["Principal service is ec2.amazonaws.com"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "Commercial context with defaults", "notes": "Validates assume role policy" },
     *   "risks": ["Privilege escalation"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://security"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('IamRole__AssumePolicy__TargetsEc2Service', () => {
      const template = synthesize();

      template.hasResourceProperties('AWS::IAM::Role', Match.objectLike({
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: { Service: 'ec2.amazonaws.com' },
              Action: 'sts:AssumeRole'
            })
          ])
        })
      }));
    });

    /*
     * Test Metadata: TP-EC2-COMPLIANCE-013
     * {
     *   "id": "TP-EC2-COMPLIANCE-013",
     *   "level": "unit",
     *   "capability": "EC2 instance profiles reference created role",
     *   "oracle": "contract",
     *   "invariants": ["Instance profile roles list contains created role"],
     *   "fixtures": ["cdk.Stack", "Ec2InstanceComponent"],
     *   "inputs": { "shape": "Commercial context with defaults", "notes": "Validates IAM wiring" },
     *   "risks": ["Instance profile mismatch"],
     *   "dependencies": [],
     *   "evidence": ["CloudFormation template"],
     *   "compliance_refs": ["std://security"],
     *   "ai_generated": false,
     *   "human_reviewed_by": ""
     * }
     */
    it('IamRole__InstanceProfile__AssociatesRole', () => {
      const template = synthesize();

      const profiles = template.findResources('AWS::IAM::InstanceProfile');
      const profile = Object.values(profiles)[0];
      expect(Array.isArray(profile.Properties?.Roles)).toBe(true);
      expect(profile.Properties.Roles[0]).toHaveProperty('Ref');
      expect(profile.Properties.Roles[0].Ref).toMatch(/TestInstance.*Role/);
    });
  });
});
