/**
 * Configuration Loader Utility - Principle 6: Separate Data from Logic
 * Implements Principle 7: Clear Class Roles - This is a "Stateless Utility"
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as YAML from 'yaml';
import { ErrorMessages } from './error-message-utils.js';
import { withPerformanceTiming } from './performance-metrics.js';
import { Logger } from '../platform/logger/src/index.js';
/**
 * Pure utility for loading externalized configuration
 * Role: Stateless Utility - No dependencies, only static behavior
 */
export class ConfigLoader {
    static _templateConfig = null;
    static logger = Logger.getLogger('config-loader');
    /**
     * Load template configuration from external YAML file
     * Implements caching to avoid repeated file I/O
     * Supports environment variable override for config path
     */
    static async getTemplateConfig() {
        if (this._templateConfig) {
            return this._templateConfig;
        }
        return withPerformanceTiming('config-loader.getTemplateConfig', async () => {
            // Support environment variable override for config path
            const configPath = process.env.TEMPLATE_CONFIG_PATH ||
                path.join(__dirname, '../../config/templates.yaml');
            // Validate path security to prevent directory traversal
            this.validatePathSecurity(configPath);
            try {
                const configContent = await fs.readFile(configPath, 'utf8');
                this._templateConfig = YAML.parse(configContent);
                // Add info-level logging for successful config load
                this.logger.info(`Template configuration loaded from ${configPath}`);
                return this._templateConfig;
            }
            catch (error) {
                throw new Error(ErrorMessages.configLoadFailed(configPath, error instanceof Error ? error.message : String(error)));
            }
        }, { configPath: process.env.TEMPLATE_CONFIG_PATH || 'default' });
    }
    /**
     * Validate that the config path is secure and doesn't attempt directory traversal
     * @param configPath The path to validate
     * @throws Error if path is insecure
     */
    static validatePathSecurity(configPath) {
        const normalizedPath = path.normalize(configPath);
        const resolvedPath = path.resolve(normalizedPath);
        // Check for directory traversal attempts
        if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
            throw new Error(ErrorMessages.pathTraversalAttempt(configPath, 'ConfigLoader'));
        }
        // Ensure path is within expected directory structure
        const expectedBaseDir = path.resolve(__dirname, '../../config');
        if (!resolvedPath.startsWith(expectedBaseDir) && !process.env.TEMPLATE_CONFIG_PATH) {
            throw new Error(ErrorMessages.systemDirectoryAccess(configPath, 'ConfigLoader'));
        }
    }
    /**
     * Reset cached configuration (useful for testing)
     */
    static resetCache() {
        this._templateConfig = null;
    }
}
//# sourceMappingURL=config-loader.js.map