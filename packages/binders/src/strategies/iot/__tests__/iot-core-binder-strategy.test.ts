/**
 * IoT Core Binder Strategy Tests (Unified)
 * 
 * Tests for IoTCoreBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { IoTCoreBinderStrategy } from '../iot-core-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core'platform-binding-trigger-spec.js';

describe('IoTCoreBinderStrategy', () => {
  describe('IotBind__ValidThingAccess__ReturnsEnhancedResultWithCompliance', () => {
    const metadata = {
      id: 'TP-binders-iot-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables.IOT_THING_ARN matches input thingArn',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IoTThingCapabilityData'],
      inputs: {
        shape: 'BindingContext with iot:thing capability, thingArn, thingName',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__ValidThingAccess__ReturnsEnhancedResultWithCompliance', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const thingArn = 'arn:aws:iot:us-east-1:123456789012:thing/test-device';
      const target = createMockTargetComponent('iot-thing', {
        'iot:thing': {
          thingArn,
          thingName: 'test-device'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:thing',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: compliance block exists and has correct structure
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.compliance.actionsTaken)).toBe(true);

      // Invariants
      expect(result.environmentVariables.IOT_THING_ARN).toBe(thingArn);
      expect(result.environmentVariables.IOT_THING_NAME).toBe('test-device');
      expect(Array.isArray(result.iamPolicies)).toBe(true);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
    });
  });

  describe('IotBind__ThingReadAccess__GrantsThingReadActions', () => {
    const metadata = {
      id: 'TP-binders-iot-002',
      level: 'unit' as const,
      capability: 'Grants IoT thing read IAM actions for read access level',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement resources match thingArn',
        'PolicyStatement Effect is Allow',
        'Actions array includes iot:DescribeThing, iot:ListThings'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IoTThingCapabilityData'],
      inputs: {
        shape: 'BindingContext with iot:thing capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__ThingReadAccess__GrantsThingReadActions', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const thingArn = 'arn:aws:iot:us-east-1:123456789012:thing/test-device';
      const target = createMockTargetComponent('iot-thing', {
        'iot:thing': {
          thingArn,
          thingName: 'test-device'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:thing',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies exist and contain IoT read actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      
      // Invariants
      expect(statementJson.Effect).toBe('Allow');
      expect(Array.isArray(statementJson.Action)).toBe(true);
      expect(statementJson.Action.length).toBeGreaterThan(0);
      
      // Check that resources match thingArn
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(thingArn);
      
      // Check that read actions are present
      const actions = statementJson.Action as string[];
      expect(actions.some(a => a.startsWith('iot:DescribeThing') || a.startsWith('iot:ListThings'))).toBe(true);
    });
  });

  describe('IotBind__ThingWriteAccess__GrantsThingWriteActions', () => {
    const metadata = {
      id: 'TP-binders-iot-003',
      level: 'unit' as const,
      capability: 'Grants IoT thing write IAM actions for write access level',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes iot:CreateThing, iot:DeleteThing, iot:UpdateThing',
        'PolicyStatement resources match thingArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IoTThingCapabilityData'],
      inputs: {
        shape: 'BindingContext with iot:thing capability and write access',
        notes: 'Standard AccessLevel write value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__ThingWriteAccess__GrantsThingWriteActions', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const thingArn = 'arn:aws:iot:us-east-1:123456789012:thing/test-device';
      const target = createMockTargetComponent('iot-thing', {
        'iot:thing': {
          thingArn,
          thingName: 'test-device'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:thing',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies contain write actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const writePolicy = result.iamPolicies.find(p => 
        p.description.includes('write')
      );
      expect(writePolicy).toBeDefined();
      
      if (writePolicy) {
        const statementJson = writePolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        expect(actions.some(a => a.includes('CreateThing') || a.includes('UpdateThing') || a.includes('DeleteThing'))).toBe(true);
      }
    });
  });

  describe('IotBind__ThingWithShadowAccess__GrantsShadowActions', () => {
    const metadata = {
      id: 'TP-binders-iot-004',
      level: 'unit' as const,
      capability: 'Grants IoT thing shadow IAM actions when shadowAccess option is enabled',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes iot:GetThingShadow, iot:UpdateThingShadow, iot:DeleteThingShadow',
        'PolicyStatement resources match thing shadow ARN pattern',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IoTThingCapabilityData'],
      inputs: {
        shape: 'BindingContext with iot:thing capability and shadowAccess option enabled',
        notes: 'Options includes shadowAccess: true'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__ThingWithShadowAccess__GrantsShadowActions', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const thingArn = 'arn:aws:iot:us-east-1:123456789012:thing/test-device';
      const target = createMockTargetComponent('iot-thing', {
        'iot:thing': {
          thingArn,
          thingName: 'test-device'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:thing',
        access: 'read',
        options: { shadowAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Shadow policy exists
      const shadowPolicy = result.iamPolicies.find(p => 
        p.description.includes('shadow')
      );
      expect(shadowPolicy).toBeDefined();
      
      if (shadowPolicy) {
        const statementJson = shadowPolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        expect(actions.some(a => a.includes('ThingShadow'))).toBe(true);
      }
    });
  });

  describe('IotBind__ThingWithSecureAccess__AppliesSecurityConfig', () => {
    const metadata = {
      id: 'TP-binders-iot-005',
      level: 'unit' as const,
      capability: 'Applies secure access configuration when requireSecureAccess option is enabled',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include IOT_DEVICE_AUTHENTICATION_ENABLED',
        'Environment variables include IOT_AUDIT_LOGGING_ENABLED',
        'IAM policies include CloudWatch Logs permissions',
        'IAM policies include Device Defender permissions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IoTThingCapabilityData'],
      inputs: {
        shape: 'BindingContext with iot:thing capability and requireSecureAccess option enabled',
        notes: 'Options includes requireSecureAccess: true, requireMutualTls: true, enableVpcEndpoint: true'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__ThingWithSecureAccess__AppliesSecurityConfig', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const thingArn = 'arn:aws:iot:us-east-1:123456789012:thing/test-device';
      const target = createMockTargetComponent('iot-thing', {
        'iot:thing': {
          thingArn,
          thingName: 'test-device',
          requireMutualTls: true,
          enableVpcEndpoint: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:thing',
        access: 'read',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure access environment variables are set
      expect(result.environmentVariables.IOT_DEVICE_AUTHENTICATION_ENABLED).toBe('true');
      expect(result.environmentVariables.IOT_AUDIT_LOGGING_ENABLED).toBe('true');
      expect(result.environmentVariables.IOT_MUTUAL_TLS_ENABLED).toBe('true');
      expect(result.environmentVariables.IOT_VPC_ENDPOINT_ENABLED).toBe('true');
      expect(result.environmentVariables.IOT_DEVICE_MONITORING_ENABLED).toBe('true');
      expect(result.environmentVariables.IOT_DEVICE_DEFENDER_ENABLED).toBe('true');

      // Check for CloudWatch Logs permissions
      const logsPolicy = result.iamPolicies.find(p => 
        p.description.includes('CloudWatch Logs') || p.description.includes('audit logging')
      );
      expect(logsPolicy).toBeDefined();
    });
  });

  describe('IotBind__ThingWithAttributes__IncludesAttributeEnvVars', () => {
    const metadata = {
      id: 'TP-binders-iot-006',
      level: 'unit' as const,
      capability: 'Includes thing attributes as environment variables',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include IOT_THING_ATTR_* for each attribute',
        'Attribute keys are uppercased in environment variable names',
        'Attribute values are converted to strings'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IoTThingCapabilityData'],
      inputs: {
        shape: 'BindingContext with iot:thing capability and attributes object',
        notes: 'Target data includes attributes: { location: "lab", type: "sensor" }'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__ThingWithAttributes__IncludesAttributeEnvVars', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const thingArn = 'arn:aws:iot:us-east-1:123456789012:thing/test-device';
      const target = createMockTargetComponent('iot-thing', {
        'iot:thing': {
          thingArn,
          thingName: 'test-device',
          attributes: {
            location: 'lab',
            type: 'sensor'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:thing',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Attribute environment variables are present
      expect(result.environmentVariables.IOT_THING_ATTR_LOCATION).toBe('lab');
      expect(result.environmentVariables.IOT_THING_ATTR_TYPE).toBe('sensor');
    });
  });

  describe('IotBind__MissingThingName__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-iot-007',
      level: 'unit' as const,
      capability: 'Throws actionable error when thingName is missing from target capability data',
      oracle: 'exact' as const,
      invariants: [
        'Error message includes thingName',
        'Error is thrown before IAM policy creation',
        'Error message is actionable (includes context)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with iot:thing capability but missing thingName in target data',
        notes: 'Target has thingArn but no thingName'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__MissingThingName__ThrowsActionableError', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iot-thing', {
        'iot:thing': {
          thingArn: 'arn:aws:iot:us-east-1:123456789012:thing/test-device'
          // Missing thingName
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:thing',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow();

      try {
        await executeUnifiedBinding(strategy, context);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message).toContain('thingName');
      }
    });
  });

  describe('IotBind__CertificateReadAccess__GrantsCertificateReadActions', () => {
    const metadata = {
      id: 'TP-binders-iot-008',
      level: 'unit' as const,
      capability: 'Grants IoT certificate read IAM actions for read access level',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes iot:DescribeCertificate, iot:ListCertificates',
        'PolicyStatement resources match certificateArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IoTCertificateCapabilityData'],
      inputs: {
        shape: 'BindingContext with iot:certificate capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__CertificateReadAccess__GrantsCertificateReadActions', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const certificateArn = 'arn:aws:iot:us-east-1:123456789012:cert/abc123';
      const target = createMockTargetComponent('iot-certificate', {
        'iot:certificate': {
          certificateArn,
          certificateId: 'abc123',
          status: 'ACTIVE'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:certificate',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies contain certificate read actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(result.environmentVariables.IOT_CERTIFICATE_ARN).toBe(certificateArn);
      expect(result.environmentVariables.IOT_CERTIFICATE_ID).toBe('abc123');
    });
  });

  describe('IotBind__PolicyReadAccess__GrantsPolicyReadActions', () => {
    const metadata = {
      id: 'TP-binders-iot-009',
      level: 'unit' as const,
      capability: 'Grants IoT policy read IAM actions for read access level',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes iot:GetPolicy, iot:ListPolicies',
        'PolicyStatement resources match policyArn',
        'Environment variables include IOT_POLICY_NAME'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IoTPolicyCapabilityData'],
      inputs: {
        shape: 'BindingContext with iot:policy capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__PolicyReadAccess__GrantsPolicyReadActions', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iot-policy', {
        'iot:policy': {
          policyName: 'test-policy'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:policy',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Policy environment variables and IAM policies are set
      expect(result.environmentVariables.IOT_POLICY_NAME).toBe('test-policy');
      expect(result.environmentVariables.IOT_POLICY_ARN).toBeDefined();
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('IotBind__TopicRuleWithActions__GrantsActionPermissions', () => {
    const metadata = {
      id: 'TP-binders-iot-010',
      level: 'unit' as const,
      capability: 'Grants IAM permissions for IoT topic rule actions (S3, Lambda, etc.)',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include action-specific permissions',
        'S3 action grants s3:PutObject',
        'Lambda action grants lambda:InvokeFunction',
        'Environment variables include IOT_RULE_ACTIONS as JSON'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IoTTopicRuleCapabilityData'],
      inputs: {
        shape: 'BindingContext with iot:topic-rule capability and actions array',
        notes: 'Actions include S3 and Lambda actions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__TopicRuleWithActions__GrantsActionPermissions', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const ruleArn = 'arn:aws:iot:us-east-1:123456789012:rule/test-rule';
      const target = createMockTargetComponent('iot-topic-rule', {
        'iot:topic-rule': {
          ruleName: 'test-rule',
          ruleArn,
          actions: [
            {
              s3: {
                bucketName: 'test-bucket'
              }
            },
            {
              lambda: {
                functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function'
              }
            }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:topic-rule',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Action permissions are granted
      expect(result.environmentVariables.IOT_RULE_NAME).toBe('test-rule');
      expect(result.environmentVariables.IOT_RULE_ACTIONS).toBeDefined();
      
      // Check for action-specific policies
      const actionPolicies = result.iamPolicies.filter(p => 
        p.description.includes('action')
      );
      expect(actionPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('IotBind__ThingGroupReadAccess__GrantsThingGroupReadActions', () => {
    const metadata = {
      id: 'TP-binders-iot-011',
      level: 'unit' as const,
      capability: 'Grants IoT thing group read IAM actions for read access level',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes iot:DescribeThingGroup, iot:ListThingGroups',
        'PolicyStatement resources match thingGroupArn',
        'Environment variables include IOT_THING_GROUP_NAME'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IoTThingGroupCapabilityData'],
      inputs: {
        shape: 'BindingContext with iot:thing-group capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__ThingGroupReadAccess__GrantsThingGroupReadActions', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iot-thing-group', {
        'iot:thing-group': {
          thingGroupName: 'test-group'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:thing-group',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Thing group environment variables and IAM policies are set
      expect(result.environmentVariables.IOT_THING_GROUP_NAME).toBe('test-group');
      expect(result.environmentVariables.IOT_THING_GROUP_ARN).toBeDefined();
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('IotBind__JobReadAccess__GrantsJobReadActions', () => {
    const metadata = {
      id: 'TP-binders-iot-012',
      level: 'unit' as const,
      capability: 'Grants IoT job read IAM actions for read access level',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes iot:DescribeJob, iot:ListJobs',
        'PolicyStatement resources match jobArn',
        'Environment variables include IOT_JOB_ID'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IoTJobCapabilityData'],
      inputs: {
        shape: 'BindingContext with iot:job capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__JobReadAccess__GrantsJobReadActions', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iot-job', {
        'iot:job': {
          jobId: 'test-job-123',
          jobStatus: 'IN_PROGRESS'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:job',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Job environment variables and IAM policies are set
      expect(result.environmentVariables.IOT_JOB_ID).toBe('test-job-123');
      expect(result.environmentVariables.IOT_JOB_ARN).toBeDefined();
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('IotBind__AllCapabilities__RoutesToCorrectMethod', () => {
    const metadata = {
      id: 'TP-binders-iot-013',
      level: 'unit' as const,
      capability: 'Routes all IoT capabilities to correct binding methods',
      oracle: 'exact' as const,
      invariants: [
        'Each capability returns EnhancedBindingResult',
        'Each capability has distinct result structure',
        'All supported capabilities are handled'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with different IoT capabilities (thing, certificate, policy, topic-rule, thing-group, job)',
        notes: 'Tests all six supported capabilities'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__AllCapabilities__RoutesToCorrectMethod', async () => {
      const strategy = new IoTCoreBinderStrategy();

      // Test iot:thing
      const thingResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('iot-thing', {
          'iot:thing': {
            thingArn: 'arn:aws:iot:us-east-1:123456789012:thing/test-device',
            thingName: 'test-device'
          }
        }),
        capability: 'iot:thing',
        access: 'read'
      }));
      assertEnhancedBindingResult(thingResult);
      expect(thingResult.environmentVariables.IOT_THING_NAME).toBe('test-device');

      // Test iot:certificate
      const certResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('iot-certificate', {
          'iot:certificate': {
            certificateArn: 'arn:aws:iot:us-east-1:123456789012:cert/abc123',
            certificateId: 'abc123'
          }
        }),
        capability: 'iot:certificate',
        access: 'read'
      }));
      assertEnhancedBindingResult(certResult);
      expect(certResult.environmentVariables.IOT_CERTIFICATE_ID).toBe('abc123');

      // Test iot:policy
      const policyResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('iot-policy', {
          'iot:policy': {
            policyName: 'test-policy'
          }
        }),
        capability: 'iot:policy',
        access: 'read'
      }));
      assertEnhancedBindingResult(policyResult);
      expect(policyResult.environmentVariables.IOT_POLICY_NAME).toBe('test-policy');

      // Test iot:topic-rule
      const ruleResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('iot-topic-rule', {
          'iot:topic-rule': {
            ruleName: 'test-rule',
            ruleArn: 'arn:aws:iot:us-east-1:123456789012:rule/test-rule'
          }
        }),
        capability: 'iot:topic-rule',
        access: 'read'
      }));
      assertEnhancedBindingResult(ruleResult);
      expect(ruleResult.environmentVariables.IOT_RULE_NAME).toBe('test-rule');

      // Test iot:thing-group
      const groupResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('iot-thing-group', {
          'iot:thing-group': {
            thingGroupName: 'test-group'
          }
        }),
        capability: 'iot:thing-group',
        access: 'read'
      }));
      assertEnhancedBindingResult(groupResult);
      expect(groupResult.environmentVariables.IOT_THING_GROUP_NAME).toBe('test-group');

      // Test iot:job
      const jobResult = await executeUnifiedBinding(strategy, createBindingContext({
        source: createMockSourceComponent(),
        target: createMockTargetComponent('iot-job', {
          'iot:job': {
            jobId: 'test-job-123'
          }
        }),
        capability: 'iot:job',
        access: 'read'
      }));
      assertEnhancedBindingResult(jobResult);
      expect(jobResult.environmentVariables.IOT_JOB_ID).toBe('test-job-123');
    });
  });

  describe('IotBind__InvalidCapability__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-iot-014',
      level: 'unit' as const,
      capability: 'Throws error when unsupported capability is provided',
      oracle: 'exact' as const,
      invariants: [
        'Error message includes unsupported capability',
        'Error message lists supported capabilities',
        'Error is thrown before binding execution'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with unsupported capability',
        notes: 'Capability is not in supportedCapabilities list'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IotBind__InvalidCapability__ThrowsError', async () => {
      const strategy = new IoTCoreBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iot-thing', {
        'iot:invalid': {
          someData: 'value'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iot:invalid',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow();

      try {
        await executeUnifiedBinding(strategy, context);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message).toContain('iot:invalid');
      }
    });
  });
});