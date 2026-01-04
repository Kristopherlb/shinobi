/**
 * Directive Schema Validator Tests
 * 
 * Tests for directive schema validation following Platform Testing Standard v1.0
 */

import { DirectiveSchemaValidator, DirectiveValidationError } from '../directive-schema-validator.js';
import type { BindingDirective } from '../platform-binding-trigger-spec.js';

describe('DirectiveSchemaValidator', () => {
  describe('DirectiveValidation__ValidOptions__PassesValidation', () => {
    const metadata = {
      id: 'TP-directive-validator-001',
      level: 'unit' as const,
      capability: 'Valid directive options pass validation',
      oracle: 'exact' as const,
      invariants: [
        'Valid options according to schema pass validation',
        'Directive is frozen after validation',
        'No errors thrown for valid input'
      ],
      fixtures: ['DirectiveSchemaValidator', 'BindingDirective'],
      inputs: {
        shape: 'BindingDirective with valid options for security-group:rule',
        notes: 'Tests basic validation success'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DirectiveValidation__ValidOptions__PassesValidation', () => {
      const directive: BindingDirective = {
        capability: 'security-group:rule',
        access: 'read',
        to: 'target-service',
        options: {
          rules: [
            {
              ruleType: 'ingress',
              peer: { kind: 'sg', id: 'sg-123456' },
              port: { from: 443, to: 443, protocol: 'tcp' },
              description: 'Allow HTTPS'
            }
          ]
        }
      };

      const validated = DirectiveSchemaValidator.validate(directive, 'security-group:rule');

      // Should not throw
      expect(validated).toBeDefined();
      expect(validated.options).toBeDefined();
      expect(validated.options?.rules).toBeDefined();
      
      // Directive should be frozen
      expect(() => {
        (validated as any).newProperty = 'test';
      }).toThrow();
    });
  });

  describe('DirectiveValidation__InvalidOptions__ThrowsError', () => {
    const metadata = {
      id: 'TP-directive-validator-002',
      level: 'unit' as const,
      capability: 'Invalid directive options throw validation error',
      oracle: 'exact' as const,
      invariants: [
        'Invalid options according to schema throw DirectiveValidationError',
        'Error contains path and message for each validation failure',
        'Unknown keys in options are rejected'
      ],
      fixtures: ['DirectiveSchemaValidator', 'BindingDirective'],
      inputs: {
        shape: 'BindingDirective with invalid options',
        notes: 'Tests validation failure scenarios'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DirectiveValidation__InvalidOptions__ThrowsError', () => {
      const directive: BindingDirective = {
        capability: 'security-group:rule',
        access: 'read',
        to: 'target-service',
        options: {
          rules: [
            {
              ruleType: 'invalid-type', // Invalid enum value
              peer: { kind: 'sg', id: 'sg-123456' },
              port: { from: 443, to: 443, protocol: 'tcp' }
            }
          ]
        }
      };

      expect(() => {
        DirectiveSchemaValidator.validate(directive, 'security-group:rule');
      }).toThrow(DirectiveValidationError);
    });

    test('DirectiveValidation__UnknownKeys__ThrowsError', () => {
      const directive: BindingDirective = {
        capability: 'security-group:rule',
        access: 'read',
        to: 'target-service',
        options: {
          unknownKey: 'value', // Unknown key should be rejected
          rules: [
            {
              ruleType: 'ingress',
              peer: { kind: 'sg', id: 'sg-123456' },
              port: { from: 443, to: 443, protocol: 'tcp' }
            }
          ]
        }
      };

      expect(() => {
        DirectiveSchemaValidator.validate(directive, 'security-group:rule');
      }).toThrow(DirectiveValidationError);

      try {
        DirectiveSchemaValidator.validate(directive, 'security-group:rule');
      } catch (error: any) {
        expect(error.name).toBe('DirectiveValidationError');
        expect(error.errors).toBeDefined();
        expect(error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('DirectiveValidation__SensitiveEnvVars__Blocked', () => {
    const metadata = {
      id: 'TP-directive-validator-003',
      level: 'unit' as const,
      capability: 'Sensitive environment variables are blocked',
      oracle: 'exact' as const,
      invariants: [
        'PATH, LD_LIBRARY_PATH, AWS_ACCESS_KEY_ID etc. are blocked',
        'Error message indicates security reason',
        'Blocked vars cannot be set via directive.env'
      ],
      fixtures: ['DirectiveSchemaValidator', 'BindingDirective'],
      inputs: {
        shape: 'BindingDirective with sensitive env vars',
        notes: 'Tests security blocking of sensitive env vars'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DirectiveValidation__SensitiveEnvVars__Blocked', () => {
      const sensitiveVars = ['PATH', 'LD_LIBRARY_PATH', 'AWS_ACCESS_KEY_ID', 'HOME', 'USER'];

      for (const varName of sensitiveVars) {
        const directive: BindingDirective = {
          capability: 's3:bucket',
          access: 'read',
          to: 'target-service',
          env: {
            [varName]: 'malicious-value'
          }
        };

        expect(() => {
          DirectiveSchemaValidator.validate(directive, 's3:bucket');
        }).toThrow(DirectiveValidationError);

        try {
          DirectiveSchemaValidator.validate(directive, 's3:bucket');
        } catch (error: any) {
          expect(error.name).toBe('DirectiveValidationError');
          expect(error.errors.some((e: any) => e.path.includes(varName))).toBe(true);
          expect(error.errors.some((e: any) => e.message.includes('blocked for security'))).toBe(true);
        }
      }
    });
  });

  describe('DirectiveValidation__EnvAllowList__Enforced', () => {
    const metadata = {
      id: 'TP-directive-validator-004',
      level: 'unit' as const,
      capability: 'Environment variable allow-list is enforced',
      oracle: 'exact' as const,
      invariants: [
        'Env vars not in allow-list are rejected',
        'Env vars in allow-list are accepted',
        'Error message lists allowed variables'
      ],
      fixtures: ['DirectiveSchemaValidator', 'BindingDirective'],
      inputs: {
        shape: 'BindingDirective with env vars',
        notes: 'Tests env var allow-list enforcement'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DirectiveValidation__EnvAllowList__Enforced', () => {
      // Test with allowed env var
      const directiveAllowed: BindingDirective = {
        capability: 's3:bucket',
        access: 'read',
        to: 'target-service',
        env: {
          'S3_BUCKET_NAME': 'my-bucket'
        }
      };

      const validated = DirectiveSchemaValidator.validate(directiveAllowed, 's3:bucket');
      expect(validated).toBeDefined();
      expect(validated.env?.['S3_BUCKET_NAME']).toBe('my-bucket');

      // Test with disallowed env var
      const directiveDisallowed: BindingDirective = {
        capability: 's3:bucket',
        access: 'read',
        to: 'target-service',
        env: {
          'CUSTOM_ENV_VAR': 'value' // Not in allow-list
        }
      };

      expect(() => {
        DirectiveSchemaValidator.validate(directiveDisallowed, 's3:bucket');
      }).toThrow(DirectiveValidationError);

      try {
        DirectiveSchemaValidator.validate(directiveDisallowed, 's3:bucket');
      } catch (error: any) {
        expect(error.name).toBe('DirectiveValidationError');
        expect(error.errors.some((e: any) => e.path.includes('CUSTOM_ENV_VAR'))).toBe(true);
        expect(error.errors.some((e: any) => e.message.includes('allow-list'))).toBe(true);
      }
    });
  });

  describe('DirectiveValidation__UnknownCapability__RejectsOptions', () => {
    const metadata = {
      id: 'TP-directive-validator-005',
      level: 'unit' as const,
      capability: 'Unknown capabilities reject all options',
      oracle: 'exact' as const,
      invariants: [
        'Capabilities without schemas reject all options',
        'Error message indicates unknown capability',
        'Empty options pass validation'
      ],
      fixtures: ['DirectiveSchemaValidator', 'BindingDirective'],
      inputs: {
        shape: 'BindingDirective with unknown capability',
        notes: 'Tests unknown capability handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DirectiveValidation__UnknownCapability__RejectsOptions', () => {
      const directive: BindingDirective = {
        capability: 'unknown:capability',
        access: 'read',
        to: 'target-service',
        options: {
          someOption: 'value' // Should be rejected
        }
      };

      expect(() => {
        DirectiveSchemaValidator.validate(directive, 'unknown:capability');
      }).toThrow(DirectiveValidationError);

      try {
        DirectiveSchemaValidator.validate(directive, 'unknown:capability');
      } catch (error: any) {
        expect(error.name).toBe('DirectiveValidationError');
        expect(error.errors.some((e: any) => e.message.includes('Unknown capability'))).toBe(true);
      }
    });

    test('DirectiveValidation__UnknownCapability__AllowsEmptyOptions', () => {
      const directive: BindingDirective = {
        capability: 'unknown:capability',
        access: 'read',
        to: 'target-service'
        // No options - should pass
      };

      const validated = DirectiveSchemaValidator.validate(directive, 'unknown:capability');
      expect(validated).toBeDefined();
    });
  });

  describe('DirectiveValidation__DeepFreeze__PreventsTampering', () => {
    const metadata = {
      id: 'TP-directive-validator-006',
      level: 'unit' as const,
      capability: 'Directive is deep frozen after validation',
      oracle: 'exact' as const,
      invariants: [
        'Directive object is frozen',
        'Nested objects are frozen',
        'Cannot modify directive after validation'
      ],
      fixtures: ['DirectiveSchemaValidator', 'BindingDirective'],
      inputs: {
        shape: 'BindingDirective with nested options',
        notes: 'Tests deep freeze functionality'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('DirectiveValidation__DeepFreeze__PreventsTampering', () => {
      const directive: BindingDirective = {
        capability: 'security-group:rule',
        access: 'read',
        to: 'target-service',
        options: {
          rules: [
            {
              ruleType: 'ingress',
              peer: { kind: 'sg', id: 'sg-123456' },
              port: { from: 443, to: 443, protocol: 'tcp' }
            }
          ]
        }
      };

      const validated = DirectiveSchemaValidator.validate(directive, 'security-group:rule');

      // Should be frozen
      expect(() => {
        (validated as any).newProperty = 'test';
      }).toThrow();

      // Nested objects should be frozen
      expect(() => {
        (validated.options as any).newProperty = 'test';
      }).toThrow();

      expect(() => {
        ((validated.options as any).rules[0] as any).newProperty = 'test';
      }).toThrow();
    });
  });
});

