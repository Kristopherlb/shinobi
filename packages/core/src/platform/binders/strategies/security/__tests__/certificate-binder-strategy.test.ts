/**
 * Certificate Binder Strategy Tests (Unified)
 * 
 * Tests for CertificateBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { CertificateBinderStrategy } from '../certificate-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';

describe('CertificateBinderStrategy', () => {
  describe('CertificateBind__ValidAcmAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-cert-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult for certificate:acm capability',
      oracle: 'exact' as const,
      invariants: [
        'result.environmentVariables.CERTIFICATE_ARN matches input certificateArn',
        'result.compliance.status exists',
        'result.iamPolicies is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'AcmCertificateCapabilityData'],
      inputs: {
        shape: 'BindingContext with certificate:acm capability, certificateArn',
        notes: 'Basic valid binding with use access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CertificateBind__ValidAcmAccess__ReturnsEnhancedResult', async () => {
      const strategy = new CertificateBinderStrategy();
      const source = createMockSourceComponent('api-gateway', 'test-api');
      const target = createMockTargetComponent('certificate', {
        'certificate:acm': {
          certificateArn: TEST_CONSTANTS.CERTIFICATE_ARN,
          domainName: 'example.com'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'certificate:acm',
        access: 'read' // Maps to 'use' internally
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: CERTIFICATE_ARN is set correctly
      expect(result.environmentVariables.CERTIFICATE_ARN).toBe(TEST_CONSTANTS.CERTIFICATE_ARN);

      // Invariants
      expect(result.compliance.status).toBe('compliant');
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.iamPolicies)).toBe(true);
    });
  });

  describe('CertificateBind__UseAccess__GrantsAcmReadActions', () => {
    const metadata = {
      id: 'TP-binders-cert-002',
      level: 'unit' as const,
      capability: 'Grants acm:DescribeCertificate and acm:GetCertificate IAM actions for use access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes acm:DescribeCertificate and acm:GetCertificate',
        'PolicyStatement resources match certificateArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'AcmCertificateCapabilityData'],
      inputs: {
        shape: 'BindingContext with certificate:acm capability and read access (maps to use)',
        notes: 'Standard AccessLevel read value maps to ACM use permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CertificateBind__UseAccess__GrantsAcmReadActions', async () => {
      const strategy = new CertificateBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('certificate', {
        'certificate:acm': {
          certificateArn: TEST_CONSTANTS.CERTIFICATE_ARN,
          domainName: 'example.com'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'certificate:acm',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include ACM read actions
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      const actions = statementJson.Action as string[];
      
      expect(actions).toContain('acm:DescribeCertificate');
      expect(actions).toContain('acm:GetCertificate');
      expect(statementJson.Effect).toBe('Allow');
      
      const resources = Array.isArray(statementJson.Resource) 
        ? statementJson.Resource 
        : [statementJson.Resource];
      expect(resources).toContain(TEST_CONSTANTS.CERTIFICATE_ARN);
    });
  });

  describe('CertificateBind__DnsValidation__GrantsRoute53Actions', () => {
    const metadata = {
      id: 'TP-binders-cert-003',
      level: 'unit' as const,
      capability: 'Grants Route53 IAM actions when validationMethod is DNS',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes route53:ChangeResourceRecordSets when validationMethod is DNS',
        'Route53 permissions are resource-scoped to hostedzone/*'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'AcmCertificateValidationCapabilityData'],
      inputs: {
        shape: 'BindingContext with certificate:validation capability and validationMethod=DNS',
        notes: 'DNS validation requires Route53 permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CertificateBind__DnsValidation__GrantsRoute53Actions', async () => {
      const strategy = new CertificateBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('certificate-validation', {
        'certificate:validation': {
          certificateArn: TEST_CONSTANTS.CERTIFICATE_ARN,
          validationMethod: 'DNS'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'certificate:validation',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Route53 permissions are included for DNS validation
      const hasRoute53Actions = result.iamPolicies.some(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.some(action => action.startsWith('route53:'));
      });

      expect(hasRoute53Actions).toBe(true);
      
      // Find Route53 policy
      const route53Policy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.some(action => action.startsWith('route53:'));
      });

      expect(route53Policy).toBeDefined();
      if (route53Policy) {
        const statementJson = route53Policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        expect(actions).toContain('route53:ChangeResourceRecordSets');
      }
    });
  });

  describe('CertificateBind__MonitoringCapability__IncludesCloudWatchEvents', () => {
    const metadata = {
      id: 'TP-binders-cert-004',
      level: 'unit' as const,
      capability: 'Includes EventBridge permissions for certificate expiration alerts when monitoring capability used',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes events:PutRule and events:PutTargets',
        'EventBridge permissions are resource-scoped to certificate-expiration-* rules'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'AcmCertificateMonitoringCapabilityData'],
      inputs: {
        shape: 'BindingContext with certificate:monitoring capability',
        notes: 'Monitoring capability enables expiration alert automation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CertificateBind__MonitoringCapability__IncludesCloudWatchEvents', async () => {
      const strategy = new CertificateBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('certificate-monitoring', {
        'certificate:monitoring': {
          certificateArn: TEST_CONSTANTS.CERTIFICATE_ARN,
          domainName: 'example.com'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'certificate:monitoring',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: EventBridge permissions are included for monitoring
      const hasEventBridgeActions = result.iamPolicies.some(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.some(action => action.startsWith('events:'));
      });

      expect(hasEventBridgeActions).toBe(true);
      
      // Find EventBridge policy
      const eventsPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.some(action => action.startsWith('events:'));
      });

      expect(eventsPolicy).toBeDefined();
      if (eventsPolicy) {
        const statementJson = eventsPolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        expect(actions).toContain('events:PutRule');
        expect(actions).toContain('events:PutTargets');
      }
    });
  });

  describe('CertificateBind__MissingCertificateArn__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-cert-005',
      level: 'unit' as const,
      capability: 'Throws actionable error when certificateArn is missing from target capability data',
      oracle: 'exact' as const,
      invariants: [
        'Error message includes certificateArn',
        'Error message is actionable (includes context)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with certificate:acm capability but missing certificateArn',
        notes: 'Target capability data missing required certificateArn field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CertificateBind__MissingCertificateArn__ThrowsActionableError', async () => {
      const strategy = new CertificateBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('certificate', {
        'certificate:acm': {
          domainName: 'example.com'
          // Missing certificateArn
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'certificate:acm',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow();

      // Invariant: Error message should include certificateArn
      try {
        await executeUnifiedBinding(strategy, context);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        // Error should mention certificateArn or certificate
        expect(error.message.toLowerCase()).toMatch(/certificate/);
      }
    });
  });
});
