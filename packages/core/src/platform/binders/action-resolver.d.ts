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
export declare function resolveActions(directive: BindingDirective, context: BindingContext, getActionsForAccess: (access: string) => string[], servicePrefix: string): string[];
//# sourceMappingURL=action-resolver.d.ts.map