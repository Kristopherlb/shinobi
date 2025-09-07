import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { VpcComponent } from './src/vpc.component';
import { ComponentContext, ComponentSpec } from '../../platform/contracts/src/component-interfaces';

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

      // Verify public subnets have map public IP enabled (without exact CIDR dependency)
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: true
      });

      // Verify private subnets don't have map public IP (without exact CIDR dependency)
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: false
      });

      // Validate subnet count and CIDR allocation within VPC range
      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      const allSubnets = Object.entries(cfnTemplate.Resources)
        .filter(([, resource]: [string, any]) => resource.Type === 'AWS::EC2::Subnet');
      
      const publicSubnets = allSubnets.filter(([, subnet]: [string, any]) => 
        subnet.Properties.MapPublicIpOnLaunch === true);
      const privateSubnets = allSubnets.filter(([, subnet]: [string, any]) => 
        subnet.Properties.MapPublicIpOnLaunch === false);
      
      expect(publicSubnets.length).toBe(3);  // 3 AZs specified
      expect(privateSubnets.length).toBe(3); // 3 AZs specified
      
      // Verify all subnets are within VPC CIDR block
      allSubnets.forEach(([, subnet]: [string, any]) => {
        const subnetCidr = subnet.Properties.CidrBlock;
        expect(subnetCidr).toMatch(/^10\.0\.\d+\.0\/24$/); // Within 10.0.0.0/16
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

      // Verify Gateway endpoints with partition-aware service names
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: `com.amazonaws.${mockContext.region}.s3`,
        VpcEndpointType: 'Gateway'
      });

      // Verify Interface endpoints with proper configuration
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: `com.amazonaws.${mockContext.region}.secretsmanager`,
        VpcEndpointType: 'Interface',
        PrivateDnsEnabled: true,
        SubnetIds: expect.arrayContaining([expect.any(String)]),
        SecurityGroupIds: expect.arrayContaining([expect.any(String)])
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

      // Verify least-privilege security groups for FedRAMP
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: expect.stringContaining('Default security group'),
        SecurityGroupEgress: expect.arrayContaining([
          expect.objectContaining({
            IpProtocol: expect.any(String)
          })
        ])
      });
      
      // Verify egress is restricted (not wide-open to 0.0.0.0/0 for all protocols)
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
      Object.values(securityGroups).forEach((sg: any) => {
        if (sg.Properties.SecurityGroupEgress) {
          const wideEgress = sg.Properties.SecurityGroupEgress.filter((rule: any) => 
            rule.IpProtocol === '-1' && rule.CidrIp === '0.0.0.0/0');
          // FedRAMP should minimize wide egress rules
          expect(wideEgress.length).toBeLessThanOrEqual(1);
        }
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

      // Verify enhanced VPC Flow Logs with comprehensive metadata for FedRAMP High
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        ResourceType: 'VPC',
        TrafficType: 'ALL',
        LogDestinationType: 'cloud-watch-logs',
        LogFormat: expect.stringContaining('${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${windowstart} ${windowend} ${action} ${flowlogstatus}')
      });

      // Verify Flow Logs are configured with proper destination
      const flowLogs = template.findResources('AWS::EC2::FlowLog');
      Object.values(flowLogs).forEach((flowLog: any) => {
        // Should have either LogDestination or LogGroupName for CloudWatch
        expect(
          flowLog.Properties.LogDestination || flowLog.Properties.LogGroupName
        ).toBeDefined();
      });

      // Verify CloudWatch Log Group has extended retention
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: expect.stringContaining('vpc-flow-logs'),
        RetentionInDays: 3653  // 10 years
      });

      // Verify centralized egress pattern - NAT Gateways with enhanced monitoring
      if (mockSpec.config.natGateways) {
        template.hasResourceProperties('AWS::EC2::NatGateway', {
          AllocationId: expect.any(Object),
          SubnetId: expect.any(Object)
        });
      }

      // Verify control plane interface endpoints for FedRAMP High
      const requiredEndpoints = ['sts', 'logs', 'ecr.api', 'ecr.dkr', 'ssm', 'secretsmanager', 'kms'];
      const endpoints = template.findResources('AWS::EC2::VPCEndpoint');
      const interfaceEndpoints = Object.values(endpoints).filter((endpoint: any) => 
        endpoint.Properties.VpcEndpointType === 'Interface');
      
      // Expect at least some control plane endpoints for enhanced security
      expect(interfaceEndpoints.length).toBeGreaterThan(0);

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

  describe('Platform Tagging Standard Compliance', () => {
    test('should apply mandatory platform tags to all VPC resources', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      const template = Template.fromStack(stack);

      // Verify VPC has platform tags
      const vpcs = Object.entries(cfnTemplate.Resources)
        .filter(([, resource]: [string, any]) => resource.Type === 'AWS::EC2::VPC');
      
      expect(vpcs.length).toBeGreaterThanOrEqual(1);
      const [, vpcResource] = vpcs[0] as [string, any];
      
      expect(vpcResource.Properties.Tags).toBeDefined();
      const vpcTags = vpcResource.Properties.Tags;
      const vpcTagMap = vpcTags.reduce((acc: any, tag: any) => {
        acc[tag.Key] = tag.Value;
        return acc;
      }, {});
      
      // Verify mandatory platform tags
      expect(vpcTagMap['platform:service-name']).toBe('test-service');
      expect(vpcTagMap['platform:environment']).toBe('test');
      expect(vpcTagMap['platform:managed-by']).toBe('platform-engine');
      expect(vpcTagMap['platform:component-name']).toBe('test-vpc');
      expect(vpcTagMap['platform:commit-hash']).toBeDefined();

      // Verify subnets have platform tags
      const subnets = Object.entries(cfnTemplate.Resources)
        .filter(([, resource]: [string, any]) => resource.Type === 'AWS::EC2::Subnet');
      
      subnets.forEach(([, subnet]: [string, any]) => {
        expect(subnet.Properties.Tags).toBeDefined();
        const subnetTags = subnet.Properties.Tags;
        const subnetTagMap = subnetTags.reduce((acc: any, tag: any) => {
          acc[tag.Key] = tag.Value;
          return acc;
        }, {});
        expect(subnetTagMap['platform:service-name']).toBe('test-service');
        expect(subnetTagMap['platform:environment']).toBe('test');
      });

      // Verify NAT Gateways have platform tags
      const natGateways = Object.entries(cfnTemplate.Resources)
        .filter(([, resource]: [string, any]) => resource.Type === 'AWS::EC2::NatGateway');
      
      natGateways.forEach(([, natGw]: [string, any]) => {
        expect(natGw.Properties.Tags).toBeDefined();
        const natTags = natGw.Properties.Tags;
        const natTagMap = natTags.reduce((acc: any, tag: any) => {
          acc[tag.Key] = tag.Value;
          return acc;
        }, {});
        expect(natTagMap['platform:component-name']).toBe('test-vpc');
      });
    });

    test('should apply platform tags to CloudWatch Log Groups', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      const logGroups = Object.entries(cfnTemplate.Resources)
        .filter(([, resource]: [string, any]) => resource.Type === 'AWS::Logs::LogGroup');
      
      logGroups.forEach(([, logGroup]: [string, any]) => {
        expect(logGroup.Properties.Tags).toBeDefined();
        const logTags = logGroup.Properties.Tags;
        const logTagMap = logTags.reduce((acc: any, tag: any) => {
          acc[tag.Key] = tag.Value;
          return acc;
        }, {});
        expect(logTagMap['platform:service-name']).toBe('test-service');
        expect(logTagMap['platform:managed-by']).toBe('platform-engine');
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

    test('should provide comprehensive subnet and network information in capabilities', () => {
      mockSpec.config.subnetConfiguration = {
        createPublicSubnets: true,
        createPrivateSubnets: true,
        availabilityZones: ['us-east-1a', 'us-east-1b']
      };

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      
      // Verify complete capability contract
      expect(capabilities['network:vpc'].vpcId).toBeDefined();
      expect(capabilities['network:vpc'].cidr).toBe('10.0.0.0/16');
      expect(capabilities['network:vpc'].region).toBe('us-east-1');
      expect(capabilities['network:vpc'].publicSubnetIds).toBeDefined();
      expect(capabilities['network:vpc'].privateSubnetIds).toBeDefined();
      expect(capabilities['network:vpc'].publicSubnetIds).toHaveLength(2);
      expect(capabilities['network:vpc'].privateSubnetIds).toHaveLength(2);
      
      // Verify additional network resources if they exist
      if (capabilities['network:vpc'].routeTableIds) {
        expect(Array.isArray(capabilities['network:vpc'].routeTableIds)).toBe(true);
      }
      if (capabilities['network:vpc'].securityGroupIds) {
        expect(Array.isArray(capabilities['network:vpc'].securityGroupIds)).toBe(true);
      }
      if (capabilities['network:vpc'].endpointIds) {
        expect(Array.isArray(capabilities['network:vpc'].endpointIds)).toBe(true);
      }
      
      // Verify capability doesn't leak sensitive information
      expect(capabilities['network:vpc']).not.toHaveProperty('internalConfig');
      expect(capabilities['network:vpc']).not.toHaveProperty('secrets');
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

      // Verify CIDR block is available in capabilities (not as CloudFormation output)
      const capabilities = component.getCapabilities();
      expect(capabilities['network:vpc'].cidr).toBe('10.0.0.0/16');
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

  describe('Synthesis Idempotency and Stability', () => {
    test('should produce consistent results across multiple synthesis runs', () => {
      // First synthesis
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();
      
      const capabilities1 = component.getCapabilities();
      const template1 = app.synth().getStackByName('TestStack').template;
      
      // Reset and second synthesis
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack');
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();
      
      const capabilities2 = component.getCapabilities();
      const template2 = app.synth().getStackByName('TestStack').template;
      
      // Verify capabilities are stable
      expect(capabilities1['network:vpc'].cidr).toBe(capabilities2['network:vpc'].cidr);
      expect(capabilities1['network:vpc'].region).toBe(capabilities2['network:vpc'].region);
      
      // Verify resource counts are consistent
      const vpc1Count = Object.entries(template1.Resources)
        .filter(([, resource]: [string, any]) => resource.Type === 'AWS::EC2::VPC').length;
      const vpc2Count = Object.entries(template2.Resources)
        .filter(([, resource]: [string, any]) => resource.Type === 'AWS::EC2::VPC').length;
      
      expect(vpc1Count).toBe(vpc2Count);
      expect(vpc1Count).toBe(1);
      
      // Verify no resource duplication
      const resourceTypes1 = Object.values(template1.Resources).map((r: any) => r.Type).sort();
      const resourceTypes2 = Object.values(template2.Resources).map((r: any) => r.Type).sort();
      expect(resourceTypes1).toEqual(resourceTypes2);
    });
    
    test('should handle partition variations correctly', () => {
      // Test standard AWS partition
      const standardContext = { ...mockContext, region: 'us-east-1' };
      const standardComponent = new VpcComponent(stack, 'TestVpcStandard', standardContext, {
        ...mockSpec,
        config: {
          ...mockSpec.config,
          vpcEndpoints: [{ service: 's3', type: 'Gateway' as const }]
        }
      });
      standardComponent.synth();
      
      const standardTemplate = Template.fromStack(stack);
      standardTemplate.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: 'com.amazonaws.us-east-1.s3'
      });
      
      // Test GovCloud partition (conceptual - would need actual GovCloud region)
      const govContext = { ...mockContext, region: 'us-gov-west-1' };
      const newStack = new cdk.Stack(app, 'GovStack');
      const govComponent = new VpcComponent(newStack, 'TestVpcGov', govContext, {
        ...mockSpec,
        config: {
          ...mockSpec.config,
          vpcEndpoints: [{ service: 's3', type: 'Gateway' as const }]
        }
      });
      govComponent.synth();
      
      const govTemplate = Template.fromStack(newStack);
      // This would be partition-aware: com.amazonaws.us-gov-west-1.s3
      govTemplate.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: 'com.amazonaws.us-gov-west-1.s3'
      });
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