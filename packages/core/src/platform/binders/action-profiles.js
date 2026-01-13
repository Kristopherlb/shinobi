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
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
/**
 * Load action profiles from framework-specific config file
 *
 * @param framework - Compliance framework name
 * @returns Action profiles configuration map, or empty object if not found
 */
export function loadActionProfiles(framework) {
    const configDir = process.env.COMPLIANCE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const configPath = path.join(configDir, `${framework}.yml`);
    if (!fs.existsSync(configPath)) {
        return {};
    }
    try {
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        const profiles = config?.actionProfiles || config?.defaults?.actionProfiles || {};
        // Validate structure
        if (typeof profiles !== 'object' || profiles === null) {
            return {};
        }
        // Ensure all values are arrays of strings
        const validated = {};
        for (const [profileName, actions] of Object.entries(profiles)) {
            if (Array.isArray(actions) && actions.every(a => typeof a === 'string')) {
                validated[profileName] = actions;
            }
        }
        return validated;
    }
    catch (error) {
        console.warn(`Failed to load action profiles from ${configPath}:`, error);
        return {};
    }
}
/**
 * Resolve an action profile name to an array of actions
 *
 * @param profileName - Profile name to resolve (e.g., 'sqs-consumer')
 * @param framework - Compliance framework
 * @returns Array of IAM action strings, or undefined if profile not found
 */
export function resolveActionProfile(profileName, framework) {
    const profiles = loadActionProfiles(framework);
    return profiles[profileName];
}
//# sourceMappingURL=action-profiles.js.map