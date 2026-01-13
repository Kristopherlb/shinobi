/**
 * Action Profiles System
 *
 * Loads and resolves IAM action profiles from framework-specific configuration files.
 * Profiles allow shorthand references to predefined action sets (e.g., 'sqs-consumer').
 *
 * Profiles are stored in framework config files:
 * - config/commercial.yml
 * - config/fedramp-moderate.yml
 * - config/fedramp-high.yml
 *
 * Structure:
 * ```yaml
 * actionProfiles:
 *   sqs-consumer:
 *     - sqs:ReceiveMessage
 *     - sqs:DeleteMessage
 *   sqs-producer:
 *     - sqs:SendMessage
 * ```
 */
import type { ComplianceFramework } from '../contracts/bindings.js';
/**
 * Action profile configuration structure
 * Maps profile names to arrays of IAM action strings
 */
export interface ActionProfilesConfig {
    [profileName: string]: string[];
}
/**
 * Load action profiles from framework-specific config file
 *
 * @param framework - Compliance framework name
 * @returns Action profiles configuration map, or empty object if not found
 */
export declare function loadActionProfiles(framework: ComplianceFramework): ActionProfilesConfig;
/**
 * Resolve an action profile name to an array of actions
 *
 * @param profileName - Profile name to resolve (e.g., 'sqs-consumer')
 * @param framework - Compliance framework
 * @returns Array of IAM action strings, or undefined if profile not found
 */
export declare function resolveActionProfile(profileName: string, framework: ComplianceFramework): string[] | undefined;
//# sourceMappingURL=action-profiles.d.ts.map