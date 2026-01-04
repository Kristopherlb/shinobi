/**
 * Compliance Rules Tests
 * 
 * Tests for compliance rules loading and override restrictions
 */

import { loadComplianceRules } from '../rules.js';
import type { ComplianceFramework } from '../../bindings.js';
import type { ComplianceRulesConfig } from '../rules.js';

describe('loadComplianceRules', () => {
  describe('RulesOverride__AllowedInCommercial', () => {
    const metadata = {
      id: 'TP-compliance-rules-001',
      level: 'unit' as const,
      capability: 'Compliance rules override allowed in commercial framework',
      oracle: 'exact' as const,
      invariants: [
        'Override is returned when framework is commercial',
        'Override takes priority over config files'
      ],
      fixtures: ['loadComplianceRules'],
      inputs: {
        shape: 'Framework commercial with rulesOverride',
        notes: 'Tests override allowed in commercial'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RulesOverride__AllowedInCommercial', () => {
      const override: ComplianceRulesConfig = {
        testRule: {
          categories: ['all'],
          severity: 'error',
          description: 'Test override rule'
        }
      };

      const result = loadComplianceRules('commercial', undefined, override);

      // Override should be returned
      expect(result).toBe(override);
      expect(result.testRule).toBeDefined();
      expect(result.testRule.categories).toEqual(['all']);
    });
  });

  describe('RulesOverride__RejectedInFedrampModerate', () => {
    const metadata = {
      id: 'TP-compliance-rules-002',
      level: 'unit' as const,
      capability: 'Compliance rules override rejected in fedramp-moderate framework',
      oracle: 'exact' as const,
      invariants: [
        'Override throws error when framework is fedramp-moderate',
        'Error message indicates framework restriction'
      ],
      fixtures: ['loadComplianceRules'],
      inputs: {
        shape: 'Framework fedramp-moderate with rulesOverride',
        notes: 'Tests override rejected in fedramp-moderate'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RulesOverride__RejectedInFedrampModerate', () => {
      const override: ComplianceRulesConfig = {
        testRule: {
          categories: ['all'],
          severity: 'error'
        }
      };

      expect(() => {
        loadComplianceRules('fedramp-moderate', undefined, override);
      }).toThrow('Compliance rules override is not allowed in fedramp-moderate framework');

      try {
        loadComplianceRules('fedramp-moderate', undefined, override);
      } catch (error: any) {
        expect(error.message).toContain('fedramp-moderate');
        expect(error.message).toContain('commercial');
      }
    });
  });

  describe('RulesOverride__RejectedInFedrampHigh', () => {
    const metadata = {
      id: 'TP-compliance-rules-003',
      level: 'unit' as const,
      capability: 'Compliance rules override rejected in fedramp-high framework',
      oracle: 'exact' as const,
      invariants: [
        'Override throws error when framework is fedramp-high',
        'Error message indicates framework restriction'
      ],
      fixtures: ['loadComplianceRules'],
      inputs: {
        shape: 'Framework fedramp-high with rulesOverride',
        notes: 'Tests override rejected in fedramp-high'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RulesOverride__RejectedInFedrampHigh', () => {
      const override: ComplianceRulesConfig = {
        testRule: {
          categories: ['all'],
          severity: 'error'
        }
      };

      expect(() => {
        loadComplianceRules('fedramp-high', undefined, override);
      }).toThrow('Compliance rules override is not allowed in fedramp-high framework');

      try {
        loadComplianceRules('fedramp-high', undefined, override);
      } catch (error: any) {
        expect(error.message).toContain('fedramp-high');
        expect(error.message).toContain('commercial');
      }
    });
  });

  describe('RulesOverride__RejectedInHipaa', () => {
    const metadata = {
      id: 'TP-compliance-rules-004',
      level: 'unit' as const,
      capability: 'Compliance rules override rejected in hipaa framework',
      oracle: 'exact' as const,
      invariants: [
        'Override throws error when framework is hipaa',
        'Error message indicates framework restriction'
      ],
      fixtures: ['loadComplianceRules'],
      inputs: {
        shape: 'Framework hipaa with rulesOverride',
        notes: 'Tests override rejected in hipaa'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RulesOverride__RejectedInHipaa', () => {
      const override: ComplianceRulesConfig = {
        testRule: {
          categories: ['all'],
          severity: 'error'
        }
      };

      expect(() => {
        loadComplianceRules('hipaa' as ComplianceFramework, undefined, override);
      }).toThrow('Compliance rules override is not allowed in hipaa framework');
    });
  });

  describe('RulesOverride__NoOverrideReturnsConfig', () => {
    const metadata = {
      id: 'TP-compliance-rules-005',
      level: 'unit' as const,
      capability: 'When no override provided, config files are loaded',
      oracle: 'exact' as const,
      invariants: [
        'No override means config files are used',
        'Fallback rules used if config files not found'
      ],
      fixtures: ['loadComplianceRules'],
      inputs: {
        shape: 'Framework with no override',
        notes: 'Tests normal config loading path'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RulesOverride__NoOverrideReturnsConfig', () => {
      // No override provided - should load from config or use fallback
      const result = loadComplianceRules('commercial', undefined, undefined);

      // Should return rules (either from config or fallback)
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      // Fallback rules should include at least basic rules
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });
});

