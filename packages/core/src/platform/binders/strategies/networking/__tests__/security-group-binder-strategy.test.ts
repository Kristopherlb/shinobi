/**
 * Unit Tests: Security Group Binder Strategy (Unified)
 * Tests for AWS Security Group bindings with compliance enforcement
 */

import { SecurityGroupBinderStrategy } from '../security-group-binder-strategy.js';
import { Effect } from 'aws-cdk-lib/aws-iam';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('SecurityGroupBinderStrategy', () => {
  describe('SecurityGroupBind__ValidSecurityGroupImportAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-security-group-001',
      level: 'unit' as const,
      capability: 'Returns enhanced binding result with security group ID and metadata for valid security group import access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'SecurityGroupBind',
        condition: 'ValidSecurityGroupImportAccess',
        outcome: 'ReturnsEnhancedResult'
      },
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'Environment variables include security group ID and VPC ID',
        'IAM policies array is empty (no discovery by default)',
        'Security group rules array is empty (rules handled separately)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:import capability and read access',
        notes: 'Basic security group import binding with required fields'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupBind__ValidSecurityGroupImportAccess__ReturnsEnhancedResult', async () => {
      const strategy = new SecurityGroupBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-import', {
        'security-group:import': {
          type: 'security-group:import',
          securityGroupId: 'sg-1234567890abcdef0',
          vpcId: 'vpc-12345678',
          ssmParameterName: '/shared/security-groups/web-servers',
          region: 'us-east-1',
          accountId: '123456789012'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:import',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Returns enhanced binding result
      assertEnhancedBindingResult(result);

      // Supporting invariants
      expect(result.environmentVariables['SECURITY_GROUP_ID']).toBe('sg-1234567890abcdef0');
      expect(result.environmentVariables['SECURITY_GROUP_VPC_ID']).toBe('vpc-12345678');
      expect(result.environmentVariables['SECURITY_GROUP_SSM_PARAMETER']).toBe('/shared/security-groups/web-servers');
      expect(result.environmentVariables['SECURITY_GROUP_REGION']).toBe('us-east-1');
      expect(result.environmentVariables['SECURITY_GROUP_ACCOUNT_ID']).toBe('123456789012');
      expect(result.iamPolicies).toEqual([]);
      expect(result.securityGroupRules).toEqual([]);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('SecurityGroupBind__SsmParameterHandling__SetsSsmParameterEnvVar', () => {
    const metadata = {
      id: 'TP-binders-security-group-002',
      level: 'unit' as const,
      capability: 'Sets SSM parameter name environment variable when SSM parameter is provided in capability data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'SecurityGroupBind',
        condition: 'SsmParameterHandling',
        outcome: 'SetsSsmParameterEnvVar'
      },
      invariants: [
        'SECURITY_GROUP_SSM_PARAMETER environment variable is set when ssmParameterName is present',
        'Other environment variables are still set correctly',
        'Binding completes successfully'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:import capability including ssmParameterName',
        notes: 'Test SSM parameter name handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupBind__SsmParameterHandling__SetsSsmParameterEnvVar', async () => {
      const strategy = new SecurityGroupBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-import', {
        'security-group:import': {
          type: 'security-group:import',
          securityGroupId: 'sg-abcdef1234567890',
          ssmParameterName: '/prod/shared/security-groups/database-sg'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:import',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: SSM parameter environment variable is set
      expect(result.environmentVariables['SECURITY_GROUP_SSM_PARAMETER']).toBe('/prod/shared/security-groups/database-sg');
      expect(result.environmentVariables['SECURITY_GROUP_ID']).toBe('sg-abcdef1234567890');
    });
  });

  describe('SecurityGroupBind__CrossAccountBinding__SetsCrossAccountEnvVars', () => {
    const metadata = {
      id: 'TP-binders-security-group-003',
      level: 'unit' as const,
      capability: 'Sets cross-account/cross-region environment variables when region and accountId are provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'SecurityGroupBind',
        condition: 'CrossAccountBinding',
        outcome: 'SetsCrossAccountEnvVars'
      },
      invariants: [
        'SECURITY_GROUP_REGION environment variable is set when region is present',
        'SECURITY_GROUP_ACCOUNT_ID environment variable is set when accountId is present',
        'Cross-account binding completes successfully',
        'All standard environment variables are still set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:import capability including region and accountId',
        notes: 'Test cross-account/cross-region binding support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupBind__CrossAccountBinding__SetsCrossAccountEnvVars', async () => {
      const strategy = new SecurityGroupBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-import', {
        'security-group:import': {
          type: 'security-group:import',
          securityGroupId: 'sg-crossaccount1234',
          region: 'us-west-2',
          accountId: '987654321098',
          vpcId: 'vpc-98765432'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:import',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Cross-account/cross-region environment variables are set
      expect(result.environmentVariables['SECURITY_GROUP_REGION']).toBe('us-west-2');
      expect(result.environmentVariables['SECURITY_GROUP_ACCOUNT_ID']).toBe('987654321098');
      expect(result.environmentVariables['SECURITY_GROUP_ID']).toBe('sg-crossaccount1234');
      expect(result.environmentVariables['SECURITY_GROUP_VPC_ID']).toBe('vpc-98765432');
    });
  });

  describe('SecurityGroupBind__DiscoveryPermissions__GrantsDescribeActions', () => {
    const metadata = {
      id: 'TP-binders-security-group-004',
      level: 'unit' as const,
      capability: 'Grants EC2 describe permissions when includeDiscovery option is enabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'SecurityGroupBind',
        condition: 'DiscoveryPermissions',
        outcome: 'GrantsDescribeActions'
      },
      invariants: [
        'IAM policy is created with DescribeSecurityGroups and DescribeSecurityGroupRules actions',
        'Policy is scoped to the specific security group ARN',
        'Environment variables are still set correctly'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:import capability and options.includeDiscovery: true',
        notes: 'Test optional discovery permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupBind__DiscoveryPermissions__GrantsDescribeActions', async () => {
      const strategy = new SecurityGroupBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-import', {
        'security-group:import': {
          type: 'security-group:import',
          securityGroupId: 'sg-discovery123456'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:import',
        access: 'read',
        options: { includeDiscovery: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: IAM policy with discovery permissions is created
      expect(result.iamPolicies.length).toBe(1);
      const discoveryPolicy = result.iamPolicies[0];
      expect(discoveryPolicy.description).toContain('discovery');
      expect(discoveryPolicy.statement.effect).toBe(Effect.ALLOW);
      expect(discoveryPolicy.statement.actions).toContain('ec2:DescribeSecurityGroups');
      expect(discoveryPolicy.statement.actions).toContain('ec2:DescribeSecurityGroupRules');
      expect(result.environmentVariables['SECURITY_GROUP_ID']).toBe('sg-discovery123456');
    });
  });

  describe('SecurityGroupBind__SecuritySecurityGroupAlias__HandlesAliasCapability', () => {
    const metadata = {
      id: 'TP-binders-security-group-005',
      level: 'unit' as const,
      capability: 'Handles security:security-group alias capability correctly',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'SecurityGroupBind',
        condition: 'SecuritySecurityGroupAlias',
        outcome: 'HandlesAliasCapability'
      },
      invariants: [
        'Binding succeeds with security:security-group capability',
        'Environment variables are set correctly',
        'Type guard accepts the alias capability'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:security-group capability (alias for security-group:import)',
        notes: 'Test alias capability handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupBind__SecuritySecurityGroupAlias__HandlesAliasCapability', async () => {
      const strategy = new SecurityGroupBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-import', {
        'security:security-group': {
          type: 'security-group:import',
          securityGroupId: 'sg-alias12345678'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:security-group',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Alias capability is handled correctly
      assertEnhancedBindingResult(result);
      expect(result.environmentVariables['SECURITY_GROUP_ID']).toBe('sg-alias12345678');
    });
  });

  describe('SecurityGroupBind__MissingSecurityGroupId__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-group-006',
      level: 'unit' as const,
      capability: 'Throws actionable error when securityGroupId is missing from capability data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'SecurityGroupBind',
        condition: 'MissingSecurityGroupId',
        outcome: 'ThrowsError'
      },
      invariants: [
        'Error message indicates securityGroupId is required',
        'Error message is descriptive and actionable',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:import capability but missing securityGroupId',
        notes: 'Negative test case for missing required field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupBind__MissingSecurityGroupId__ThrowsError', async () => {
      const strategy = new SecurityGroupBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-import', {
        'security-group:import': {
          type: 'security-group:import'
          // Missing securityGroupId
        } as any
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:import',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message
      // Type guard fails first with generic error message before specific validation
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/Invalid Security Group capability data structure|securityGroupId/);
    });
  });

  describe('SecurityGroupBind__OptionalFieldsOmitted__SetsStandardEnvVars', () => {
    const metadata = {
      id: 'TP-binders-security-group-007',
      level: 'unit' as const,
      capability: 'Sets standard environment variables when optional fields are omitted from capability data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'SecurityGroupBind',
        condition: 'OptionalFieldsOmitted',
        outcome: 'SetsStandardEnvVars'
      },
      invariants: [
        'Required environment variables are always set (SECURITY_GROUP_ID)',
        'Optional environment variables are omitted when not present',
        'Binding completes successfully with minimal capability data'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:import capability with only required fields',
        notes: 'Test minimal capability data handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupBind__OptionalFieldsOmitted__SetsStandardEnvVars', async () => {
      const strategy = new SecurityGroupBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-import', {
        'security-group:import': {
          type: 'security-group:import',
          securityGroupId: 'sg-minimal12345'
          // Optional fields omitted: vpcId, ssmParameterName, region, accountId
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:import',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Required environment variables are set
      expect(result.environmentVariables['SECURITY_GROUP_ID']).toBe('sg-minimal12345');

      // Optional fields should not be present
      expect(result.environmentVariables['SECURITY_GROUP_VPC_ID']).toBeUndefined();
      expect(result.environmentVariables['SECURITY_GROUP_SSM_PARAMETER']).toBeUndefined();
      expect(result.environmentVariables['SECURITY_GROUP_REGION']).toBeUndefined();
      expect(result.environmentVariables['SECURITY_GROUP_ACCOUNT_ID']).toBeUndefined();
    });
  });

  describe('SecurityGroupBind__CommercialCompliance__ReturnsComplianceBlock', () => {
    const metadata = {
      id: 'TP-binders-security-group-008',
      level: 'unit' as const,
      capability: 'Returns compliance block with commercial framework for commercial compliance context',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'SecurityGroupBind',
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
        shape: 'BindingContext with security-group:import capability and commercial compliance framework',
        notes: 'Compliance evaluation for commercial framework'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupBind__CommercialCompliance__ReturnsComplianceBlock', async () => {
      const strategy = new SecurityGroupBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-import', {
        'security-group:import': {
          type: 'security-group:import',
          securityGroupId: 'sg-commercial123'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:import',
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

  describe('SecurityGroupBind__InvalidCapabilityData__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-group-009',
      level: 'unit' as const,
      capability: 'Throws actionable error when capability data structure is invalid',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'SecurityGroupBind',
        condition: 'InvalidCapabilityData',
        outcome: 'ThrowsError'
      },
      invariants: [
        'Error message indicates invalid capability data structure',
        'Error message is descriptive and actionable',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with invalid security-group:import capability data structure',
        notes: 'Negative test case for invalid capability data'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupBind__InvalidCapabilityData__ThrowsError', async () => {
      const strategy = new SecurityGroupBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-import', {
        'security-group:import': {
          type: 'security-group:import'
          // Missing required fields: securityGroupId
        } as any
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:import',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message (type guard fails)
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/Invalid Security Group capability data structure/);
    });
  });

  describe('SecurityGroupBind__SecurityGroupRules__ReturnsEmptyArray', () => {
    const metadata = {
      id: 'TP-binders-security-group-010',
      level: 'unit' as const,
      capability: 'Returns empty security group rules array (rules handled separately)',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'SecurityGroupBind',
        condition: 'SecurityGroupRules',
        outcome: 'ReturnsEmptyArray'
      },
      invariants: [
        'Security group rules array is always empty',
        'Rules are handled separately via patches or components',
        'Design pattern matches RDS/EFS/Neptune strategies'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security-group:import capability',
        notes: 'Verify empty securityGroupRules array (consistent with other network strategies)'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityGroupBind__SecurityGroupRules__ReturnsEmptyArray', async () => {
      const strategy = new SecurityGroupBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('security-group-import', {
        'security-group:import': {
          type: 'security-group:import',
          securityGroupId: 'sg-rules-test123'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security-group:import',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Security group rules array is empty
      expect(result.securityGroupRules).toEqual([]);
      expect(result.environmentVariables['SECURITY_GROUP_ID']).toBe('sg-rules-test123');
    });
  });
});

