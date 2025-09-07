import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { VpcComponent } from '../../../packages/components/vpc/src/vpc.component';
import { ComponentContext, ComponentSpec } from '../../../packages/platform/contracts/src/component-interfaces';

describe('VpcComponent - CloudFormation Synthesis', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let component: VpcComponent;
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');

    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012'
    };

    mockSpec = {
      name: 'test-vpc',
      type: 'vpc',
      config: {
        vpcName: 'TestVPC',
        cidr: '10.0.0.0/16'
      }
    };
  });

  describe('CloudFormation Resource Generation', () => {
    test('should generate VPC with correct properties', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Verify VPC is created
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true
      });

      // Verify Internet Gateway is created
      template.hasResourceProperties('AWS::EC2::InternetGateway', {});
      
      // Verify VPC Gateway Attachment
      template.hasResourceProperties('AWS::EC2::VPCGatewayAttachment', {
        VpcId: { Ref: expect.any(String) },
        InternetGatewayId: { Ref: expect.any(String) }
      });
    });

    test('should create public and private subnets across multiple AZs', () => {
      mockSpec.config.subnetConfiguration = {
        createPublicSubnets: true,
        createPrivateSubnets: true,
        availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c']
      };

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Should have 6 subnets (3 public + 3 private)
      const subnets = template.findResources('AWS::EC2::Subnet');
      expect(Object.keys(subnets)).toHaveLength(6);

      // Verify public subnets have map public IP enabled
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: true,
        CidrBlock: '10.0.0.0/24'
      });

      // Verify private subnets don't have map public IP
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: false,
        CidrBlock: '10.0.3.0/24'
      });
    });

    test('should create NAT gateways for private subnet internet access', () => {
      mockSpec.config.natGateways = 2;
      mockSpec.config.subnetConfiguration = {
        createPublicSubnets: true,
        createPrivateSubnets: true,
        availabilityZones: ['us-east-1a', 'us-east-1b']
      };

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Verify NAT gateways are created
      const natGateways = template.findResources('AWS::EC2::NatGateway');
      expect(Object.keys(natGateways)).toHaveLength(2);

      // Verify Elastic IPs for NAT gateways
      const eips = template.findResources('AWS::EC2::EIP');
      expect(Object.keys(eips)).toHaveLength(2);

      // Verify route tables for private subnets
      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationCidrBlock: '0.0.0.0/0',
        NatGatewayId: { Ref: expect.any(String) }
      });
    });

    test('should configure VPC endpoints when specified', () => {
      mockSpec.config.vpcEndpoints = [
        {
          service: 's3',
          type: 'Gateway'
        },
        {
          service: 'dynamodb',
          type: 'Gateway'
        },
        {
          service: 'secretsmanager',
          type: 'Interface',
          subnetIds: ['subnet-private-1', 'subnet-private-2']
        }
      ];

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Verify VPC endpoints are created
      const vpcEndpoints = template.findResources('AWS::EC2::VPCEndpoint');
      expect(Object.keys(vpcEndpoints)).toHaveLength(3);

      // Verify Gateway endpoints
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: 'com.amazonaws.us-east-1.s3',
        VpcEndpointType: 'Gateway'
      });

      // Verify Interface endpoints
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: 'com.amazonaws.us-east-1.secretsmanager',
        VpcEndpointType: 'Interface'
      });
    });
  });

  describe('Compliance Framework Testing', () => {
    test('should apply FedRAMP Moderate network hardening', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify VPC Flow Logs are enabled
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        ResourceType: 'VPC',
        TrafficType: 'ALL',
        LogDestinationType: 'cloud-watch-logs'
      });

      // Verify enhanced security groups
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: expect.stringContaining('Default security group'),
        SecurityGroupEgress: [
          {
            IpProtocol: '-1',
            CidrIp: '0.0.0.0/0'
          }
        ]
      });

      // Verify CloudWatch Log Group for VPC Flow Logs
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: expect.stringContaining('vpc-flow-logs'),
        RetentionInDays: 365
      });
    });

    test('should apply FedRAMP High network security controls', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify enhanced VPC Flow Logs with metadata
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        ResourceType: 'VPC',
        TrafficType: 'ALL',
        LogFormat: expect.stringContaining('${srcaddr} ${dstaddr} ${srcport} ${dstport}')
      });

      // Verify CloudWatch Log Group has extended retention
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: expect.stringContaining('vpc-flow-logs'),
        RetentionInDays: 3653  // 10 years
      });

      // Verify NAT instances instead of NAT gateways for enhanced control
      if (mockSpec.config.natGateways) {
        template.hasResourceProperties('AWS::EC2::Instance', {
          ImageId: expect.any(String),
          InstanceType: expect.stringMatching(/^t3\.|^m5\./)
        });
      }

      // Verify mandatory private subnets
      const subnets = template.findResources('AWS::EC2::Subnet');
      const privateSubnets = Object.values(subnets).filter((subnet: any) => 
        !subnet.Properties.MapPublicIpOnLaunch
      );
      expect(privateSubnets.length).toBeGreaterThan(0);
    });
  });

  describe('Network ACLs and Security', () => {
    test('should configure custom Network ACLs when specified', () => {
      mockSpec.config.networkAcls = [
        {
          name: 'CustomPrivateNACL',
          subnetType: 'private',
          rules: [
            {
              ruleNumber: 100,
              protocol: 6, // TCP
              cidrBlock: '10.0.0.0/16',
              portRange: { from: 443, to: 443 },
              ruleAction: 'allow'
            }
          ]
        }
      ];

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Verify Network ACL is created
      template.hasResourceProperties('AWS::EC2::NetworkAcl', {
        VpcId: { Ref: expect.any(String) }
      });

      // Verify Network ACL Entry
      template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        NetworkAclId: { Ref: expect.any(String) },
        RuleNumber: 100,
        Protocol: 6,
        CidrBlock: '10.0.0.0/16',
        PortRange: { From: 443, To: 443 },
        RuleAction: 'allow'
      });
    });

    test('should create security groups with proper rules', () => {
      mockSpec.config.defaultSecurityGroups = [
        {
          name: 'WebTier',
          description: 'Security group for web tier',
          ingressRules: [
            {
              ipProtocol: 'tcp',
              fromPort: 80,
              toPort: 80,
              cidrBlocks: ['0.0.0.0/0']
            },
            {
              ipProtocol: 'tcp',
              fromPort: 443,
              toPort: 443,
              cidrBlocks: ['0.0.0.0/0']
            }
          ]
        }
      ];

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Verify custom security group
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for web tier',
        VpcId: { Ref: expect.any(String) },
        SecurityGroupIngress: [
          {
            IpProtocol: 'tcp',
            FromPort: 80,
            ToPort: 80,
            CidrIp: '0.0.0.0/0'
          },
          {
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: '0.0.0.0/0'
          }
        ]
      });
    });
  });

  describe('Capabilities and Outputs', () => {
    test('should register network:vpc capability', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      
      expect(capabilities['network:vpc']).toBeDefined();
      expect(capabilities['network:vpc'].vpcId).toBeDefined();
      expect(capabilities['network:vpc'].cidr).toBe('10.0.0.0/16');
      expect(capabilities['network:vpc'].region).toBe('us-east-1');
    });

    test('should provide subnet information in capabilities', () => {
      mockSpec.config.subnetConfiguration = {
        createPublicSubnets: true,
        createPrivateSubnets: true,
        availabilityZones: ['us-east-1a', 'us-east-1b']
      };

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      
      expect(capabilities['network:vpc'].publicSubnetIds).toBeDefined();
      expect(capabilities['network:vpc'].privateSubnetIds).toBeDefined();
      expect(capabilities['network:vpc'].publicSubnetIds).toHaveLength(2);
      expect(capabilities['network:vpc'].privateSubnetIds).toHaveLength(2);
    });

    test('should provide correct CloudFormation outputs', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify VPC ID output
      template.hasOutput('TestVpcVpcId', {
        Value: { Ref: expect.any(String) },
        Export: { Name: expect.stringContaining('TestVPC-id') }
      });

      // Verify CIDR block output
      template.hasOutput('TestVpcCidrBlock', {
        Value: { 'Fn::GetAtt': [expect.any(String), 'CidrBlock'] },
        Export: { Name: expect.stringContaining('TestVPC-cidr') }
      });
    });
  });

  describe('Error Conditions', () => {
    test('should fail synthesis with invalid CIDR block', () => {
      mockSpec.config.cidr = '10.0.0.0/8';  // Too large

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with overlapping subnet CIDRs', () => {
      mockSpec.config.subnetConfiguration = {
        publicSubnets: [
          { cidr: '10.0.1.0/24', availabilityZone: 'us-east-1a' },
          { cidr: '10.0.1.0/24', availabilityZone: 'us-east-1b' }  // Overlap!
        ]
      };

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with missing required configuration', () => {
      delete mockSpec.config.cidr;

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow('CIDR block is required');
    });
  });

  describe('CloudFormation Template Validation', () => {
    test('should generate syntactically valid CloudFormation', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Basic CloudFormation structure validation
      expect(cfnTemplate).toHaveProperty('AWSTemplateFormatVersion', '2010-09-09');
      expect(cfnTemplate).toHaveProperty('Resources');
      
      // Ensure VPC is present
      const vpcs = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::EC2::VPC');
      
      expect(vpcs).toHaveLength(1);
      
      // Verify proper resource dependencies
      const igw = Object.entries(cfnTemplate.Resources)
        .find(([_, resource]: [string, any]) => resource.Type === 'AWS::EC2::InternetGateway');
      
      expect(igw).toBeDefined();
    });

    test('should create proper resource dependencies', () => {
      mockSpec.config.subnetConfiguration = {
        createPublicSubnets: true,
        createPrivateSubnets: true
      };
      mockSpec.config.natGateways = 1;

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Verify dependencies exist
      const natGateway = Object.entries(cfnTemplate.Resources)
        .find(([_, resource]: [string, any]) => resource.Type === 'AWS::EC2::NatGateway');
      
      if (natGateway) {
        const [_, natResource] = natGateway as [string, any];
        expect(natResource.Properties.SubnetId).toBeDefined();
        expect(natResource.Properties.AllocationId).toBeDefined();
      }

      // Verify route tables have proper routes
      const routes = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::EC2::Route');
      
      expect(routes.length).toBeGreaterThan(0);
    });
  });
});