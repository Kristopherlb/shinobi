/**
 * Resource Validator Tests
 * 
 * Tests for resource validation following Platform Testing Standard v1.0
 */

import {
  validateResources,
  validateResourcesForStatements,
  isSensitiveService,
  isOrgWideService,
  ResourceValidationError,
  getSensitiveServices,
  getOrgWideServices
} from '../resource-validator.js';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

describe('ResourceValidator', () => {
  describe('ResourceValidation__SensitiveServiceWildcard__ThrowsError', () => {
    const metadata = {
      id: 'TP-resource-validator-001',
      level: 'unit' as const,
      capability: 'Wildcard resources rejected for sensitive services',
      oracle: 'exact' as const,
      invariants: [
        'KMS wildcard resources throw ResourceValidationError',
        'S3 wildcard resources throw ResourceValidationError',
        'IAM wildcard resources throw ResourceValidationError',
        'Secrets Manager wildcard resources throw ResourceValidationError'
      ],
      fixtures: ['validateResources', 'PolicyStatement'],
      inputs: {
        shape: 'PolicyStatement with wildcard resources for sensitive services',
        notes: 'Tests wildcard rejection for sensitive services'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ResourceValidation__SensitiveServiceWildcard__ThrowsError', () => {
      const sensitiveServices = ['kms', 's3', 'iam', 'secretsmanager'];
      
      for (const service of sensitiveServices) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [`${service}:Action`],
          resources: ['*']
        });

        expect(() => {
          validateResources(statement, service);
        }).toThrow(ResourceValidationError);

        try {
          validateResources(statement, service);
        } catch (error: any) {
          expect(error.name).toBe('ResourceValidationError');
          expect(error.service).toBe(service);
          expect(error.message).toContain('not allowed for sensitive service');
          expect(error.message).toContain(service);
        }
      }
    });
  });

  describe('ResourceValidation__OrgWideServiceWildcard__Allowed', () => {
    const metadata = {
      id: 'TP-resource-validator-002',
      level: 'unit' as const,
      capability: 'Wildcard resources allowed for org-wide services',
      oracle: 'exact' as const,
      invariants: [
        'Organizations wildcard resources are allowed',
        'CloudTrail wildcard resources are allowed',
        'Config wildcard resources are allowed'
      ],
      fixtures: ['validateResources', 'PolicyStatement'],
      inputs: {
        shape: 'PolicyStatement with wildcard resources for org-wide services',
        notes: 'Tests wildcard allowance for org-wide services'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ResourceValidation__OrgWideServiceWildcard__Allowed', () => {
      const orgWideServices = ['organizations', 'cloudtrail', 'config'];
      
      for (const service of orgWideServices) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [`${service}:Action`],
          resources: ['*']
        });

        // Should not throw
        expect(() => {
          validateResources(statement, service);
        }).not.toThrow();
      }
    });
  });

  describe('ResourceValidation__ExplicitArn__Passes', () => {
    const metadata = {
      id: 'TP-resource-validator-003',
      level: 'unit' as const,
      capability: 'Explicit ARNs pass validation',
      oracle: 'exact' as const,
      invariants: [
        'Explicit ARNs pass validation for sensitive services',
        'No errors thrown for valid ARNs'
      ],
      fixtures: ['validateResources', 'PolicyStatement'],
      inputs: {
        shape: 'PolicyStatement with explicit ARNs',
        notes: 'Tests explicit ARN validation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ResourceValidation__ExplicitArn__Passes', () => {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt'],
        resources: ['arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012']
      });

      // Should not throw
      expect(() => {
        validateResources(statement, 'kms');
      }).not.toThrow();
    });
  });

  describe('ResourceValidation__IsSensitiveService__ReturnsCorrect', () => {
    const metadata = {
      id: 'TP-resource-validator-004',
      level: 'unit' as const,
      capability: 'Check if service is sensitive',
      oracle: 'exact' as const,
      invariants: [
        'KMS is sensitive',
        'S3 is sensitive',
        'IAM is sensitive',
        'Organizations is not sensitive'
      ],
      fixtures: ['isSensitiveService'],
      inputs: {
        shape: 'Service prefix string',
        notes: 'Tests sensitive service detection'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ResourceValidation__IsSensitiveService__ReturnsCorrect', () => {
      expect(isSensitiveService('kms')).toBe(true);
      expect(isSensitiveService('s3')).toBe(true);
      expect(isSensitiveService('iam')).toBe(true);
      expect(isSensitiveService('secretsmanager')).toBe(true);
      expect(isSensitiveService('organizations')).toBe(false);
      expect(isSensitiveService('cloudtrail')).toBe(false);
    });
  });

  describe('ResourceValidation__IsOrgWideService__ReturnsCorrect', () => {
    const metadata = {
      id: 'TP-resource-validator-005',
      level: 'unit' as const,
      capability: 'Check if service is org-wide',
      oracle: 'exact' as const,
      invariants: [
        'Organizations is org-wide',
        'CloudTrail is org-wide',
        'KMS is not org-wide'
      ],
      fixtures: ['isOrgWideService'],
      inputs: {
        shape: 'Service prefix string',
        notes: 'Tests org-wide service detection'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ResourceValidation__IsOrgWideService__ReturnsCorrect', () => {
      expect(isOrgWideService('organizations')).toBe(true);
      expect(isOrgWideService('cloudtrail')).toBe(true);
      expect(isOrgWideService('config')).toBe(true);
      expect(isOrgWideService('kms')).toBe(false);
      expect(isOrgWideService('s3')).toBe(false);
    });
  });

  describe('ResourceValidation__ExtractServiceFromStatement__Works', () => {
    const metadata = {
      id: 'TP-resource-validator-006',
      level: 'unit' as const,
      capability: 'Extract service from statement actions',
      oracle: 'exact' as const,
      invariants: [
        'Service extracted from actions',
        'Validation uses extracted service',
        'Falls back to default if cannot extract'
      ],
      fixtures: ['validateResources', 'PolicyStatement'],
      inputs: {
        shape: 'PolicyStatement with actions',
        notes: 'Tests service extraction from statement'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ResourceValidation__ExtractServiceFromStatement__Works', () => {
      // Statement with KMS actions should extract 'kms' and reject wildcard
      const kmsStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt', 'kms:Encrypt'],
        resources: ['*']
      });

      expect(() => {
        validateResources(kmsStatement); // No default service - should extract from actions
      }).toThrow(ResourceValidationError);

      // Statement with Organizations actions should extract 'organizations' and allow wildcard
      const orgStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['organizations:DescribeOrganization'],
        resources: ['*']
      });

      expect(() => {
        validateResources(orgStatement);
      }).not.toThrow();
    });
  });
});

