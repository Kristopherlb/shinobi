/**
 * VPC Component Tests
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { VpcComponent, VpcConfigBuilder } from './vpc.component';
import { ComponentContext, ComponentSpec } from '../../platform/contracts/component-interfaces';

describe('VPC Component', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let mockContext: ComponentContext;
  let baseSpec: ComponentSpec;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    
    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      region: 'us-east-1',
      scope: stack
    };

    baseSpec = {
      name: 'test-vpc',
      type: 'vpc',
      config: {}
    };
  });

  describe('Configuration Builder', () => {
    it('should build basic configuration with platform defaults', () => {
      const builder = new VpcConfigBuilder(mockContext, baseSpec);
      const config = builder.buildSync();

      expect(config.cidr).toBe('10.0.0.0/16');
      expect(config.maxAzs).toBe(2);
      expect(config.natGateways).toBe(1);
      expect(config.flowLogsEnabled).toBe(true);
      expect(config.subnets?.public?.cidrMask).toBe(24);
      expect(config.subnets?.private?.cidrMask).toBe(24);
      expect(config.subnets?.database?.cidrMask).toBe(28);
      expect(config.dns?.enableDnsHostnames).toBe(true);
      expect(config.dns?.enableDnsSupport).toBe(true);
    });

    it('should apply FedRAMP Moderate compliance defaults', () => {
      const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      const builder = new VpcConfigBuilder(fedrampContext, baseSpec);
      const config = builder.buildSync();

      expect(config.flowLogsEnabled).toBe(true);
      expect(config.natGateways).toBe(2);
      expect(config.maxAzs).toBe(3);
      expect(config.vpcEndpoints?.s3).toBe(true);
      expect(config.vpcEndpoints?.dynamodb).toBe(true);
      expect(config.vpcEndpoints?.secretsManager).toBe(false);
      expect(config.vpcEndpoints?.kms).toBe(false);
      expect(config.subnets?.public?.cidrMask).toBe(26);
      expect(config.subnets?.private?.cidrMask).toBe(24);
      expect(config.subnets?.database?.cidrMask).toBe(28);
    });

    it('should apply FedRAMP High compliance defaults', () => {
      const fedrampHighContext = { ...mockContext, complianceFramework: 'fedramp-high' as 'fedramp-high' };
      const builder = new VpcConfigBuilder(fedrampHighContext, baseSpec);
      const config = builder.buildSync();

      expect(config.flowLogsEnabled).toBe(true);
      expect(config.natGateways).toBe(3);
      expect(config.maxAzs).toBe(3);
      expect(config.vpcEndpoints?.s3).toBe(true);
      expect(config.vpcEndpoints?.dynamodb).toBe(true);
      expect(config.vpcEndpoints?.secretsManager).toBe(true);
      expect(config.vpcEndpoints?.kms).toBe(true);
      expect(config.subnets?.public?.cidrMask).toBe(27);
      expect(config.subnets?.private?.cidrMask).toBe(25);
      expect(config.subnets?.database?.cidrMask).toBe(28);
    });

    it('should merge user configuration with platform defaults', () => {
      const customSpec = {
        ...baseSpec,
        config: {
          cidr: '172.16.0.0/16',
          maxAzs: 4,
          natGateways: 2,
          flowLogsEnabled: false,
          subnets: {
            public: { cidrMask: 26 },
            private: { cidrMask: 22 }
          },
          vpcEndpoints: {
            s3: true
          },
          dns: {
            enableDnsHostnames: false
          }
        }
      };

      const builder = new VpcConfigBuilder(mockContext, customSpec);
      const config = builder.buildSync();

      expect(config.cidr).toBe('172.16.0.0/16');
      expect(config.maxAzs).toBe(4);
      expect(config.natGateways).toBe(2);
      expect(config.flowLogsEnabled).toBe(false);
      expect(config.subnets?.public?.cidrMask).toBe(26);
      expect(config.subnets?.private?.cidrMask).toBe(22);
      expect(config.subnets?.database?.cidrMask).toBe(28); // Should keep default
      expect(config.vpcEndpoints?.s3).toBe(true);
      expect(config.vpcEndpoints?.dynamodb).toBe(false); // Should keep default
      expect(config.dns?.enableDnsHostnames).toBe(false);
      expect(config.dns?.enableDnsSupport).toBe(true); // Should keep default
    });

    it('should handle deep merge for nested objects', () => {
      const customSpec = {
        ...baseSpec,
        config: {
          subnets: {
            public: { cidrMask: 26 }
            // Should keep private and database defaults
          }
        }
      };

      const builder = new VpcConfigBuilder(mockContext, customSpec);
      const config = builder.buildSync();

      expect(config.subnets?.public?.cidrMask).toBe(26);
      expect(config.subnets?.public?.name).toBe('Public'); // Should keep default name
      expect(config.subnets?.private?.cidrMask).toBe(24); // Should keep default
      expect(config.subnets?.database?.cidrMask).toBe(28); // Should keep default
    });

    it('should prioritize user config over compliance framework defaults', () => {
      const fedrampHighContext = { ...mockContext, complianceFramework: 'fedramp-high' as 'fedramp-high' };
      const customSpec = {
        ...baseSpec,
        config: {
          natGateways: 1, // Override FedRAMP High default of 3
          vpcEndpoints: {
            s3: false, // Override FedRAMP High default of true
            secretsManager: false // Override FedRAMP High default of true
          }
        }
      };

      const builder = new VpcConfigBuilder(fedrampHighContext, customSpec);
      const config = builder.buildSync();

      expect(config.natGateways).toBe(1);
      expect(config.vpcEndpoints?.s3).toBe(false);
      expect(config.vpcEndpoints?.secretsManager).toBe(false);
      // Should still get other FedRAMP High defaults
      expect(config.maxAzs).toBe(3);
      expect(config.vpcEndpoints?.dynamodb).toBe(true);
      expect(config.vpcEndpoints?.kms).toBe(true);
    });

    it('should set flow log retention based on compliance framework', () => {
      // Commercial framework - 30 days
      const commercialBuilder = new VpcConfigBuilder(mockContext, baseSpec);
      const commercialConfig = commercialBuilder.buildSync();
      expect(commercialConfig.flowLogRetentionDays).toBe(30);

      // FedRAMP Moderate - 90 days
      const fedrampModerateContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      const moderateBuilder = new VpcConfigBuilder(fedrampModerateContext, baseSpec);
      const moderateConfig = moderateBuilder.buildSync();
      expect(moderateConfig.flowLogRetentionDays).toBe(90);

      // FedRAMP High - 365 days
      const fedrampHighContext = { ...mockContext, complianceFramework: 'fedramp-high' as 'fedramp-high' };
      const highBuilder = new VpcConfigBuilder(fedrampHighContext, baseSpec);
      const highConfig = highBuilder.buildSync();
      expect(highConfig.flowLogRetentionDays).toBe(365);
    });

    it('should allow user override of flow log retention', () => {
      const fedrampHighContext = { ...mockContext, complianceFramework: 'fedramp-high' as 'fedramp-high' };
      const customSpec = {
        ...baseSpec,
        config: {
          flowLogRetentionDays: 180 // Override FedRAMP High default of 365
        }
      };

      const builder = new VpcConfigBuilder(fedrampHighContext, customSpec);
      const config = builder.buildSync();

      expect(config.flowLogRetentionDays).toBe(180);
      // Should still get other FedRAMP High defaults
      expect(config.maxAzs).toBe(3);
    });
  });

  describe('Component Synthesis', () => {
    it('should create VPC with basic configuration', () => {
      const component = new VpcComponent(stack, 'TestVpc', mockContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create VPC
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true
      });

      // Should create public, private, and database subnets
      template.resourceCountIs('AWS::EC2::Subnet', 6); // 2 AZs * 3 subnet types

      // Should create NAT gateway
      template.resourceCountIs('AWS::EC2::NatGateway', 1);

      // Should create flow logs by default
      template.resourceCountIs('AWS::Logs::LogGroup', 1);
      template.resourceCountIs('AWS::EC2::FlowLog', 1);
    });

    it('should create VPC with custom configuration', () => {
      const customSpec = {
        ...baseSpec,
        config: {
          cidr: '172.16.0.0/16',
          maxAzs: 3,
          natGateways: 2,
          subnets: {
            public: { cidrMask: 26 },
            private: { cidrMask: 24 },
            database: { cidrMask: 28 }
          }
        }
      };

      const component = new VpcComponent(stack, 'TestVpc', mockContext, customSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '172.16.0.0/16'
      });

      // Should create subnets (actual count may vary based on AZ availability)
      template.resourceCountIs('AWS::EC2::Subnet', 6); // Default test region has 2 AZs

      // Should create 2 NAT gateways
      template.resourceCountIs('AWS::EC2::NatGateway', 2);
    });

    it('should apply FedRAMP Moderate compliance settings', () => {
      const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      const component = new VpcComponent(stack, 'TestVpc', fedrampContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create subnets (limited by test environment AZs)
      template.resourceCountIs('AWS::EC2::Subnet', 6); // Test environment has 2 AZs

      // Should create 2 NAT gateways for HA (limited by AZ count)
      template.resourceCountIs('AWS::EC2::NatGateway', 2);

      // Should create VPC endpoints for S3 and DynamoDB
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              { Ref: 'AWS::Region' },
              '.s3'
            ]
          ]
        }
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              { Ref: 'AWS::Region' },
              '.dynamodb'
            ]
          ]
        }
      });

      // Should create flow logs with 3-month retention
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 90
      });
    });

    it('should apply FedRAMP High compliance settings', () => {
      const fedrampHighContext = { ...mockContext, complianceFramework: 'fedramp-high' as 'fedramp-high' };
      const component = new VpcComponent(stack, 'TestVpc', fedrampHighContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create NAT gateways (limited by AZ count in test environment)
      template.resourceCountIs('AWS::EC2::NatGateway', 2);

      // Should create interface endpoints for Secrets Manager and KMS
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              { Ref: 'AWS::Region' },
              '.secretsmanager'
            ]
          ]
        },
        VpcEndpointType: 'Interface'
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              { Ref: 'AWS::Region' },
              '.kms'
            ]
          ]
        },
        VpcEndpointType: 'Interface'
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              { Ref: 'AWS::Region' },
              '.lambda'
            ]
          ]
        },
        VpcEndpointType: 'Interface'
      });

      // Should create flow logs with 1-year retention
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 365
      });
    });

    it('should disable flow logs when configured', () => {
      const customSpec = {
        ...baseSpec,
        config: {
          flowLogsEnabled: false
        }
      };

      const component = new VpcComponent(stack, 'TestVpc', mockContext, customSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should not create flow logs
      template.resourceCountIs('AWS::Logs::LogGroup', 0);
      template.resourceCountIs('AWS::EC2::FlowLog', 0);
    });

    it('should create default security groups for commercial framework', () => {
      const component = new VpcComponent(stack, 'TestVpc', mockContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create web, app, and database security groups
      template.resourceCountIs('AWS::EC2::SecurityGroup', 3); // 3 custom SGs (default VPC SG not counted)

      // Web security group should allow HTTPS and HTTP
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for web tier'
      });

      // Should create ingress rules for security groups
      template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 2); // App-to-web and db-to-app
      
      // Verify app traffic rule exists  
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 8080,
        ToPort: 8080,
        Description: 'App traffic from web tier'
      });

      // Verify database traffic rule exists
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 5432,
        ToPort: 5432,
        Description: 'PostgreSQL from app tier'
      });
    });

    it('should create compliance NACLs for FedRAMP Moderate', () => {
      const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      const component = new VpcComponent(stack, 'TestVpc', fedrampContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create custom NACL
      template.resourceCountIs('AWS::EC2::NetworkAcl', 1);

      // Should have NACL entries for HTTPS outbound and ephemeral inbound
      template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        RuleNumber: 100,
        Protocol: 6, // TCP
        PortRange: {
          From: 443,
          To: 443
        },
        Egress: true,
        RuleAction: 'allow'
      });

      template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        RuleNumber: 100,
        Protocol: 6, // TCP
        PortRange: {
          From: 1024,
          To: 65535
        },
        Egress: false,
        RuleAction: 'allow'
      });
    });

    it('should provide correct capabilities after synthesis', () => {
      const component = new VpcComponent(stack, 'TestVpc', mockContext, baseSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      expect(capabilities['net:vpc']).toBeDefined();
      expect(capabilities['net:vpc'].vpcId).toBeDefined();
      expect(capabilities['net:vpc'].publicSubnetIds).toBeInstanceOf(Array);
      expect(capabilities['net:vpc'].privateSubnetIds).toBeInstanceOf(Array);
      expect(capabilities['net:vpc'].isolatedSubnetIds).toBeInstanceOf(Array);
    });

    it('should register all constructs properly', () => {
      const component = new VpcComponent(stack, 'TestVpc', mockContext, baseSpec);
      component.synth();

      // Check that constructs are registered
      const constructs = component['constructs'];
      expect(constructs.get('vpc')).toBeDefined();
      expect(constructs.get('flowLogGroup')).toBeDefined();
      expect(constructs.get('flowLogRole')).toBeDefined();
      expect(constructs.get('webSecurityGroup')).toBeDefined();
      expect(constructs.get('appSecurityGroup')).toBeDefined();
      expect(constructs.get('dbSecurityGroup')).toBeDefined();
    });

    it('should return correct component type', () => {
      const component = new VpcComponent(stack, 'TestVpc', mockContext, baseSpec);
      expect(component.getType()).toBe('vpc');
    });

    it('should tag subnets correctly', () => {
      const component = new VpcComponent(stack, 'TestVpc', mockContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create proper subnet count and verify subnets exist
      template.resourceCountIs('AWS::EC2::Subnet', 6); // 2 AZs * 3 subnet types
      
      // Check that subnets are properly tagged (just verify structure, not exact tag match)
      const resources = template.toJSON().Resources;
      const subnets = Object.values(resources).filter((r: any) => r.Type === 'AWS::EC2::Subnet');
      expect(subnets.length).toBe(6);
      
      // Verify that subnets have Tags property
      subnets.forEach((subnet: any) => {
        expect(subnet.Properties.Tags).toBeDefined();
        expect(Array.isArray(subnet.Properties.Tags)).toBe(true);
      });
    });

    it('should throw error when accessing capabilities before synthesis', () => {
      const component = new VpcComponent(stack, 'TestVpc', mockContext, baseSpec);
      
      expect(() => component.getCapabilities()).toThrow();
    });
  });

  describe('VPC Endpoints', () => {
    it('should create S3 and DynamoDB endpoints for compliance frameworks', () => {
      const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-moderate' as 'fedramp-moderate' };
      const component = new VpcComponent(stack, 'TestVpc', fedrampContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        VpcEndpointType: 'Gateway',
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              { Ref: 'AWS::Region' },
              '.s3'
            ]
          ]
        }
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        VpcEndpointType: 'Gateway',
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              { Ref: 'AWS::Region' },
              '.dynamodb'
            ]
          ]
        }
      });
    });

    it('should not create endpoints for commercial framework by default', () => {
      const component = new VpcComponent(stack, 'TestVpc', mockContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should not create any VPC endpoints for commercial
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
    });

    it('should create endpoints when explicitly configured', () => {
      const customSpec = {
        ...baseSpec,
        config: {
          vpcEndpoints: {
            s3: true,
            secretsManager: true
          }
        }
      };

      const component = new VpcComponent(stack, 'TestVpc', mockContext, customSpec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              { Ref: 'AWS::Region' },
              '.s3'
            ]
          ]
        }
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              { Ref: 'AWS::Region' },
              '.secretsmanager'
            ]
          ]
        }
      });
    });
  });

  describe('Platform Standards Compliance', () => {
    it('should apply all mandatory platform tags', () => {
      const component = new VpcComponent(stack, 'TestVpc', mockContext, baseSpec);
      component.synth();

      const template = Template.fromStack(stack);
      const resources = template.toJSON().Resources;
      const vpc = Object.values(resources).find((r: any) => r.Type === 'AWS::EC2::VPC') as any;
      

      // Verify VPC has core mandatory platform tags (checking for presence, not strict order)
      const tags = vpc.Properties.Tags;
      const tagKeys = tags.map((tag: any) => tag.Key);
      const tagMap = tags.reduce((acc: any, tag: any) => ({ ...acc, [tag.Key]: tag.Value }), {});

      // Check for required platform tags
      expect(tagKeys).toContain('service-name');
      expect(tagKeys).toContain('environment');
      expect(tagKeys).toContain('compliance-framework');
      expect(tagKeys).toContain('component-type');
      expect(tagKeys).toContain('component-name');
      expect(tagKeys).toContain('region');

      // Verify tag values
      expect(tagMap['service-name']).toBe('test-service');
      expect(tagMap['environment']).toBe('test');
      expect(tagMap['compliance-framework']).toBe('commercial');
      expect(tagMap['component-type']).toBe('vpc');
      expect(tagMap['component-name']).toBe('test-vpc');
      expect(tagMap['region']).toBe('us-east-1');
    });

    it('should ignore or warn on unsupported triggers block', () => {
      const specWithTriggers = {
        ...baseSpec,
        triggers: [
          {
            name: 'example-trigger',
            type: 'schedule',
            schedule: 'rate(1 hour)'
          }
        ]
      };

      const component = new VpcComponent(stack, 'TestVpc', mockContext, specWithTriggers);
      
      // Should synthesize without error despite unsupported triggers block
      expect(() => component.synth()).not.toThrow();
      
      // Component should still be fully functional
      const capabilities = component.getCapabilities();
      expect(capabilities['net:vpc']).toBeDefined();
    });

    it('should create standard CloudWatch alarms for operational monitoring', () => {
      // Create spec with NAT gateways to trigger alarm creation
      const specWithNatGateways = {
        ...baseSpec,
        config: {
          natGateways: 2
        }
      };

      const component = new VpcComponent(stack, 'TestVpc', mockContext, specWithNatGateways);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create NAT Gateway Error Port Allocation alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-vpc-natgw-port-errors',
        MetricName: 'ErrorPortAllocation',
        Namespace: 'AWS/NatGateway',
        Statistic: 'Sum',
        Threshold: 1,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        EvaluationPeriods: 2
      });

      // Should create NAT Gateway Packets Dropped alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-vpc-natgw-dropped-packets',
        MetricName: 'PacketsDropCount',
        Namespace: 'AWS/NatGateway',
        Statistic: 'Sum',
        Threshold: 10,
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 3
      });

      // Should create exactly 2 CloudWatch alarms
      template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    });

    it('should skip NAT Gateway alarms when no NAT gateways configured', () => {
      // Create spec with no NAT gateways
      const specWithoutNatGateways = {
        ...baseSpec,
        config: {
          natGateways: 0
        }
      };

      const component = new VpcComponent(stack, 'TestVpc', mockContext, specWithoutNatGateways);
      component.synth();

      const template = Template.fromStack(stack);

      // Should not create any CloudWatch alarms
      template.resourceCountIs('AWS::CloudWatch::Alarm', 0);
    });

    it('should use configured flow log retention days', () => {
      // Test custom retention configuration
      const customSpec = {
        ...baseSpec,
        config: {
          flowLogRetentionDays: 180 // 6 months
        }
      };

      const component = new VpcComponent(stack, 'TestVpc', mockContext, customSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create flow logs with custom retention
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 180
      });
    });
  });
});
