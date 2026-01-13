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
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
/**
 * Registry of action allow-lists per framework
 * Key: framework name
 * Value: Action allow-list configuration
 */
const allowListRegistry = new Map();
/**
 * Load action allow-lists from config file
 *
 * Expected YAML structure:
 * ```yaml
 * actionAllowLists:
 *   s3:
 *     - s3:GetObject
 *     - s3:PutObject
 *     - s3:DeleteObject
 *   lambda:
 *     - lambda:InvokeFunction
 * ```
 *
 * @param framework - Compliance framework name
 * @returns Action allow-list configuration
 */
function loadAllowListsFromConfig(framework) {
    const configDir = process.env.COMPLIANCE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const configPath = path.join(configDir, `${framework}.yml`);
    if (!fs.existsSync(configPath)) {
        return {};
    }
    try {
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        const allowLists = config?.actionAllowLists || config?.defaults?.actionAllowLists || {};
        // Validate structure
        const validated = {};
        for (const [servicePrefix, actions] of Object.entries(allowLists)) {
            if (Array.isArray(actions)) {
                validated[servicePrefix] = actions.filter((action) => typeof action === 'string');
            }
        }
        return validated;
    }
    catch (error) {
        console.warn(`Failed to load action allow-lists from ${configPath}:`, error);
        return {};
    }
}
/**
 * Get action allow-list for a service prefix and framework
 *
 * @param servicePrefix - Service prefix (e.g., 's3', 'lambda', 'sqs')
 * @param framework - Compliance framework
 * @returns Array of allowed actions, or undefined if no allow-list defined
 */
export function getActionAllowList(servicePrefix, framework) {
    // Load allow-list if not already loaded
    if (!allowListRegistry.has(framework)) {
        const allowLists = loadAllowListsFromConfig(framework);
        allowListRegistry.set(framework, allowLists);
    }
    const frameworkAllowLists = allowListRegistry.get(framework);
    if (!frameworkAllowLists) {
        return undefined;
    }
    return frameworkAllowLists[servicePrefix];
}
/**
 * Check if an action contains wildcard patterns
 * @param action - IAM action string (e.g., 'sqs:*', '*:*', 'sqs:SendMessage')
 * @returns true if action contains wildcards
 */
function isWildcardAction(action) {
    return action.includes('*');
}
/**
 * Check if an action is allowed for a service prefix and framework
 *
 * @param action - IAM action string (e.g., 's3:GetObject')
 * @param servicePrefix - Service prefix (e.g., 's3', 'lambda', 'sqs')
 * @param framework - Compliance framework
 * @returns True if action is allowed, false otherwise
 */
export function isActionAllowed(action, servicePrefix, framework) {
    // Wildcard actions are allowed in commercial framework (with warning handled by caller)
    // But rejected in FedRAMP frameworks (handled by validateWildcardActions before this check)
    if (isWildcardAction(action) && framework === 'commercial') {
        return true;
    }
    const allowList = getActionAllowList(servicePrefix, framework);
    // If no allow-list defined, allow all actions (for backwards compatibility)
    // But log a warning
    if (!allowList) {
        console.warn(`[SECURITY] No action allow-list defined for service '${servicePrefix}' in ${framework} framework. ` +
            `Allowing action '${action}'. Consider defining an allow-list.`);
        return true;
    }
    return allowList.includes(action);
}
/**
 * Validate actions against allow-list
 *
 * @param actions - Array of IAM action strings
 * @param servicePrefix - Service prefix (e.g., 's3', 'lambda', 'sqs')
 * @param framework - Compliance framework
 * @throws Error if any action is not in the allow-list
 */
export function validateActionsAgainstAllowList(actions, servicePrefix, framework) {
    const disallowedActions = [];
    for (const action of actions) {
        if (!isActionAllowed(action, servicePrefix, framework)) {
            disallowedActions.push(action);
        }
    }
    if (disallowedActions.length > 0) {
        const allowList = getActionAllowList(servicePrefix, framework);
        const allowListStr = allowList ? allowList.join(', ') : 'none defined';
        throw new Error(`Action(s) not allowed for service '${servicePrefix}' in ${framework} framework: ${disallowedActions.join(', ')}. ` +
            `Allowed actions: ${allowListStr}. ` +
            `Use action profiles or ensure actions are in the allow-list.`);
    }
}
/**
 * Check if custom actions are allowed in a framework
 *
 * FedRAMP frameworks only allow action profiles, not custom actions.
 *
 * @param framework - Compliance framework
 * @returns True if custom actions are allowed, false if only profiles allowed
 */
export function areCustomActionsAllowed(framework) {
    // FedRAMP frameworks only allow action profiles
    if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
        return false;
    }
    // Commercial and other frameworks allow custom actions (with allow-list validation)
    return true;
}
/**
 * Register a custom allow-list for a service prefix and framework
 *
 * @param servicePrefix - Service prefix
 * @param framework - Compliance framework
 * @param allowList - Array of allowed actions
 */
export function registerActionAllowList(servicePrefix, framework, allowList) {
    if (!allowListRegistry.has(framework)) {
        allowListRegistry.set(framework, {});
    }
    const frameworkAllowLists = allowListRegistry.get(framework);
    frameworkAllowLists[servicePrefix] = allowList;
}
/**
 * Clear allow-list cache (useful for testing)
 */
export function clearAllowListCache() {
    allowListRegistry.clear();
}
//# sourceMappingURL=action-allow-lists.js.map