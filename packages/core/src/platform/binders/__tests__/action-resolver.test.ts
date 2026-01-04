/**
 * Tests for action resolver utility
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { BindingDirective, BindingContext } from '../../contracts/platform-binding-trigger-spec.js';
import type { ComplianceFramework } from '../../contracts/bindings.js';

// Mock the action-profiles module before importing resolveActions
const mockResolveActionProfile = jest.fn();
jest.mock('../action-profiles.js', () => ({
  loadActionProfiles: jest.fn(),
  resolveActionProfile: (profileName: string, framework: ComplianceFramework) => mockResolveActionProfile(profileName, framework)
}));

// Import after mock
import { resolveActions } from '../action-resolver.js';

describe('resolveActions', () => {
  const mockContext: BindingContext = {
    directive: {
      capability: 'messaging:sqs',
      access: 'readwrite'
    } as BindingDirective,
    source: {} as any,
    target: {} as any,
    complianceFramework: 'commercial'
  };

  const mockGetActionsForAccess = jest.fn((access: string): string[] => {
    switch (access) {
      case 'read':
        return ['sqs:ReceiveMessage', 'sqs:DeleteMessage'];
      case 'write':
        return ['sqs:SendMessage'];
      case 'readwrite':
        return ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:SendMessage'];
      default:
        return [];
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock behavior
    mockResolveActionProfile.mockImplementation((profileName: string, framework: ComplianceFramework) => {
      const profiles: Record<string, Record<string, string[]>> = {
        commercial: {
          'sqs-consumer': ['sqs:ReceiveMessage', 'sqs:DeleteMessage'],
          'lambda-async-invoke': ['lambda:InvokeFunction']
        },
        'fedramp-moderate': {
          'sqs-consumer': ['sqs:ReceiveMessage', 'sqs:DeleteMessage']
        }
      };
      return profiles[framework]?.[profileName];
    });
  });

  describe('backward compatibility - coarse access levels', () => {
    it('should return coarse actions when actions field is not provided', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'read'
      } as BindingDirective;

      const result = resolveActions(
        directive,
        { ...mockContext, directive },
        mockGetActionsForAccess,
        'sqs'
      );

      expect(result).toEqual(['sqs:ReceiveMessage', 'sqs:DeleteMessage']);
      expect(mockGetActionsForAccess).toHaveBeenCalledWith('read');
    });

    it('should handle readwrite access level', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'readwrite'
      } as BindingDirective;

      const result = resolveActions(
        directive,
        { ...mockContext, directive },
        mockGetActionsForAccess,
        'sqs'
      );

      expect(result).toEqual(['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:SendMessage']);
    });
  });

  describe('granular actions override - array syntax', () => {
    it('should replace coarse actions with explicit actions array', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'readwrite',
        actions: ['sqs:ReceiveMessage', 'sqs:GetQueueAttributes']
      } as BindingDirective;

      const result = resolveActions(
        directive,
        { ...mockContext, directive },
        mockGetActionsForAccess,
        'sqs'
      );

      expect(result).toEqual(['sqs:ReceiveMessage', 'sqs:GetQueueAttributes']);
      expect(mockGetActionsForAccess).not.toHaveBeenCalled();
    });

    it('should handle single action in array', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'read',
        actions: ['sqs:ReceiveMessage']
      } as BindingDirective;

      const result = resolveActions(
        directive,
        { ...mockContext, directive },
        mockGetActionsForAccess,
        'sqs'
      );

      expect(result).toEqual(['sqs:ReceiveMessage']);
    });
  });

  describe('granular actions override - profile syntax', () => {
    it('should resolve action profile name to actions array', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'readwrite',
        actions: 'sqs-consumer'
      } as BindingDirective;

      const result = resolveActions(
        directive,
        { ...mockContext, directive },
        mockGetActionsForAccess,
        'sqs'
      );

      expect(result).toEqual(['sqs:ReceiveMessage', 'sqs:DeleteMessage']);
    });

    it('should throw error if profile not found', () => {
      mockResolveActionProfile.mockReturnValueOnce(undefined);
      
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'readwrite',
        actions: 'nonexistent-profile'
      } as BindingDirective;

      expect(() => {
        resolveActions(
          directive,
          { ...mockContext, directive },
          mockGetActionsForAccess,
          'sqs'
        );
      }).toThrow(/Action profile 'nonexistent-profile' not found/);
    });
  });

  describe('service prefix validation', () => {
    it('should reject actions with wrong service prefix', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'read',
        actions: ['s3:GetObject'] // Wrong prefix
      } as BindingDirective;

      expect(() => {
        resolveActions(
          directive,
          { ...mockContext, directive },
          mockGetActionsForAccess,
          'sqs'
        );
      }).toThrow(/Actions must match service prefix 'sqs:'/);
    });

    it('should accept actions with correct service prefix', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'read',
        actions: ['sqs:ReceiveMessage', 'sqs:DeleteMessage']
      } as BindingDirective;

      const result = resolveActions(
        directive,
        { ...mockContext, directive },
        mockGetActionsForAccess,
        'sqs'
      );

      expect(result).toEqual(['sqs:ReceiveMessage', 'sqs:DeleteMessage']);
    });
  });

  describe('empty actions array rejection', () => {
    it('should reject empty actions array', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'read',
        actions: []
      } as BindingDirective;

      expect(() => {
        resolveActions(
          directive,
          { ...mockContext, directive },
          mockGetActionsForAccess,
          'sqs'
        );
      }).toThrow(/Actions array cannot be empty/);
    });
  });

  describe('wildcard action validation', () => {
    it('should reject wildcard actions in fedramp-moderate framework', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'read',
        actions: ['sqs:*']
      } as BindingDirective;

      const context: BindingContext = {
        ...mockContext,
        directive,
        complianceFramework: 'fedramp-moderate'
      };

      expect(() => {
        resolveActions(directive, context, mockGetActionsForAccess, 'sqs');
      }).toThrow(/Wildcard actions are not allowed in fedramp-moderate framework/);
    });

    it('should reject wildcard actions in fedramp-high framework', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'read',
        actions: ['*:*']
      } as BindingDirective;

      const context: BindingContext = {
        ...mockContext,
        directive,
        complianceFramework: 'fedramp-high'
      };

      expect(() => {
        resolveActions(directive, context, mockGetActionsForAccess, 'sqs');
      }).toThrow(/Wildcard actions are not allowed in fedramp-high framework/);
    });

    it('should warn but allow wildcard actions in commercial framework', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'read',
        actions: ['sqs:*']
      } as BindingDirective;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = resolveActions(
        directive,
        { ...mockContext, directive },
        mockGetActionsForAccess,
        'sqs'
      );

      expect(result).toEqual(['sqs:*']);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Wildcard actions detected')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('framework boundary enforcement', () => {
    it('should use framework-specific profiles', () => {
      const directive: BindingDirective = {
        capability: 'messaging:sqs',
        access: 'readwrite',
        actions: 'sqs-consumer'
      } as BindingDirective;

      const context: BindingContext = {
        ...mockContext,
        directive,
        complianceFramework: 'fedramp-moderate'
      };

      const result = resolveActions(directive, context, mockGetActionsForAccess, 'sqs');
      
      // Should resolve from fedramp-moderate profile
      expect(result).toEqual(['sqs:ReceiveMessage', 'sqs:DeleteMessage']);
    });
  });
});

