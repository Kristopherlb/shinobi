/**
 * Action Allow-List Registry
 *
 * Manages capability-specific action allow-lists for security validation.
 * Prevents privilege escalation by restricting which IAM actions can be used
 * in binding directives.
 *
 * SECURITY: This registry is critical for preventing action injection attacks.
 * All custom actions must be validated against capability-specific allow-lists.
 *
 * Features:
 * - Loads allow-lists from config files (per framework)
 * - Supports framework-specific allow-lists
 * - Validates actions against allow-lists
 * - Rejects custom actions in FedRAMP frameworks (only profiles allowed)
 */
import type { ComplianceFramework } from '../contracts/bindings.js';
/**
 * Action allow-list configuration
 * Key: service prefix (e.g., 's3', 'lambda', 'sqs')
 * Value: Array of allowed IAM action strings
 */
export interface ActionAllowListConfig {
    [servicePrefix: string]: string[];
}
/**
 * Get action allow-list for a service prefix and framework
 *
 * @param servicePrefix - Service prefix (e.g., 's3', 'lambda', 'sqs')
 * @param framework - Compliance framework
 * @returns Array of allowed actions, or undefined if no allow-list defined
 */
export declare function getActionAllowList(servicePrefix: string, framework: ComplianceFramework): string[] | undefined;
/**
 * Check if an action is allowed for a service prefix and framework
 *
 * @param action - IAM action string (e.g., 's3:GetObject')
 * @param servicePrefix - Service prefix (e.g., 's3', 'lambda', 'sqs')
 * @param framework - Compliance framework
 * @returns True if action is allowed, false otherwise
 */
export declare function isActionAllowed(action: string, servicePrefix: string, framework: ComplianceFramework): boolean;
/**
 * Validate actions against allow-list
 *
 * @param actions - Array of IAM action strings
 * @param servicePrefix - Service prefix (e.g., 's3', 'lambda', 'sqs')
 * @param framework - Compliance framework
 * @throws Error if any action is not in the allow-list
 */
export declare function validateActionsAgainstAllowList(actions: string[], servicePrefix: string, framework: ComplianceFramework): void;
/**
 * Check if custom actions are allowed in a framework
 *
 * FedRAMP frameworks only allow action profiles, not custom actions.
 *
 * @param framework - Compliance framework
 * @returns True if custom actions are allowed, false if only profiles allowed
 */
export declare function areCustomActionsAllowed(framework: ComplianceFramework): boolean;
/**
 * Register a custom allow-list for a service prefix and framework
 *
 * @param servicePrefix - Service prefix
 * @param framework - Compliance framework
 * @param allowList - Array of allowed actions
 */
export declare function registerActionAllowList(servicePrefix: string, framework: ComplianceFramework, allowList: string[]): void;
/**
 * Clear allow-list cache (useful for testing)
 */
export declare function clearAllowListCache(): void;
//# sourceMappingURL=action-allow-lists.d.ts.map