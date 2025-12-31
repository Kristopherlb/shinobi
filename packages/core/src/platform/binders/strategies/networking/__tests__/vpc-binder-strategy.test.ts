/**
 * Unit Tests: VPC Binder Strategy (Unified)
 * Tests for VPC networking bindings with compliance enforcement
 */

import { VpcBinderStrategy } from '../vpc-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('VpcBinderStrategy', () => {
  describe('VpcBind__ValidVpcNetworkAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-vpc-001',
      level: 'unit' as const,
      capability: 'Returns enhanced binding result with IAM policies and environment variables for valid VPC network access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'ValidVpcNetworkAccess',
        outcome: 'ReturnsEnhancedResult'
      },
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'IAM policies include VPC read actions',
        'Environment variables include VPC ID, ARN, CIDR block, and state',
        'Security group rules array is empty (network binding handled separately)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:network capability and read access',
        notes: 'Basic VPC network read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__ValidVpcNetworkAccess__ReturnsEnhancedResult', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:network': {
          type: 'vpc:network',
          vpcId: 'vpc-12345678',
          vpcArn: 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-12345678',
          cidrBlock: '10.0.0.0/16',
          state: 'available',
          isDefault: false,
          enableDnsHostnames: true,
          enableDnsSupport: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:network',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Returns enhanced binding result
      assertEnhancedBindingResult(result);

      // Supporting invariants
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(result.iamPolicies[0].statement.actions).toContain('ec2:DescribeVpcs');
      expect(result.environmentVariables['VPC_ID']).toBe('vpc-12345678');
      expect(result.environmentVariables['VPC_ARN']).toBe('arn:aws:ec2:us-east-1:123456789012:vpc/vpc-12345678');
      expect(result.environmentVariables['VPC_CIDR_BLOCK']).toBe('10.0.0.0/16');
      expect(result.environmentVariables['VPC_STATE']).toBe('available');
      expect(result.environmentVariables['VPC_DEFAULT']).toBe('false');
      expect(result.environmentVariables['VPC_DNS_HOSTNAMES']).toBe('true');
      expect(result.environmentVariables['VPC_DNS_SUPPORT']).toBe('true');
      expect(result.securityGroupRules).toEqual([]);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('VpcBind__VpcNetworkWriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-vpc-002',
      level: 'unit' as const,
      capability: 'Grants VPC write actions including CreateVpc and ModifyVpcAttribute for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'VpcNetworkWriteAccess',
        outcome: 'GrantsWriteActions'
      },
      invariants: [
        'IAM policies include VPC write actions (CreateVpc, ModifyVpcAttribute, DeleteVpc)',
        'VPC endpoint actions are included (CreateVpcEndpoint, ModifyVpcEndpoint)',
        'All VPC network management actions are present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:network capability and write access',
        notes: 'VPC network write access with full management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__VpcNetworkWriteAccess__GrantsWriteActions', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:network': {
          type: 'vpc:network',
          vpcId: 'vpc-12345678',
          vpcArn: 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-12345678',
          cidrBlock: '10.0.0.0/16',
          state: 'available',
          isDefault: false
        }
      });

      const context = createBindingContext({
        source,
        target,
      capability: 'vpc:network',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('write') || p.description.includes('VPC network'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('ec2:CreateVpc');
      expect(writePolicy!.statement.actions).toContain('ec2:ModifyVpcAttribute');
      expect(writePolicy!.statement.actions).toContain('ec2:DeleteVpc');
      expect(writePolicy!.statement.actions).toContain('ec2:CreateVpcEndpoint');
      expect(writePolicy!.statement.actions).toContain('ec2:DescribeVpcEndpoints');
    });
  });

  describe('VpcBind__VpcNetworkFlowLogsEnabled__GrantsCloudWatchLogsPermissions', () => {
    const metadata = {
      id: 'TP-binders-vpc-003',
      level: 'unit' as const,
      capability: 'Grants CloudWatch Logs permissions when flow logs are enabled and requireSecureAccess is true',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'VpcNetworkFlowLogsEnabled',
        outcome: 'GrantsCloudWatchLogsPermissions'
      },
      invariants: [
        'CloudWatch Logs policy is included when flowLogsEnabled is true and requireSecureAccess is true',
        'Logs permissions include CreateLogGroup, CreateLogStream, PutLogEvents',
        'VPC_FLOW_LOGS_ENABLED environment variable is set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:network capability, flowLogsEnabled true, and requireSecureAccess option',
        notes: 'VPC network with flow logs enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__VpcNetworkFlowLogsEnabled__GrantsCloudWatchLogsPermissions', async () => {
    const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:network': {
          type: 'vpc:network',
          vpcId: 'vpc-12345678',
          vpcArn: 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-12345678',
      cidrBlock: '10.0.0.0/16',
      state: 'available',
      isDefault: false,
      flowLogsEnabled: true,
      vpcEndpoints: ['s3', 'dynamodb']
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:network',
        access: 'read',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: CloudWatch Logs permissions are granted
      const logsPolicy = result.iamPolicies.find(p => p.description.includes('CloudWatch Logs') || p.description.includes('Flow Logs'));
      expect(logsPolicy).toBeDefined();
      expect(logsPolicy!.statement.actions).toContain('logs:CreateLogGroup');
      expect(logsPolicy!.statement.actions).toContain('logs:CreateLogStream');
      expect(logsPolicy!.statement.actions).toContain('logs:PutLogEvents');

      // Supporting invariants
      expect(result.environmentVariables['VPC_FLOW_LOGS_ENABLED']).toBe('true');
      expect(result.environmentVariables['VPC_ENDPOINTS_ENABLED']).toBe('true');
      expect(result.environmentVariables['VPC_ENDPOINT_SERVICES']).toBe('s3,dynamodb');
  });
});

  describe('VpcBind__NetVpcAlias__HandlesAliasCapability', () => {
    const metadata = {
      id: 'TP-binders-vpc-004',
      level: 'unit' as const,
      capability: 'Handles net:vpc alias capability correctly',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'NetVpcAlias',
        outcome: 'HandlesAliasCapability'
      },
      invariants: [
        'Strategy handles net:vpc capability alias',
        'Binding result is identical to vpc:network capability'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with net:vpc capability alias',
        notes: 'Test capability alias handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__NetVpcAlias__HandlesAliasCapability', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'net:vpc': {
          type: 'net:vpc',
          vpcId: 'vpc-12345678',
          vpcArn: 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-12345678',
          cidrBlock: '10.0.0.0/16',
          state: 'available',
          isDefault: false
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'net:vpc',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Alias capability is handled correctly
      assertEnhancedBindingResult(result);
      expect(result.environmentVariables['VPC_ID']).toBe('vpc-12345678');
    });
  });

  describe('VpcBind__ValidSubnetAccess__ReturnsSubnetEnvVars', () => {
    const metadata = {
      id: 'TP-binders-vpc-005',
      level: 'unit' as const,
      capability: 'Returns subnet environment variables for valid subnet access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'ValidSubnetAccess',
        outcome: 'ReturnsSubnetEnvVars'
      },
      invariants: [
        'Environment variables include subnet ID, ARN, CIDR block, AZ, and type',
        'IAM policies include subnet read actions',
        'SUBNET_TYPE defaults to private if not specified'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:subnet capability and read access',
        notes: 'Basic subnet read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__ValidSubnetAccess__ReturnsSubnetEnvVars', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:subnet': {
          type: 'vpc:subnet',
          subnetId: 'subnet-12345678',
          subnetArn: 'arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678',
          cidrBlock: '10.0.1.0/24',
          availabilityZone: 'us-east-1a',
          state: 'available',
          vpcId: 'vpc-12345678',
          subnetType: 'public',
          mapPublicIpOnLaunch: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:subnet',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Subnet environment variables are set
      expect(result.environmentVariables['SUBNET_ID']).toBe('subnet-12345678');
      expect(result.environmentVariables['SUBNET_ARN']).toBe('arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678');
      expect(result.environmentVariables['SUBNET_CIDR_BLOCK']).toBe('10.0.1.0/24');
      expect(result.environmentVariables['SUBNET_AVAILABILITY_ZONE']).toBe('us-east-1a');
      expect(result.environmentVariables['SUBNET_TYPE']).toBe('public');
      expect(result.environmentVariables['SUBNET_PUBLIC_IP_ON_LAUNCH']).toBe('true');
      expect(result.iamPolicies[0].statement.actions).toContain('ec2:DescribeSubnets');
    });
  });

  describe('VpcBind__SubnetWriteAccess__GrantsSubnetWriteActions', () => {
    const metadata = {
      id: 'TP-binders-vpc-006',
      level: 'unit' as const,
      capability: 'Grants subnet write actions including CreateSubnet and ModifySubnetAttribute for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'SubnetWriteAccess',
        outcome: 'GrantsSubnetWriteActions'
      },
      invariants: [
        'IAM policies include subnet write actions (CreateSubnet, ModifySubnetAttribute, DeleteSubnet)',
        'CIDR block association actions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:subnet capability and write access',
        notes: 'Subnet write access with full management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__SubnetWriteAccess__GrantsSubnetWriteActions', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:subnet': {
          type: 'vpc:subnet',
          subnetId: 'subnet-12345678',
          subnetArn: 'arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678',
          cidrBlock: '10.0.1.0/24',
          availabilityZone: 'us-east-1a',
          state: 'available',
          vpcId: 'vpc-12345678'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:subnet',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('subnet'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('ec2:CreateSubnet');
      expect(writePolicy!.statement.actions).toContain('ec2:ModifySubnetAttribute');
      expect(writePolicy!.statement.actions).toContain('ec2:DeleteSubnet');
      expect(writePolicy!.statement.actions).toContain('ec2:AssociateSubnetCidrBlock');
    });
  });

  describe('VpcBind__ValidSecurityGroupAccess__ReturnsSecurityGroupEnvVars', () => {
    const metadata = {
      id: 'TP-binders-vpc-007',
      level: 'unit' as const,
      capability: 'Returns security group environment variables for valid security group access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'ValidSecurityGroupAccess',
        outcome: 'ReturnsSecurityGroupEnvVars'
      },
      invariants: [
        'Environment variables include security group ID, ARN, name, description, and VPC ID',
        'IAM policies include security group read actions',
        'Security group rules are serialized to JSON when present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:security-group capability and read access',
        notes: 'Basic security group read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__ValidSecurityGroupAccess__ReturnsSecurityGroupEnvVars', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:security-group': {
          type: 'vpc:security-group',
          securityGroupId: 'sg-1234567890abcdef0',
          securityGroupArn: 'arn:aws:ec2:us-east-1:123456789012:security-group/sg-1234567890abcdef0',
          groupName: 'test-sg',
          description: 'Test security group',
          vpcId: 'vpc-12345678',
          securityGroupRules: [
            { isEgress: false, ruleNumber: 100, protocol: 'tcp', port: 443 },
            { isEgress: true, ruleNumber: 100, protocol: '-1', cidrBlock: '0.0.0.0/0' }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:security-group',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Security group environment variables are set
      expect(result.environmentVariables['SECURITY_GROUP_ID']).toBe('sg-1234567890abcdef0');
      expect(result.environmentVariables['SECURITY_GROUP_ARN']).toBe('arn:aws:ec2:us-east-1:123456789012:security-group/sg-1234567890abcdef0');
      expect(result.environmentVariables['SECURITY_GROUP_NAME']).toBe('test-sg');
      expect(result.environmentVariables['SECURITY_GROUP_DESCRIPTION']).toBe('Test security group');
      expect(result.environmentVariables['SECURITY_GROUP_VPC_ID']).toBe('vpc-12345678');
      expect(result.environmentVariables['SECURITY_GROUP_INGRESS_RULES']).toBeDefined();
      expect(result.environmentVariables['SECURITY_GROUP_EGRESS_RULES']).toBeDefined();
      expect(result.iamPolicies[0].statement.actions).toContain('ec2:DescribeSecurityGroups');
    });
  });

  describe('VpcBind__SecurityGroupWriteAccess__GrantsSecurityGroupWriteActions', () => {
    const metadata = {
      id: 'TP-binders-vpc-008',
      level: 'unit' as const,
      capability: 'Grants security group write actions including AuthorizeSecurityGroupIngress for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'SecurityGroupWriteAccess',
        outcome: 'GrantsSecurityGroupWriteActions'
      },
      invariants: [
        'IAM policies include security group write actions (CreateSecurityGroup, AuthorizeSecurityGroupIngress/Egress)',
        'Revoke actions are included for rule removal'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:security-group capability and write access',
        notes: 'Security group write access with full rule management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__SecurityGroupWriteAccess__GrantsSecurityGroupWriteActions', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:security-group': {
          type: 'vpc:security-group',
          securityGroupId: 'sg-1234567890abcdef0',
          securityGroupArn: 'arn:aws:ec2:us-east-1:123456789012:security-group/sg-1234567890abcdef0',
          groupName: 'test-sg',
          description: 'Test security group',
          vpcId: 'vpc-12345678'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:security-group',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('security group'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('ec2:CreateSecurityGroup');
      expect(writePolicy!.statement.actions).toContain('ec2:AuthorizeSecurityGroupIngress');
      expect(writePolicy!.statement.actions).toContain('ec2:AuthorizeSecurityGroupEgress');
      expect(writePolicy!.statement.actions).toContain('ec2:RevokeSecurityGroupIngress');
      expect(writePolicy!.statement.actions).toContain('ec2:RevokeSecurityGroupEgress');
    });
  });

  describe('VpcBind__ValidRouteTableAccess__ReturnsRouteTableEnvVars', () => {
    const metadata = {
      id: 'TP-binders-vpc-009',
      level: 'unit' as const,
      capability: 'Returns route table environment variables for valid route table access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'ValidRouteTableAccess',
        outcome: 'ReturnsRouteTableEnvVars'
      },
      invariants: [
        'Environment variables include route table ID, ARN, and VPC ID',
        'IAM policies include route table read actions',
        'Routes and associations are serialized to JSON when present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:route-table capability and read access',
        notes: 'Basic route table read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__ValidRouteTableAccess__ReturnsRouteTableEnvVars', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:route-table': {
          type: 'vpc:route-table',
          routeTableId: 'rtb-1234567890abcdef0',
          routeTableArn: 'arn:aws:ec2:us-east-1:123456789012:route-table/rtb-1234567890abcdef0',
          vpcId: 'vpc-12345678',
          routes: [{ destinationCidrBlock: '0.0.0.0/0', gatewayId: 'igw-12345678' }],
          associations: [{ subnetId: 'subnet-12345678', main: false }]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:route-table',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Route table environment variables are set
      expect(result.environmentVariables['ROUTE_TABLE_ID']).toBe('rtb-1234567890abcdef0');
      expect(result.environmentVariables['ROUTE_TABLE_ARN']).toBe('arn:aws:ec2:us-east-1:123456789012:route-table/rtb-1234567890abcdef0');
      expect(result.environmentVariables['ROUTE_TABLE_VPC_ID']).toBe('vpc-12345678');
      expect(result.environmentVariables['ROUTE_TABLE_ROUTES']).toBeDefined();
      expect(result.environmentVariables['ROUTE_TABLE_ASSOCIATIONS']).toBeDefined();
      expect(result.iamPolicies[0].statement.actions).toContain('ec2:DescribeRouteTables');
    });
  });

  describe('VpcBind__RouteTableWriteAccess__GrantsRouteTableWriteActions', () => {
    const metadata = {
      id: 'TP-binders-vpc-010',
      level: 'unit' as const,
      capability: 'Grants route table write actions including CreateRoute and ReplaceRoute for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'RouteTableWriteAccess',
        outcome: 'GrantsRouteTableWriteActions'
      },
      invariants: [
        'IAM policies include route table write actions (CreateRouteTable, CreateRoute, ReplaceRoute)',
        'Association actions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:route-table capability and write access',
        notes: 'Route table write access with full route management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__RouteTableWriteAccess__GrantsRouteTableWriteActions', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:route-table': {
          type: 'vpc:route-table',
          routeTableId: 'rtb-1234567890abcdef0',
          routeTableArn: 'arn:aws:ec2:us-east-1:123456789012:route-table/rtb-1234567890abcdef0',
          vpcId: 'vpc-12345678'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:route-table',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('route table'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('ec2:CreateRouteTable');
      expect(writePolicy!.statement.actions).toContain('ec2:CreateRoute');
      expect(writePolicy!.statement.actions).toContain('ec2:ReplaceRoute');
      expect(writePolicy!.statement.actions).toContain('ec2:AssociateRouteTable');
    });
  });

  describe('VpcBind__ValidNatGatewayAccess__ReturnsNatGatewayEnvVars', () => {
    const metadata = {
      id: 'TP-binders-vpc-011',
      level: 'unit' as const,
      capability: 'Returns NAT Gateway environment variables for valid NAT Gateway access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'ValidNatGatewayAccess',
        outcome: 'ReturnsNatGatewayEnvVars'
      },
      invariants: [
        'Environment variables include NAT Gateway ID, ARN, state, subnet ID, and connectivity type',
        'IAM policies include NAT Gateway read actions',
        'Public IP is set when natGatewayAddresses are present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:nat-gateway capability and read access',
        notes: 'Basic NAT Gateway read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__ValidNatGatewayAccess__ReturnsNatGatewayEnvVars', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:nat-gateway': {
          type: 'vpc:nat-gateway',
          natGatewayId: 'nat-1234567890abcdef0',
          natGatewayArn: 'arn:aws:ec2:us-east-1:123456789012:natgateway/nat-1234567890abcdef0',
          state: 'available',
          subnetId: 'subnet-12345678',
          connectivityType: 'public',
          natGatewayAddresses: [{ publicIp: '54.123.45.67' }]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:nat-gateway',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: NAT Gateway environment variables are set
      expect(result.environmentVariables['NAT_GATEWAY_ID']).toBe('nat-1234567890abcdef0');
      expect(result.environmentVariables['NAT_GATEWAY_ARN']).toBe('arn:aws:ec2:us-east-1:123456789012:natgateway/nat-1234567890abcdef0');
      expect(result.environmentVariables['NAT_GATEWAY_STATE']).toBe('available');
      expect(result.environmentVariables['NAT_GATEWAY_SUBNET_ID']).toBe('subnet-12345678');
      expect(result.environmentVariables['NAT_GATEWAY_CONNECTIVITY_TYPE']).toBe('public');
      expect(result.environmentVariables['NAT_GATEWAY_PUBLIC_IP']).toBe('54.123.45.67');
      expect(result.iamPolicies[0].statement.actions).toContain('ec2:DescribeNatGateways');
    });
  });

  describe('VpcBind__NatGatewayWriteAccess__GrantsNatGatewayWriteActions', () => {
    const metadata = {
      id: 'TP-binders-vpc-012',
      level: 'unit' as const,
      capability: 'Grants NAT Gateway write actions including CreateNatGateway and AllocateAddress for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'NatGatewayWriteAccess',
        outcome: 'GrantsNatGatewayWriteActions'
      },
      invariants: [
        'IAM policies include NAT Gateway write actions (CreateNatGateway, DeleteNatGateway)',
        'Elastic IP actions are included (AllocateAddress, ReleaseAddress)',
        'Elastic IP resources are included in policy resources'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:nat-gateway capability and write access',
        notes: 'NAT Gateway write access with full management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__NatGatewayWriteAccess__GrantsNatGatewayWriteActions', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:nat-gateway': {
          type: 'vpc:nat-gateway',
          natGatewayId: 'nat-1234567890abcdef0',
          natGatewayArn: 'arn:aws:ec2:us-east-1:123456789012:natgateway/nat-1234567890abcdef0',
          state: 'available',
          subnetId: 'subnet-12345678'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:nat-gateway',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('NAT Gateway'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('ec2:CreateNatGateway');
      expect(writePolicy!.statement.actions).toContain('ec2:DeleteNatGateway');
      expect(writePolicy!.statement.actions).toContain('ec2:AllocateAddress');
      expect(writePolicy!.statement.actions).toContain('ec2:ReleaseAddress');
      expect(writePolicy!.statement.resources).toContain('arn:aws:ec2:*:*:elastic-ip/*');
    });
  });

  describe('VpcBind__ValidNetworkAclAccess__ReturnsNetworkAclEnvVars', () => {
    const metadata = {
      id: 'TP-binders-vpc-013',
      level: 'unit' as const,
      capability: 'Returns Network ACL environment variables for valid Network ACL access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'ValidNetworkAclAccess',
        outcome: 'ReturnsNetworkAclEnvVars'
      },
      invariants: [
        'Environment variables include Network ACL ID, ARN, VPC ID, and isDefault flag',
        'IAM policies include Network ACL read actions',
        'Entries are serialized to JSON when present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:nacl capability and read access',
        notes: 'Basic Network ACL read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__ValidNetworkAclAccess__ReturnsNetworkAclEnvVars', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:nacl': {
          type: 'vpc:nacl',
          networkAclId: 'acl-1234567890abcdef0',
          networkAclArn: 'arn:aws:ec2:us-east-1:123456789012:network-acl/acl-1234567890abcdef0',
          vpcId: 'vpc-12345678',
          isDefault: false,
          entries: [
            { ruleNumber: 100, protocol: 'tcp', ruleAction: 'allow', cidrBlock: '10.0.0.0/16', egress: false }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:nacl',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Network ACL environment variables are set
      expect(result.environmentVariables['NETWORK_ACL_ID']).toBe('acl-1234567890abcdef0');
      expect(result.environmentVariables['NETWORK_ACL_ARN']).toBe('arn:aws:ec2:us-east-1:123456789012:network-acl/acl-1234567890abcdef0');
      expect(result.environmentVariables['NETWORK_ACL_VPC_ID']).toBe('vpc-12345678');
      expect(result.environmentVariables['NETWORK_ACL_IS_DEFAULT']).toBe('false');
      expect(result.environmentVariables['NETWORK_ACL_ENTRIES']).toBeDefined();
      expect(result.iamPolicies[0].statement.actions).toContain('ec2:DescribeNetworkAcls');
    });
  });

  describe('VpcBind__NetworkAclWriteAccess__GrantsNetworkAclWriteActions', () => {
    const metadata = {
      id: 'TP-binders-vpc-014',
      level: 'unit' as const,
      capability: 'Grants Network ACL write actions including CreateNetworkAcl and CreateNetworkAclEntry for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'NetworkAclWriteAccess',
        outcome: 'GrantsNetworkAclWriteActions'
      },
      invariants: [
        'IAM policies include Network ACL write actions (CreateNetworkAcl, CreateNetworkAclEntry, ReplaceNetworkAclEntry)',
        'Association actions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:nacl capability and write access',
        notes: 'Network ACL write access with full entry management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__NetworkAclWriteAccess__GrantsNetworkAclWriteActions', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:nacl': {
          type: 'vpc:nacl',
          networkAclId: 'acl-1234567890abcdef0',
          networkAclArn: 'arn:aws:ec2:us-east-1:123456789012:network-acl/acl-1234567890abcdef0',
          vpcId: 'vpc-12345678',
          isDefault: false
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:nacl',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('Network ACL'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('ec2:CreateNetworkAcl');
      expect(writePolicy!.statement.actions).toContain('ec2:CreateNetworkAclEntry');
      expect(writePolicy!.statement.actions).toContain('ec2:ReplaceNetworkAclEntry');
      expect(writePolicy!.statement.actions).toContain('ec2:ReplaceNetworkAclAssociation');
    });
  });

  describe('VpcBind__ValidPeeringAccess__ReturnsPeeringEnvVars', () => {
    const metadata = {
      id: 'TP-binders-vpc-015',
      level: 'unit' as const,
      capability: 'Returns VPC Peering environment variables for valid peering connection access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'ValidPeeringAccess',
        outcome: 'ReturnsPeeringEnvVars'
      },
      invariants: [
        'Environment variables include peering connection ID, ARN, VPC IDs, and status',
        'IAM policies include peering connection read actions',
        'Accepter and requester VPC info are set when present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:peering capability and read access',
        notes: 'Basic VPC Peering read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__ValidPeeringAccess__ReturnsPeeringEnvVars', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:peering': {
          type: 'vpc:peering',
          peeringConnectionId: 'pcx-1234567890abcdef0',
          peeringConnectionArn: 'arn:aws:ec2:us-east-1:123456789012:vpc-peering-connection/pcx-1234567890abcdef0',
          vpcId: 'vpc-12345678',
          peerVpcId: 'vpc-87654321',
          status: 'active',
          accepterVpcInfo: {
            vpcId: 'vpc-87654321',
            cidrBlock: '10.1.0.0/16',
            region: 'us-east-1'
          },
          requesterVpcInfo: {
            vpcId: 'vpc-12345678',
            cidrBlock: '10.0.0.0/16',
            region: 'us-east-1'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:peering',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Peering environment variables are set
      expect(result.environmentVariables['VPC_PEERING_CONNECTION_ID']).toBe('pcx-1234567890abcdef0');
      expect(result.environmentVariables['VPC_PEERING_CONNECTION_ARN']).toBe('arn:aws:ec2:us-east-1:123456789012:vpc-peering-connection/pcx-1234567890abcdef0');
      expect(result.environmentVariables['VPC_PEERING_VPC_ID']).toBe('vpc-12345678');
      expect(result.environmentVariables['VPC_PEERING_PEER_VPC_ID']).toBe('vpc-87654321');
      expect(result.environmentVariables['VPC_PEERING_STATUS']).toBe('active');
      expect(result.environmentVariables['VPC_PEERING_ACCEPTER_VPC_ID']).toBe('vpc-87654321');
      expect(result.environmentVariables['VPC_PEERING_ACCEPTER_CIDR']).toBe('10.1.0.0/16');
      expect(result.environmentVariables['VPC_PEERING_REQUESTER_VPC_ID']).toBe('vpc-12345678');
      expect(result.iamPolicies[0].statement.actions).toContain('ec2:DescribeVpcPeeringConnections');
    });
  });

  describe('VpcBind__PeeringWriteAccess__GrantsPeeringWriteActions', () => {
    const metadata = {
      id: 'TP-binders-vpc-016',
      level: 'unit' as const,
      capability: 'Grants VPC Peering write actions including CreateVpcPeeringConnection and AcceptVpcPeeringConnection for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'PeeringWriteAccess',
        outcome: 'GrantsPeeringWriteActions'
      },
      invariants: [
        'IAM policies include peering write actions (CreateVpcPeeringConnection, AcceptVpcPeeringConnection, DeleteVpcPeeringConnection)',
        'Modify options actions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:peering capability and write access',
        notes: 'VPC Peering write access with full connection management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__PeeringWriteAccess__GrantsPeeringWriteActions', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:peering': {
          type: 'vpc:peering',
          peeringConnectionId: 'pcx-1234567890abcdef0',
          peeringConnectionArn: 'arn:aws:ec2:us-east-1:123456789012:vpc-peering-connection/pcx-1234567890abcdef0',
          vpcId: 'vpc-12345678',
          peerVpcId: 'vpc-87654321',
          status: 'active'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:peering',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('Peering'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('ec2:CreateVpcPeeringConnection');
      expect(writePolicy!.statement.actions).toContain('ec2:AcceptVpcPeeringConnection');
      expect(writePolicy!.statement.actions).toContain('ec2:DeleteVpcPeeringConnection');
      expect(writePolicy!.statement.actions).toContain('ec2:ModifyVpcPeeringConnectionOptions');
    });
  });

  describe('VpcBind__ValidTransitGatewayAccess__ReturnsTransitGatewayEnvVars', () => {
    const metadata = {
      id: 'TP-binders-vpc-017',
      level: 'unit' as const,
      capability: 'Returns Transit Gateway environment variables for valid Transit Gateway access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'ValidTransitGatewayAccess',
        outcome: 'ReturnsTransitGatewayEnvVars'
      },
      invariants: [
        'Environment variables include Transit Gateway ID, ARN, state, and route table IDs',
        'IAM policies include Transit Gateway read actions',
        'Amazon side ASN is set when present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with tgw:transit-gateway capability and read access',
        notes: 'Basic Transit Gateway read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__ValidTransitGatewayAccess__ReturnsTransitGatewayEnvVars', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('transit-gateway', {
        'tgw:transit-gateway': {
          type: 'tgw:transit-gateway',
          transitGatewayId: 'tgw-1234567890abcdef0',
          transitGatewayArn: 'arn:aws:ec2:us-east-1:123456789012:transit-gateway/tgw-1234567890abcdef0',
          state: 'available',
          amazonSideAsn: 64512,
          associationDefaultRouteTableId: 'rtb-1234567890abcdef0',
          propagationDefaultRouteTableId: 'rtb-0987654321fedcba0'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'tgw:transit-gateway',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Transit Gateway environment variables are set
      expect(result.environmentVariables['TRANSIT_GATEWAY_ID']).toBe('tgw-1234567890abcdef0');
      expect(result.environmentVariables['TRANSIT_GATEWAY_ARN']).toBe('arn:aws:ec2:us-east-1:123456789012:transit-gateway/tgw-1234567890abcdef0');
      expect(result.environmentVariables['TRANSIT_GATEWAY_STATE']).toBe('available');
      expect(result.environmentVariables['TRANSIT_GATEWAY_AMAZON_SIDE_ASN']).toBe('64512');
      expect(result.environmentVariables['TRANSIT_GATEWAY_ASSOCIATION_DEFAULT_ROUTE_TABLE_ID']).toBe('rtb-1234567890abcdef0');
      expect(result.environmentVariables['TRANSIT_GATEWAY_PROPAGATION_DEFAULT_ROUTE_TABLE_ID']).toBe('rtb-0987654321fedcba0');
      expect(result.iamPolicies[0].statement.actions).toContain('ec2:DescribeTransitGateways');
    });
  });

  describe('VpcBind__TransitGatewayWriteAccess__GrantsTransitGatewayWriteActions', () => {
    const metadata = {
      id: 'TP-binders-vpc-018',
      level: 'unit' as const,
      capability: 'Grants Transit Gateway write actions including CreateTransitGateway and CreateTransitGatewayVpcAttachment for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'TransitGatewayWriteAccess',
        outcome: 'GrantsTransitGatewayWriteActions'
      },
      invariants: [
        'IAM policies include Transit Gateway write actions (CreateTransitGateway, CreateTransitGatewayVpcAttachment)',
        'Route table association and propagation actions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with tgw:transit-gateway capability and write access',
        notes: 'Transit Gateway write access with full gateway and attachment management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__TransitGatewayWriteAccess__GrantsTransitGatewayWriteActions', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('transit-gateway', {
        'tgw:transit-gateway': {
          type: 'tgw:transit-gateway',
          transitGatewayId: 'tgw-1234567890abcdef0',
          transitGatewayArn: 'arn:aws:ec2:us-east-1:123456789012:transit-gateway/tgw-1234567890abcdef0',
          state: 'available'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'tgw:transit-gateway',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('Transit Gateway'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('ec2:CreateTransitGateway');
      expect(writePolicy!.statement.actions).toContain('ec2:CreateTransitGatewayVpcAttachment');
      expect(writePolicy!.statement.actions).toContain('ec2:AssociateTransitGatewayRouteTable');
      expect(writePolicy!.statement.actions).toContain('ec2:CreateTransitGatewayRoute');
    });
  });

  describe('VpcBind__ValidNetworkFirewallAccess__ReturnsNetworkFirewallEnvVars', () => {
    const metadata = {
      id: 'TP-binders-vpc-019',
      level: 'unit' as const,
      capability: 'Returns Network Firewall environment variables for valid Network Firewall access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'ValidNetworkFirewallAccess',
        outcome: 'ReturnsNetworkFirewallEnvVars'
      },
      invariants: [
        'Environment variables include firewall name, ARN, ID, VPC ID, status, and policy ARN',
        'IAM policies include Network Firewall read actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:network-firewall capability and read access',
        notes: 'Basic Network Firewall read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__ValidNetworkFirewallAccess__ReturnsNetworkFirewallEnvVars', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('network-firewall', {
        'vpc:network-firewall': {
          type: 'vpc:network-firewall',
          firewallName: 'test-firewall',
          firewallArn: 'arn:aws:network-firewall:us-east-1:123456789012:firewall/test-firewall',
          firewallId: 'firewall-1234567890abcdef0',
          vpcId: 'vpc-12345678',
          status: 'ready',
          firewallPolicyArn: 'arn:aws:network-firewall:us-east-1:123456789012:firewall-policy/test-policy'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:network-firewall',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Network Firewall environment variables are set
      expect(result.environmentVariables['NETWORK_FIREWALL_NAME']).toBe('test-firewall');
      expect(result.environmentVariables['NETWORK_FIREWALL_ARN']).toBe('arn:aws:network-firewall:us-east-1:123456789012:firewall/test-firewall');
      expect(result.environmentVariables['NETWORK_FIREWALL_ID']).toBe('firewall-1234567890abcdef0');
      expect(result.environmentVariables['NETWORK_FIREWALL_VPC_ID']).toBe('vpc-12345678');
      expect(result.environmentVariables['NETWORK_FIREWALL_STATUS']).toBe('ready');
      expect(result.environmentVariables['NETWORK_FIREWALL_POLICY_ARN']).toBe('arn:aws:network-firewall:us-east-1:123456789012:firewall-policy/test-policy');
      expect(result.iamPolicies[0].statement.actions).toContain('network-firewall:DescribeFirewall');
    });
  });

  describe('VpcBind__NetworkFirewallWriteAccess__GrantsNetworkFirewallWriteActions', () => {
    const metadata = {
      id: 'TP-binders-vpc-020',
      level: 'unit' as const,
      capability: 'Grants Network Firewall write actions including CreateFirewall and UpdateFirewallPolicy for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'NetworkFirewallWriteAccess',
        outcome: 'GrantsNetworkFirewallWriteActions'
      },
      invariants: [
        'IAM policies include Network Firewall write actions (CreateFirewall, DeleteFirewall, UpdateFirewallPolicy)',
        'Policy management actions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:network-firewall capability and write access',
        notes: 'Network Firewall write access with full firewall and policy management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__NetworkFirewallWriteAccess__GrantsNetworkFirewallWriteActions', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('network-firewall', {
        'vpc:network-firewall': {
          type: 'vpc:network-firewall',
          firewallName: 'test-firewall',
          firewallArn: 'arn:aws:network-firewall:us-east-1:123456789012:firewall/test-firewall',
          firewallId: 'firewall-1234567890abcdef0',
          vpcId: 'vpc-12345678',
          status: 'ready'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:network-firewall',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('Network Firewall'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('network-firewall:CreateFirewall');
      expect(writePolicy!.statement.actions).toContain('network-firewall:DeleteFirewall');
      expect(writePolicy!.statement.actions).toContain('network-firewall:UpdateFirewallPolicy');
      expect(writePolicy!.statement.actions).toContain('network-firewall:AssociateFirewallPolicy');
    });
  });

  describe('VpcBind__ValidVpcEndpointAccess__ReturnsVpcEndpointEnvVars', () => {
    const metadata = {
      id: 'TP-binders-vpc-021',
      level: 'unit' as const,
      capability: 'Returns VPC Endpoint environment variables for valid VPC endpoint access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'ValidVpcEndpointAccess',
        outcome: 'ReturnsVpcEndpointEnvVars'
      },
      invariants: [
        'Environment variables include VPC endpoint ID, ARN, VPC ID, service name, type, and state',
        'IAM policies include VPC endpoint read actions (DescribeVpcEndpoints, DescribeVpcEndpointServices)',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:endpoint capability and read access',
        notes: 'Basic VPC endpoint read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__ValidVpcEndpointAccess__ReturnsVpcEndpointEnvVars', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc-endpoint', {
        'vpc:endpoint': {
          type: 'vpc:endpoint',
          vpcEndpointId: 'vpce-1234567890abcdef0',
          vpcEndpointArn: 'arn:aws:ec2:us-east-1:123456789012:vpc-endpoint/vpce-1234567890abcdef0',
          vpcId: 'vpc-12345678',
          serviceName: 'com.amazonaws.us-east-1.s3',
          endpointType: 'Gateway',
          state: 'available'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:endpoint',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: VPC Endpoint environment variables are set
      expect(result.environmentVariables['VPC_ENDPOINT_ID']).toBe('vpce-1234567890abcdef0');
      expect(result.environmentVariables['VPC_ENDPOINT_ARN']).toBe('arn:aws:ec2:us-east-1:123456789012:vpc-endpoint/vpce-1234567890abcdef0');
      expect(result.environmentVariables['VPC_ENDPOINT_VPC_ID']).toBe('vpc-12345678');
      expect(result.environmentVariables['VPC_ENDPOINT_SERVICE_NAME']).toBe('com.amazonaws.us-east-1.s3');
      expect(result.environmentVariables['VPC_ENDPOINT_TYPE']).toBe('Gateway');
      expect(result.environmentVariables['VPC_ENDPOINT_STATE']).toBe('available');
      expect(result.iamPolicies[0].statement.actions).toContain('ec2:DescribeVpcEndpoints');
      expect(result.iamPolicies[0].statement.actions).toContain('ec2:DescribeVpcEndpointServices');
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('VpcBind__VpcEndpointWriteAccess__GrantsVpcEndpointWriteActions', () => {
    const metadata = {
      id: 'TP-binders-vpc-022',
      level: 'unit' as const,
      capability: 'Grants VPC Endpoint write actions including CreateVpcEndpoint and ModifyVpcEndpoint for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'VpcEndpointWriteAccess',
        outcome: 'GrantsVpcEndpointWriteActions'
      },
      invariants: [
        'IAM policies include VPC endpoint write actions (CreateVpcEndpoint, ModifyVpcEndpoint, DeleteVpcEndpoint)',
        'Read actions are included in write access'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:endpoint capability and write access',
        notes: 'VPC endpoint write access with full endpoint management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__VpcEndpointWriteAccess__GrantsVpcEndpointWriteActions', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc-endpoint', {
        'vpc:endpoint': {
          type: 'vpc:endpoint',
          vpcEndpointId: 'vpce-1234567890abcdef0',
          vpcEndpointArn: 'arn:aws:ec2:us-east-1:123456789012:vpc-endpoint/vpce-1234567890abcdef0',
          vpcId: 'vpc-12345678',
          serviceName: 'com.amazonaws.us-east-1.dynamodb',
          endpointType: 'Interface',
          state: 'available'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:endpoint',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('VPC Endpoint'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('ec2:CreateVpcEndpoint');
      expect(writePolicy!.statement.actions).toContain('ec2:ModifyVpcEndpoint');
      expect(writePolicy!.statement.actions).toContain('ec2:DeleteVpcEndpoint');
      expect(writePolicy!.statement.actions).toContain('ec2:DescribeVpcEndpoints');
      expect(writePolicy!.statement.actions).toContain('ec2:DescribeVpcEndpointServices');
    });
  });

  describe('VpcBind__VpcEndpointWithDnsEntries__SetsDnsEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-vpc-023',
      level: 'unit' as const,
      capability: 'Sets DNS entry environment variables when DNS entries are provided in VPC endpoint capability data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'VpcEndpointWithDnsEntries',
        outcome: 'SetsDnsEnvironmentVariables'
      },
      invariants: [
        'First DNS entry is set as primary DNS name and hosted zone ID',
        'Multiple DNS entries are serialized to JSON in VPC_ENDPOINT_DNS_ENTRIES',
        'Private DNS enabled flag is set when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:endpoint capability including DNS entries and private DNS enabled',
        notes: 'VPC endpoint with DNS configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__VpcEndpointWithDnsEntries__SetsDnsEnvironmentVariables', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const dnsEntries = [
        { dnsName: 'vpce-1234567890abcdef0-abc123.vpce-svc-123456789.us-east-1.vpce.amazonaws.com', hostedZoneId: 'Z1234567890ABC' },
        { dnsName: 'vpce-1234567890abcdef0-xyz789.vpce-svc-123456789.us-east-1.vpce.amazonaws.com', hostedZoneId: 'Z1234567890XYZ' }
      ];
      const target = createMockTargetComponent('vpc-endpoint', {
        'vpc:endpoint': {
          type: 'vpc:endpoint',
          vpcEndpointId: 'vpce-1234567890abcdef0',
          vpcEndpointArn: 'arn:aws:ec2:us-east-1:123456789012:vpc-endpoint/vpce-1234567890abcdef0',
          vpcId: 'vpc-12345678',
          serviceName: 'com.amazonaws.us-east-1.s3',
          endpointType: 'Interface',
          state: 'available',
          dnsEntries,
          privateDnsEnabled: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:endpoint',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: DNS environment variables are set
      expect(result.environmentVariables['VPC_ENDPOINT_DNS_NAME']).toBe(dnsEntries[0].dnsName);
      expect(result.environmentVariables['VPC_ENDPOINT_HOSTED_ZONE_ID']).toBe(dnsEntries[0].hostedZoneId);
      expect(result.environmentVariables['VPC_ENDPOINT_DNS_ENTRIES']).toBe(JSON.stringify(dnsEntries));
      expect(result.environmentVariables['VPC_ENDPOINT_PRIVATE_DNS_ENABLED']).toBe('true');
    });
  });

  describe('VpcBind__MissingRequiredFields__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-vpc-024',
      level: 'unit' as const,
      capability: 'Throws actionable error when required capability data fields are missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'MissingRequiredFields',
        outcome: 'ThrowsActionableError'
      },
      invariants: [
        'Error message indicates missing field name',
        'Error message is descriptive and actionable',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:network capability but missing required fields',
        notes: 'Negative test case for missing required fields'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__MissingRequiredFields__ThrowsActionableError', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:network': {
          type: 'vpc:network',
          vpcId: 'vpc-12345678'
          // Missing vpcArn, cidrBlock, state, isDefault
        } as any
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:network',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message (type guard fails before specific validation)
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/vpcArn|cidrBlock|state|isDefault|Invalid VPC network capability data structure/);
    });
  });

  describe('VpcBind__CommercialCompliance__ReturnsComplianceBlock', () => {
    const metadata = {
      id: 'TP-binders-vpc-025',
      level: 'unit' as const,
      capability: 'Returns compliance block with commercial framework for commercial compliance context',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'VpcBind',
        condition: 'CommercialCompliance',
        outcome: 'ReturnsComplianceBlock'
      },
      invariants: [
        'Compliance block status is one of: compliant, non-compliant, partially-compliant',
        'Compliance framework is set correctly',
        'Compliance block includes actionsTaken from IAM policies'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with vpc:network capability and commercial compliance framework',
        notes: 'Compliance evaluation for commercial framework'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('VpcBind__CommercialCompliance__ReturnsComplianceBlock', async () => {
      const strategy = new VpcBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('vpc', {
        'vpc:network': {
          type: 'vpc:network',
          vpcId: 'vpc-12345678',
          vpcArn: 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-12345678',
          cidrBlock: '10.0.0.0/16',
          state: 'available',
          isDefault: false
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'vpc:network',
        access: 'read',
        complianceFramework: 'commercial'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Compliance block is present and valid
      expect(result.compliance).toBeDefined();
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe('commercial');
      expect(result.compliance.actionsTaken).toBeDefined();
      expect(Array.isArray(result.compliance.actionsTaken)).toBe(true);
    });
  });
});
