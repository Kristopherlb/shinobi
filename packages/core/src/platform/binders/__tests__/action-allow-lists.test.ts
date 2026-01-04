/**
 * Action Allow-List Tests
 * 
 * Tests for action allow-list validation following Platform Testing Standard v1.0
 */

import {
  getActionAllowList,
  isActionAllowed,
  validateActionsAgainstAllowList,
  areCustomActionsAllowed,
  registerActionAllowList,
  clearAllowListCache
} from '../action-allow-lists.js';
import type { ComplianceFramework } from '../../contracts/bindings.js';

describe('ActionAllowLists', () => {
  beforeEach(() => {
    clearAllowListCache();
  });

  describe('ActionAllowList__GetAllowList__ReturnsList', () => {
    const metadata = {
      id: 'TP-action-allowlist-001',
      level: 'unit' as const,
      capability: 'Get action allow-list for service prefix',
      oracle: 'exact' as const,
      invariants: [
        'Returns allow-list if defined',
        'Returns undefined if not defined',
        'Loads from config file'
      ],
      fixtures: ['getActionAllowList'],
      inputs: {
        shape: 'Service prefix and framework',
        notes: 'Tests allow-list retrieval'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ActionAllowList__GetAllowList__ReturnsList', () => {
      // Register a test allow-list
      registerActionAllowList('test-service', 'commercial', [
        'test-service:Action1',
        'test-service:Action2'
      ]);

      const allowList = getActionAllowList('test-service', 'commercial');
      
      expect(allowList).toBeDefined();
      expect(Array.isArray(allowList)).toBe(true);
      expect(allowList?.length).toBe(2);
      expect(allowList).toContain('test-service:Action1');
      expect(allowList).toContain('test-service:Action2');
    });

    test('ActionAllowList__GetAllowList__ReturnsUndefinedIfNotDefined', () => {
      const allowList = getActionAllowList('unknown-service', 'commercial');
      expect(allowList).toBeUndefined();
    });
  });

  describe('ActionAllowList__IsActionAllowed__ValidatesActions', () => {
    const metadata = {
      id: 'TP-action-allowlist-002',
      level: 'unit' as const,
      capability: 'Check if action is allowed',
      oracle: 'exact' as const,
      invariants: [
        'Returns true if action is in allow-list',
        'Returns false if action is not in allow-list',
        'Returns true if no allow-list defined (backwards compatibility)'
      ],
      fixtures: ['isActionAllowed'],
      inputs: {
        shape: 'Action, service prefix, and framework',
        notes: 'Tests action validation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ActionAllowList__IsActionAllowed__ValidatesActions', () => {
      registerActionAllowList('test-service', 'commercial', [
        'test-service:AllowedAction'
      ]);

      expect(isActionAllowed('test-service:AllowedAction', 'test-service', 'commercial')).toBe(true);
      expect(isActionAllowed('test-service:DisallowedAction', 'test-service', 'commercial')).toBe(false);
    });

    test('ActionAllowList__IsActionAllowed__AllowsIfNoAllowList', () => {
      // No allow-list defined - should allow (backwards compatibility)
      expect(isActionAllowed('test-service:AnyAction', 'test-service', 'commercial')).toBe(true);
    });
  });

  describe('ActionAllowList__ValidateActions__ThrowsOnDisallowed', () => {
    const metadata = {
      id: 'TP-action-allowlist-003',
      level: 'unit' as const,
      capability: 'Validate actions against allow-list',
      oracle: 'exact' as const,
      invariants: [
        'Throws error if action not in allow-list',
        'Passes if all actions in allow-list',
        'Error message includes allowed actions'
      ],
      fixtures: ['validateActionsAgainstAllowList'],
      inputs: {
        shape: 'Actions array, service prefix, and framework',
        notes: 'Tests action validation with error throwing'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ActionAllowList__ValidateActions__ThrowsOnDisallowed', () => {
      registerActionAllowList('test-service', 'commercial', [
        'test-service:AllowedAction1',
        'test-service:AllowedAction2'
      ]);

      // Should pass with allowed actions
      expect(() => {
        validateActionsAgainstAllowList(
          ['test-service:AllowedAction1', 'test-service:AllowedAction2'],
          'test-service',
          'commercial'
        );
      }).not.toThrow();

      // Should throw with disallowed action
      expect(() => {
        validateActionsAgainstAllowList(
          ['test-service:DisallowedAction'],
          'test-service',
          'commercial'
        );
      }).toThrow();

      try {
        validateActionsAgainstAllowList(
          ['test-service:DisallowedAction'],
          'test-service',
          'commercial'
        );
      } catch (error: any) {
        expect(error.message).toContain('not allowed');
        expect(error.message).toContain('test-service:DisallowedAction');
        expect(error.message).toContain('Allowed actions');
      }
    });
  });

  describe('ActionAllowList__CustomActionsAllowed__FrameworkSpecific', () => {
    const metadata = {
      id: 'TP-action-allowlist-004',
      level: 'unit' as const,
      capability: 'Check if custom actions allowed in framework',
      oracle: 'exact' as const,
      invariants: [
        'Custom actions allowed in commercial framework',
        'Custom actions rejected in fedramp-moderate',
        'Custom actions rejected in fedramp-high'
      ],
      fixtures: ['areCustomActionsAllowed'],
      inputs: {
        shape: 'Compliance framework',
        notes: 'Tests framework-specific custom action restrictions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/security/binder-security-hardening-plan.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ActionAllowList__CustomActionsAllowed__FrameworkSpecific', () => {
      expect(areCustomActionsAllowed('commercial')).toBe(true);
      expect(areCustomActionsAllowed('fedramp-moderate')).toBe(false);
      expect(areCustomActionsAllowed('fedramp-high')).toBe(false);
      expect(areCustomActionsAllowed('hipaa' as ComplianceFramework)).toBe(true);
    });
  });
});

