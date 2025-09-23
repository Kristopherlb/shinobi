/**
 * VPC Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-vpc-binder-001",
 *   "level": "unit",
 *   "capability": "VPC binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "VPC component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["VpcBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { VpcBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/networking/vpc-binder-strategy';
import { BindingContext } from '../../../../packages/core/src/platform/binders/binding-context';
import { ComponentBinding } from '../../../../packages/core/src/platform/binders/component-binding';
import { ComplianceFramework } from '../../../../packages/core/src/platform/compliance/compliance-framework';

// Deterministic setup
let originalDateNow: () => number;
let mockDateNow: jest.SpiedFunction<typeof Date.now>;

beforeEach(() => {
  // Freeze clock for determinism
  originalDateNow = Date.now;
  const fixedTime = 1640995200000; // 2022-01-01T00:00:00Z
  mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(fixedTime);

  // Seed RNG for deterministic behavior
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  // Restore original functions
  mockDateNow.mockRestore();
  jest.restoreAllMocks();
});

describe('VpcBinderStrategy', () => {
  let strategy: VpcBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new VpcBinderStrategy();

    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      vpcId: 'vpc-12345',
      vpcArn: 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-12345',
      cidrBlock: '10.0.0.0/16',
      state: 'available',
      subnetId: 'subnet-12345',
      subnetArn: 'arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345',
      availabilityZone: 'us-east-1a',
      cidrBlock: '10.0.1.0/24',
      securityGroupId: 'sg-12345',
      securityGroupArn: 'arn:aws:ec2:us-east-1:123456789012:security-group/sg-12345',
      groupName: 'test-sg',
      description: 'Test security group',
      routeTableId: 'rtb-12345',
      routeTableArn: 'arn:aws:ec2:us-east-1:123456789012:route-table/rtb-12345',
      natGatewayId: 'nat-12345',
      natGatewayArn: 'arn:aws:ec2:us-east-1:123456789012:nat-gateway/nat-12345'
    };

    mockBinding = {
      capability: 'vpc:network',
      access: ['read', 'write']
    };

    mockContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      complianceFramework: ComplianceFramework.COMMERCIAL
    };
  });

  describe('Constructor__ValidSetup__InitializesCorrectly', () => {
    test('should initialize with correct supported capabilities', () => {
      expect(strategy.supportedCapabilities).toEqual([
        'vpc:network',
        'vpc:subnet',
        'vpc:security-group',
        'vpc:route-table',
        'vpc:nat-gateway'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for VPC binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null, mockContext))
        .rejects.toThrow('Binding is required for VPC binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null))
        .rejects.toThrow('Context is required for VPC binding');
    });
  });

  describe('Bind__MissingCapability__ThrowsError', () => {
    test('should throw error when capability is missing', async () => {
      const invalidBinding = { ...mockBinding, capability: undefined };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding capability is required');
    });
  });

  describe('Bind__MissingAccess__ThrowsError', () => {
    test('should throw error when access is missing', async () => {
      const invalidBinding = { ...mockBinding, access: undefined };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding access is required');
    });
  });

  describe('Bind__InvalidCapability__ThrowsError', () => {
    test('should throw error for unsupported capability', async () => {
      const invalidBinding = { ...mockBinding, capability: 'invalid:capability' };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Unsupported VPC capability: invalid:capability');
    });
  });

  describe('Bind__VpcNetworkCapability__ConfiguresNetworkAccess', () => {
    test('should configure read access for network', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ec2:DescribeVpcs',
          'ec2:DescribeVpcAttribute'
        ],
        Resource: mockTargetComponent.vpcArn
      });
    });

    test('should configure write access for network', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ec2:CreateVpc',
          'ec2:ModifyVpcAttribute',
          'ec2:DeleteVpc'
        ],
        Resource: mockTargetComponent.vpcArn
      });
    });

    test('should inject network environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('VPC_ID', mockTargetComponent.vpcId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('VPC_ARN', mockTargetComponent.vpcArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('VPC_CIDR_BLOCK', mockTargetComponent.cidrBlock);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('VPC_STATE', mockTargetComponent.state);
    });
  });

  describe('Bind__VpcSubnetCapability__ConfiguresSubnetAccess', () => {
    test('should configure read access for subnet', async () => {
      const subnetBinding = { ...mockBinding, capability: 'vpc:subnet', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, subnetBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ec2:DescribeSubnets',
          'ec2:DescribeSubnetAttribute'
        ],
        Resource: mockTargetComponent.subnetArn
      });
    });

    test('should configure write access for subnet', async () => {
      const subnetBinding = { ...mockBinding, capability: 'vpc:subnet', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, subnetBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ec2:CreateSubnet',
          'ec2:ModifySubnetAttribute',
          'ec2:DeleteSubnet'
        ],
        Resource: mockTargetComponent.subnetArn
      });
    });

    test('should inject subnet environment variables', async () => {
      const subnetBinding = { ...mockBinding, capability: 'vpc:subnet' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, subnetBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SUBNET_ID', mockTargetComponent.subnetId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SUBNET_ARN', mockTargetComponent.subnetArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SUBNET_AZ', mockTargetComponent.availabilityZone);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SUBNET_CIDR_BLOCK', mockTargetComponent.cidrBlock);
    });
  });

  describe('Bind__VpcSecurityGroupCapability__ConfiguresSecurityGroupAccess', () => {
    test('should configure read access for security group', async () => {
      const sgBinding = { ...mockBinding, capability: 'vpc:security-group', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, sgBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ec2:DescribeSecurityGroups',
          'ec2:DescribeSecurityGroupRules'
        ],
        Resource: mockTargetComponent.securityGroupArn
      });
    });

    test('should configure write access for security group', async () => {
      const sgBinding = { ...mockBinding, capability: 'vpc:security-group', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, sgBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ec2:CreateSecurityGroup',
          'ec2:AuthorizeSecurityGroupIngress',
          'ec2:AuthorizeSecurityGroupEgress',
          'ec2:RevokeSecurityGroupIngress',
          'ec2:RevokeSecurityGroupEgress',
          'ec2:DeleteSecurityGroup'
        ],
        Resource: mockTargetComponent.securityGroupArn
      });
    });

    test('should inject security group environment variables', async () => {
      const sgBinding = { ...mockBinding, capability: 'vpc:security-group' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, sgBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECURITY_GROUP_ID', mockTargetComponent.securityGroupId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECURITY_GROUP_ARN', mockTargetComponent.securityGroupArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECURITY_GROUP_NAME', mockTargetComponent.groupName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SECURITY_GROUP_DESCRIPTION', mockTargetComponent.description);
    });
  });

  describe('Bind__VpcRouteTableCapability__ConfiguresRouteTableAccess', () => {
    test('should configure read access for route table', async () => {
      const rtBinding = { ...mockBinding, capability: 'vpc:route-table', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, rtBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ec2:DescribeRouteTables',
          'ec2:DescribeRoutes'
        ],
        Resource: mockTargetComponent.routeTableArn
      });
    });

    test('should configure write access for route table', async () => {
      const rtBinding = { ...mockBinding, capability: 'vpc:route-table', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, rtBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ec2:CreateRouteTable',
          'ec2:CreateRoute',
          'ec2:DeleteRoute',
          'ec2:DeleteRouteTable'
        ],
        Resource: mockTargetComponent.routeTableArn
      });
    });

    test('should inject route table environment variables', async () => {
      const rtBinding = { ...mockBinding, capability: 'vpc:route-table' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, rtBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('ROUTE_TABLE_ID', mockTargetComponent.routeTableId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('ROUTE_TABLE_ARN', mockTargetComponent.routeTableArn);
    });
  });

  describe('Bind__VpcNatGatewayCapability__ConfiguresNatGatewayAccess', () => {
    test('should configure read access for NAT gateway', async () => {
      const natBinding = { ...mockBinding, capability: 'vpc:nat-gateway', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, natBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ec2:DescribeNatGateways'
        ],
        Resource: mockTargetComponent.natGatewayArn
      });
    });

    test('should configure write access for NAT gateway', async () => {
      const natBinding = { ...mockBinding, capability: 'vpc:nat-gateway', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, natBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ec2:CreateNatGateway',
          'ec2:DeleteNatGateway'
        ],
        Resource: mockTargetComponent.natGatewayArn
      });
    });

    test('should inject NAT gateway environment variables', async () => {
      const natBinding = { ...mockBinding, capability: 'vpc:nat-gateway' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, natBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('NAT_GATEWAY_ID', mockTargetComponent.natGatewayId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('NAT_GATEWAY_ARN', mockTargetComponent.natGatewayArn);
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for VPC binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for VPC binding: invalid. Valid types: read, write, admin, manage');
    });
  });
});
