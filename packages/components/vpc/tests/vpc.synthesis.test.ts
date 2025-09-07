import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { VpcComponent } from '../src/vpc.component';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/src/component-interfaces';

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
        vpcName: 'test-service-vpc',
        cidr: '10.0.0.0/16',
        maxAzs: 2,
        natGateways: 1
      }
    };
  });

  describe('Basic CloudFormation Synthesis', () => {
    test('should create VPC with basic configuration', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true
      });
    });

    test('should create public and private subnets', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify public subnets
      template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '10.0.0.0/24',
        MapPublicIpOnLaunch: true
      });

      template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '10.0.1.0/24',
        MapPublicIpOnLaunch: true
      });

      // Verify private subnets
      template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '10.0.128.0/24',
        MapPublicIpOnLaunch: false
      });

      template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '10.0.129.0/24',
        MapPublicIpOnLaunch: false
      });
    });

    test('should create internet gateway and NAT gateway', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify Internet Gateway
      template.hasResourceProperties('AWS::EC2::InternetGateway', {});
      
      template.hasResourceProperties('AWS::EC2::VPCGatewayAttachment', {
        InternetGatewayId: expect.any(Object),
        VpcId: expect.any(Object)
      });

      // Verify NAT Gateway (single NAT as specified)
      template.resourceCountIs('AWS::EC2::NatGateway', 1);
      template.hasResourceProperties('AWS::EC2::NatGateway', {
        AllocationId: expect.any(Object),
        SubnetId: expect.any(Object)
      });

      // Verify Elastic IP for NAT Gateway
      template.hasResourceProperties('AWS::EC2::EIP', {
        Domain: 'vpc'
      });
    });

    test('should create route tables and routes', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify public route table with internet gateway route
      template.hasResourceProperties('AWS::EC2::RouteTable', {
        VpcId: expect.any(Object)
      });

      template.hasResourceProperties('AWS::EC2::Route', {
        RouteTableId: expect.any(Object),
        DestinationCidrBlock: '0.0.0.0/0',
        GatewayId: expect.any(Object) // Internet Gateway
      });

      // Verify private route table with NAT gateway route
      template.hasResourceProperties('AWS::EC2::Route', {
        RouteTableId: expect.any(Object),
        DestinationCidrBlock: '0.0.0.0/0', 
        NatGatewayId: expect.any(Object) // NAT Gateway
      });
    });
  });

  describe('Compliance Framework Application', () => {
    test('should apply commercial framework defaults', () => {
      mockContext.complianceFramework = 'commercial';
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Commercial: basic VPC without special hardening
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true
      });

      // Should have default security group with basic rules
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        VpcId: expect.any(Object),
        GroupDescription: expect.any(String)
      });
    });

    test('should apply FedRAMP Moderate hardening', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // FedRAMP Moderate: enhanced monitoring and logging
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true
      });

      // Verify VPC Flow Logs are enabled
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        ResourceType: 'VPC',
        ResourceId: expect.any(Object),
        TrafficType: 'ALL'
      });

      // Verify CloudWatch Log Group for VPC Flow Logs
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: expect.stringContaining('vpc-flow-logs'),
        RetentionInDays: 365 // 1 year retention for FedRAMP Moderate
      });

      // Enhanced security groups with restrictive defaults
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        VpcId: expect.any(Object),
        SecurityGroupEgress: [
          {
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: '0.0.0.0/0'
          },
          {
            IpProtocol: 'tcp', 
            FromPort: 80,
            ToPort: 80,
            CidrIp: '0.0.0.0/0'
          }
        ]
      });
    });

    test('should apply FedRAMP High hardening', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // FedRAMP High: maximum security hardening
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true
      });

      // Verify VPC Flow Logs with enhanced configuration
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        ResourceType: 'VPC',
        ResourceId: expect.any(Object),
        TrafficType: 'ALL',
        LogFormat: expect.stringContaining('${srcaddr}') // Custom log format for security analysis
      });

      // Enhanced log retention for FedRAMP High
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: expect.stringContaining('vpc-flow-logs'),
        RetentionInDays: 3653, // 10 years retention for FedRAMP High
        KmsKeyId: expect.any(Object) // Customer managed KMS key
      });

      // Verify customer managed KMS key for log encryption
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: expect.stringContaining('VPC Flow Logs'),
        KeyPolicy: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Principal: { Service: 'logs.amazonaws.com' }
            })
          ])
        }
      });

      // Network ACLs for additional layer of security
      template.hasResourceProperties('AWS::EC2::NetworkAcl', {
        VpcId: expect.any(Object)
      });

      // Restrictive Network ACL rules
      template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        NetworkAclId: expect.any(Object),
        RuleNumber: expect.any(Number),
        Protocol: 6, // TCP
        RuleAction: 'allow',
        CidrBlock: '10.0.0.0/16' // Only allow internal VPC traffic by default
      });

      // VPC Endpoint for S3 to avoid internet traffic
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        VpcId: expect.any(Object),
        ServiceName: expect.stringContaining('s3'),
        VpcEndpointType: 'Gateway'
      });

      // VPC Endpoint for DynamoDB
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        VpcId: expect.any(Object),
        ServiceName: expect.stringContaining('dynamodb'),
        VpcEndpointType: 'Gateway'
      });
    });
  });

  describe('Network Configuration Options', () => {
    test('should support custom CIDR blocks', () => {
      mockSpec.config.cidr = '172.16.0.0/16';
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '172.16.0.0/16'
      });

      // Verify subnets use the custom CIDR
      template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '172.16.0.0/24'
      });

      template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '172.16.1.0/24'
      });
    });

    test('should support configurable number of AZs', () => {
      mockSpec.config.maxAzs = 3;
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create 6 subnets (3 public + 3 private)
      template.resourceCountIs('AWS::EC2::Subnet', 6);
    });

    test('should support multiple NAT gateways for high availability', () => {
      mockSpec.config.natGateways = 2;
      mockSpec.config.maxAzs = 2;
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create 2 NAT gateways (one per AZ)
      template.resourceCountIs('AWS::EC2::NatGateway', 2);
      template.resourceCountIs('AWS::EC2::EIP', 2);
    });

    test('should support no NAT gateways for cost optimization', () => {
      mockSpec.config.natGateways = 0;
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should not create NAT gateways or EIPs
      template.resourceCountIs('AWS::EC2::NatGateway', 0);
      template.resourceCountIs('AWS::EC2::EIP', 0);
    });
  });

  describe('Security Configuration', () => {
    test('should create restrictive default security group', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        VpcId: expect.any(Object),
        GroupDescription: 'Default security group for test-service-vpc',
        SecurityGroupEgress: expect.arrayContaining([
          expect.objectContaining({
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: '0.0.0.0/0'
          })
        ])
      });
    });

    test('should support custom security group rules', () => {
      mockSpec.config.securityGroups = [
        {
          name: 'web-sg',
          description: 'Security group for web servers',
          inboundRules: [
            {
              protocol: 'tcp',
              fromPort: 80,
              toPort: 80,
              source: '0.0.0.0/0'
            },
            {
              protocol: 'tcp',
              fromPort: 443,
              toPort: 443,
              source: '0.0.0.0/0'
            }
          ],
          outboundRules: [
            {
              protocol: 'tcp',
              fromPort: 3306,
              toPort: 3306,
              destination: '10.0.128.0/24'
            }
          ]
        }
      ];

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupName: 'web-sg',
        GroupDescription: 'Security group for web servers',
        VpcId: expect.any(Object),
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
        ],
        SecurityGroupEgress: [
          {
            IpProtocol: 'tcp',
            FromPort: 3306,
            ToPort: 3306,
            CidrIp: '10.0.128.0/24'
          }
        ]
      });
    });
  });

  describe('Integration and Binding Support', () => {
    test('should create VPC with proper networking resources', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Verify VPC creation
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16'
      });
      
      // Verify subnets are created
      template.resourceCountIs('AWS::EC2::Subnet', 4); // 2 public + 2 private
    });
  });

  describe('Error Handling and Validation', () => {
    test('should fail synthesis with invalid CIDR block', () => {
      mockSpec.config.cidr = '300.0.0.0/16';  // Invalid IP range
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with missing VPC name', () => {
      mockSpec.config = {
        cidr: '10.0.0.0/16'
        // Missing vpcName
      };

      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow('vpcName is required');
    });

    test('should fail synthesis with invalid maxAzs', () => {
      mockSpec.config.maxAzs = 0;  // Must be at least 1
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with more NAT gateways than AZs', () => {
      mockSpec.config.maxAzs = 2;
      mockSpec.config.natGateways = 3;  // Can't have more NATs than AZs
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
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
      expect(Object.keys(cfnTemplate.Resources).length).toBeGreaterThan(0);

      // Ensure all resources have required properties
      Object.entries(cfnTemplate.Resources).forEach(([logicalId, resource]: [string, any]) => {
        expect(resource).toHaveProperty('Type');
        expect(resource).toHaveProperty('Properties');
        expect(typeof resource.Type).toBe('string');
        expect(typeof resource.Properties).toBe('object');
        expect(resource.Type).toMatch(/^AWS::[A-Za-z0-9]+::[A-Za-z0-9]+$/);
      });
    });

    test('should have consistent resource naming', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      const cfnTemplate = app.synth().getStackByName('TestStack').template;

      // Verify consistent naming convention
      const resourceNames = Object.keys(cfnTemplate.Resources);
      resourceNames.forEach(name => {
        expect(name).toMatch(/^TestVpc[A-Z][a-zA-Z0-9]*$/);
      });
    });

    test('should produce deployable CloudFormation template', () => {
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Validate that VPC has all required properties for deployment
      const vpcs = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::EC2::VPC');
      
      expect(vpcs).toHaveLength(1);
      
      const [_, vpcResource] = vpcs[0] as [string, any];
      expect(vpcResource.Properties).toHaveProperty('CidrBlock');
      expect(vpcResource.Properties).toHaveProperty('EnableDnsHostnames', true);
      expect(vpcResource.Properties).toHaveProperty('EnableDnsSupport', true);
    });
  });

  describe('Performance and Cost Optimization', () => {
    test('should minimize NAT gateway costs with single NAT option', () => {
      mockSpec.config.natGateways = 1;
      mockSpec.config.maxAzs = 3;
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should only create 1 NAT gateway even with 3 AZs
      template.resourceCountIs('AWS::EC2::NatGateway', 1);
      template.resourceCountIs('AWS::EC2::EIP', 1);
    });

    test('should support VPC endpoints for AWS services to reduce data transfer costs', () => {
      mockSpec.config.enableVpcEndpoints = true;
      mockSpec.config.vpcEndpoints = ['s3', 'dynamodb', 'ec2'];
      
      component = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify S3 gateway endpoint
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        VpcId: expect.any(Object),
        ServiceName: expect.stringContaining('s3'),
        VpcEndpointType: 'Gateway'
      });

      // Verify DynamoDB gateway endpoint  
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        VpcId: expect.any(Object),
        ServiceName: expect.stringContaining('dynamodb'),
        VpcEndpointType: 'Gateway'
      });

      // Verify EC2 interface endpoint
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        VpcId: expect.any(Object),
        ServiceName: expect.stringContaining('ec2'),
        VpcEndpointType: 'Interface'
      });
    });
  });
});