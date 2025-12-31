/**
 * Manifest Parser Service - Single responsibility for YAML parsing
 * Implements Principle 4: Single Responsibility Principle
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as YAML from 'yaml';
import { ErrorMessages } from './error-message-utils.js';
import { withPerformanceTiming } from './performance-metrics.js';
/**
 * Pure service for parsing YAML manifests
 * Responsibility: Stage 1 - Parsing (AC-P1.1, AC-P1.2)
 */
export class ManifestParser {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async parseManifest(manifestPath) {
        return withPerformanceTiming('manifest-parser.parseManifest', async () => {
            this.dependencies.logger.debug(`Parsing manifest: ${manifestPath}`);
            // Validate path security before reading file
            this.validatePathSecurity(manifestPath);
            try {
                const fileContent = await fs.readFile(manifestPath, 'utf8');
                const manifest = YAML.parse(fileContent);
                if (!manifest || typeof manifest !== 'object') {
                    throw new Error(ErrorMessages.invalidManifestStructure('manifest must be an object'));
                }
                this.dependencies.logger.debug('Manifest parsed successfully');
                this.dependencies.logger.info(`Loaded and parsed manifest from ${manifestPath}`);
                return manifest;
            }
            catch (error) {
                if (error instanceof Error) {
                    if (error.message.includes('YAML')) {
                        throw new Error(ErrorMessages.invalidYamlSyntax(manifestPath, error.message));
                    }
                    throw new Error(ErrorMessages.fileReadFailed(manifestPath, error.message));
                }
                throw error;
            }
        }, { manifestPath, fileSize: 'unknown' });
    }
    /**
     * Validate that the manifest path is secure and doesn't attempt directory traversal
     * @param manifestPath The path to validate
     * @throws Error if path is insecure
     */
    validatePathSecurity(manifestPath) {
        const normalizedPath = path.normalize(manifestPath);
        // Check for directory traversal attempts
        if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
            throw new Error(ErrorMessages.pathTraversalAttempt(manifestPath, 'ManifestParser'));
        }
        // Ensure path is within reasonable bounds (not absolute system paths)
        const resolvedPath = path.resolve(normalizedPath);
        if (resolvedPath.startsWith('/etc/') || resolvedPath.startsWith('/usr/') ||
            resolvedPath.startsWith('/var/') || resolvedPath.startsWith('/root/')) {
            throw new Error(ErrorMessages.systemDirectoryAccess(manifestPath, 'ManifestParser'));
        }
    }
}
//# sourceMappingURL=manifest-parser.js.map