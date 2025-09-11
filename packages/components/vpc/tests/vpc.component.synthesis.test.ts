/**
 * VPC Component Synthesis Tests
 * Tests for VPC component synthesis following Platform Testing Standard v1.0
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { VpcComponent } from '../vpc.component';
import { VpcConfig } from '../vpc.builder';
import { ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  environment,
  complianceFramework,
  scope: {} as any, // Mock scope
  region: 'us-east-1',
  accountId: '123456789012',
  serviceLabels: {
    'owner': 'test-team',
    'version': '1.0.0'
  }
});

const createMockSpec = (config: Partial<VpcConfig> = {}): ComponentSpec => ({
  name: 'test-vpc',
  type: 'vpc',
  config
});

/**
 * Helper function to synthesize a VPC component and return template
 */
const synthesizeComponent = (context: ComponentContext, spec: ComponentSpec) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  
  // Update context to use the actual stack
  const updatedContext = { ...context, scope: stack };
  
  const component = new VpcComponent(stack, spec.name, updatedContext, spec);
  component.synth();
  
  const template = Template.fromStack(stack);
  return { app, stack, component, template };
};

describe('VpcComponent Synthesis', () => {

  describe('Default Happy Path Synthesis', () => {
    
    it('should synthesize basic VPC with commercial compliance', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify VPC creation
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'Name', Value: 'test-service-test-vpc' })
        ])
      });
    });

    it('should create public and private subnets', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify public subnets
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: true,
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'aws-cdk:subnet-type', Value: 'Public' })
        ])
      });
      
      // Verify private subnets
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: false,
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'aws-cdk:subnet-type', Value: 'Private' })
        ])
      });
    });

    it('should create NAT gateways for private subnet connectivity', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({ natGateways: 1 });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify NAT gateway creation
      template.hasResourceProperties('AWS::EC2::NatGateway', {
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'Name', Value: Match.stringLikeRegexp('test-service') })
        ])
      });
    });

    it('should create VPC flow logs when enabled', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({ flowLogsEnabled: true });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify flow log group
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: Match.objectLike({
          'Fn::Join': [
            '',
            Match.arrayWith([
              Match.stringLikeRegexp('vpc/flowlogs')
            ])
          ]
        }),
        RetentionInDays: 365 // 1 year for commercial
      });
      
      // Verify flow logs configuration
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        ResourceType: 'VPC',
        TrafficType: 'ALL'
      });
    });

    it('should apply standard platform tags', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify standard tags are applied to VPC
      template.hasResourceProperties('AWS::EC2::VPC', {
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'service-name', Value: 'test-service' })
        ])
      });
    });
    
  });

  describe('Compliance Framework Hardening', () => {
    
    it('should apply FedRAMP moderate compliance hardening', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify enhanced flow log retention for compliance
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 1827 // 5 years for FedRAMP moderate
      });
      
      // Verify multiple NAT gateways for redundancy
      template.resourceCountIs('AWS::EC2::NatGateway', 2);
      
      // Verify VPC endpoints for secure access
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: Match.objectLike({
          'Fn::Join': [
            '',
            Match.arrayWith([
              Match.stringLikeRegexp('s3')
            ])
          ]
        })
      });
    });
    
    it('should apply FedRAMP high compliance hardening', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify maximum flow log retention for high compliance
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 3653 // 10 years (actual value from platform config)
      });
      
      // Verify all VPC endpoints are created for secure access
      const vpcEndpointServices = ['s3', 'dynamodb', 'secretsmanager', 'kms'];
      vpcEndpointServices.forEach(service => {
        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
          ServiceName: Match.objectLike({
            'Fn::Join': [
              '',
              Match.arrayWith([
                Match.stringLikeRegexp(service)
              ])
            ]
          })
        });
      });
    });
    
  });

  describe('Custom Configuration', () => {
    
    it('should handle custom CIDR configuration', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        cidr: '172.16.0.0/16',
        maxAzs: 3
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '172.16.0.0/16'
      });
      
      // Should create subnets in 3 AZs
      template.resourceCountIs('AWS::EC2::Subnet', 6); // 2 subnet types × 3 AZs
    });

    it('should handle custom subnet configuration', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        subnets: {
          public: {
            cidrMask: 26,
            name: 'CustomPublic'
          },
          private: {
            cidrMask: 25,
            name: 'CustomPrivate'
          }
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify subnets are created with custom CIDR masks
      template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: Match.stringLikeRegexp('/26') // Public subnet with /26 mask
      });
      
      template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: Match.stringLikeRegexp('/25') // Private subnet with /25 mask
      });
    });

    it('should disable flow logs when configured', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        flowLogsEnabled: false
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Should not create flow log resources
      template.resourceCountIs('AWS::Logs::LogGroup', 0);
      template.resourceCountIs('AWS::EC2::FlowLog', 0);
    });
    
  });

  describe('Component Capabilities and Constructs', () => {
    
    it('should register correct capabilities after synthesis', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      const capabilities = component.getCapabilities();
      
      expect(capabilities).toBeDefined();
      expect(capabilities['net:vpc']).toBeDefined();
      expect(capabilities['networking:vpc']).toBeDefined();
      expect(capabilities['security:network-isolation']).toBeDefined();
      
      // Verify capability data structure
      const vpcCapability = capabilities['net:vpc'];
      expect(vpcCapability.vpcId).toBeDefined();
      expect(vpcCapability.cidr).toBeDefined();
      expect(vpcCapability.availabilityZones).toBeDefined();
      expect(vpcCapability.publicSubnetIds).toBeInstanceOf(Array);
      expect(vpcCapability.privateSubnetIds).toBeInstanceOf(Array);
    });

    it('should register construct handles for patches.ts access', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({ flowLogsEnabled: true });
      
      const { component } = synthesizeComponent(context, spec);
      
      // Verify main construct handle (mandatory)
      const mainConstruct = component.getConstruct('main');
      expect(mainConstruct).toBeDefined();
      
      // Verify VPC construct handle
      const vpcConstruct = component.getConstruct('vpc');
      expect(vpcConstruct).toBeDefined();
      
      // Verify flow log constructs when flow logs are enabled
      const flowLogGroup = component.getConstruct('flowLogGroup');
      expect(flowLogGroup).toBeDefined();
      
      const flowLogRole = component.getConstruct('flowLogRole');
      expect(flowLogRole).toBeDefined();
    });
    
  });

  describe('Error Handling', () => {
    
    it('should handle invalid configuration gracefully', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        maxAzs: 0, // Invalid value
        natGateways: -1 // Invalid value
      });
      
      expect(() => {
        synthesizeComponent(context, spec);
      }).not.toThrow();
    });
    
    it('should handle missing VPC endpoints configuration', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec({
        vpcEndpoints: undefined // Missing configuration
      });
      
      expect(() => {
        const { template } = synthesizeComponent(context, spec);
        // Should still create VPC endpoints based on compliance defaults
        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
          ServiceName: Match.objectLike({
            'Fn::Join': [
              '',
              Match.arrayWith([
                Match.stringLikeRegexp('s3')
              ])
            ]
          })
        });
      }).not.toThrow();
    });
    
  });
  
});
