/**
 * Action Resolver Utility
 * 
 * Resolves IAM actions from binding directives, supporting both coarse access levels
 * and granular action overrides (via actions field).
 * 
 * Features:
 * - Resolves action profiles (shorthand syntax: 'sqs-consumer')
 * - Validates service prefix matching
 * - Enforces wildcard action rejection in production frameworks
 * - Falls back to coarse access level actions when actions field not provided
 */

import type { BindingDirective, BindingContext } from '../contracts/platform-binding-trigger-spec.js';
import type { ComplianceFramework } from '../contracts/bindings.js';
import { resolveActionProfile } from './action-profiles.js';
import {
  validateActionsAgainstAllowList,
  areCustomActionsAllowed
} from './action-allow-lists.js';

/**
 * Check if an action string contains wildcard patterns
 * @param action - IAM action string (e.g., 'sqs:*', '*:*', 'sqs:SendMessage')
 * @returns true if action contains wildcards
 */
function isWildcardAction(action: string): boolean {
  // Match patterns like: '*:*', 'service:*', '*:Action'
  return action.includes('*');
}

/**
 * Validate that all actions match the expected service prefix
 * @param actions - Array of IAM action strings
 * @param servicePrefix - Expected service prefix (e.g., 'sqs', 'lambda', 's3')
 * @throws Error if any action doesn't match the service prefix
 */
function validateServicePrefix(actions: string[], servicePrefix: string): void {
  const prefix = `${servicePrefix}:`;
  const mismatched = actions.filter(action => !action.startsWith(prefix));
  
  if (mismatched.length > 0) {
    throw new Error(
      `Actions must match service prefix '${servicePrefix}:'. ` +
      `Mismatched actions: ${mismatched.join(', ')}`
    );
  }
}

/**
 * Validate wildcard actions based on framework
 * @param actions - Array of IAM action strings
 * @param framework - Compliance framework
 * @throws Error if wildcards are rejected by the framework
 */
function validateWildcardActions(actions: string[], framework: ComplianceFramework): void {
  const wildcardActions = actions.filter(isWildcardAction);
  
  if (wildcardActions.length === 0) {
    return; // No wildcards, validation passes
  }
  
  // Production frameworks reject wildcards
  if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
    throw new Error(
      `Wildcard actions are not allowed in ${framework} framework. ` +
      `Found wildcard actions: ${wildcardActions.join(', ')}. ` +
      `Use explicit action lists or action profiles instead.`
    );
  }
  
  // Commercial framework: warn but allow
  if (framework === 'commercial') {
    console.warn(
      `Warning: Wildcard actions detected in commercial framework: ${wildcardActions.join(', ')}. ` +
      `Consider using explicit actions for better security.`
    );
  }
}

/**
 * Resolve IAM actions from binding directive
 * 
 * If `directive.actions` is provided:
 *   - If string: resolve as action profile name
 *   - If array: use directly
 *   - Validate service prefix match
 *   - Validate wildcard actions (reject in production frameworks)
 * 
 * If `directive.actions` NOT provided:
 *   - Use getActionsForAccess(directive.access) to get coarse actions
 * 
 * @param directive - Binding directive (may contain actions field)
 * @param context - Binding context (contains compliance framework)
 * @param getActionsForAccess - Function to get actions from coarse access level
 * @param servicePrefix - Service prefix for validation (e.g., 'sqs', 'lambda', 's3')
 * @returns Array of resolved IAM action strings
 * @throws Error if validation fails (invalid prefix, wildcards in prod, missing profile, etc.)
 */
export function resolveActions(
  directive: BindingDirective,
  context: BindingContext,
  getActionsForAccess: (access: string) => string[],
  servicePrefix: string
): string[] {
  // If actions field not provided, use coarse access level
  if (!directive.actions) {
    return getActionsForAccess(directive.access);
  }
  
  let resolvedActions: string[];
  
  // Resolve actions based on type
  if (typeof directive.actions === 'string') {
    // Profile name (shorthand syntax)
    const profileActions = resolveActionProfile(directive.actions, context.complianceFramework as ComplianceFramework);
    
    if (!profileActions) {
      throw new Error(
        `Action profile '${directive.actions}' not found in ${context.complianceFramework} framework. ` +
        `Available profiles can be found in config/${context.complianceFramework}.yml under actionProfiles.`
      );
    }
    
    resolvedActions = profileActions;
  } else if (Array.isArray(directive.actions)) {
    // Direct actions array
    if (directive.actions.length === 0) {
      throw new Error('Actions array cannot be empty. Provide at least one action or omit the actions field.');
    }
    
    const framework = context.complianceFramework as ComplianceFramework;
    
    // Check for wildcards FIRST (before custom action check) to provide specific error messages
    const wildcardActions = directive.actions.filter(isWildcardAction);
    if (wildcardActions.length > 0 && (framework === 'fedramp-moderate' || framework === 'fedramp-high')) {
      throw new Error(
        `Wildcard actions are not allowed in ${framework} framework. ` +
        `Found wildcard actions: ${wildcardActions.join(', ')}. ` +
        `Use explicit action lists or action profiles instead.`
      );
    }
    
    // Then check if custom actions are allowed (for non-wildcard actions in FedRAMP)
    if (!areCustomActionsAllowed(framework)) {
      // Audit log: custom actions rejected in FedRAMP frameworks
      const sourceName = context.source && typeof context.source.getName === 'function' 
        ? context.source.getName() 
        : 'unknown';
      const targetName = context.target && typeof context.target.getName === 'function'
        ? context.target.getName()
        : 'unknown';
      
      console.error(
        `[COMPLIANCE-AUDIT] Custom actions rejected in ${framework} framework. ` +
        `Only action profiles are allowed. ` +
        `Source: ${sourceName}, ` +
        `Target: ${targetName}, ` +
        `Capability: ${directive.capability || 'unknown'}, ` +
        `Actions: ${directive.actions.join(', ')}`
      );
      
      throw new Error(
        `Custom actions are not allowed in ${framework} framework. ` +
        `Only action profiles are permitted. ` +
        `Use an action profile (string) instead of an actions array. ` +
        `Available profiles can be found in config/${framework}.yml under actionProfiles.`
      );
    }
    
    resolvedActions = directive.actions;
  } else {
    throw new Error(
      `Invalid actions type. Expected string (profile name) or array of strings, got: ${typeof directive.actions}`
    );
  }
  
  // Validate service prefix match
  validateServicePrefix(resolvedActions, servicePrefix);
  
  // Get framework for remaining validations
  const framework = context.complianceFramework as ComplianceFramework;
  
  // Validate wildcard actions (framework-specific) - only for commercial framework now
  // (FedRAMP frameworks already checked wildcards above)
  if (framework === 'commercial') {
    validateWildcardActions(resolvedActions, framework);
  }
  
  // SECURITY: Validate actions against allow-list
  // This prevents privilege escalation through action injection
  try {
    validateActionsAgainstAllowList(resolvedActions, servicePrefix, framework);
  } catch (error) {
    // Audit log: action rejected by allow-list
    const sourceName = context.source && typeof context.source.getName === 'function' 
      ? context.source.getName() 
      : 'unknown';
    const targetName = context.target && typeof context.target.getName === 'function'
      ? context.target.getName()
      : 'unknown';
    
    console.error(
      `[COMPLIANCE-AUDIT] Action(s) rejected by allow-list. ` +
      `Source: ${sourceName}, ` +
      `Target: ${targetName}, ` +
      `Capability: ${directive.capability || 'unknown'}, ` +
      `Service: ${servicePrefix}, ` +
      `Framework: ${framework}, ` +
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
  
  return resolvedActions;
}

