/**
 * File Discovery Service - Single responsibility for manifest file discovery
 * 
 * Implements Principle 4: Single Responsibility Principle.
 * See docs/architecture/design-principles.md for the complete set of architectural principles.
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Logger } from '../platform/logger/src/index.js';
import { ErrorMessages } from './error-message-utils.js';
import { withPerformanceTiming } from './performance-metrics.js';

export interface FileDiscoveryDependencies {
  logger: Logger;
}

export class FileDiscovery {
  constructor(private dependencies: FileDiscoveryDependencies) {}
  /**
   * Discover service.yml by searching from current directory upwards to git root
   * FR-CLI-2: Configuration Discovery
   */
  async findManifest(startDir: string = '.', options?: { silentOnMissing?: boolean }): Promise<string | null> {
    return withPerformanceTiming(
      'file-discovery.findManifest',
      async () => {
        this.dependencies.logger.debug(`Searching for service.yml starting from: ${startDir}`);

        let currentDir = path.resolve(startDir);
        const root = path.parse(currentDir).root;

        while (currentDir !== root) {
          // Try both .yml and .yaml extensions
          const manifestPathYml = path.join(currentDir, 'service.yml');
          const manifestPathYaml = path.join(currentDir, 'service.yaml');

          try {
            await fs.access(manifestPathYml);
            this.dependencies.logger.debug(`Found manifest at: ${manifestPathYml}`);
            return manifestPathYml;
          } catch {
            // Try .yaml extension
          }

          try {
            await fs.access(manifestPathYaml);
            this.dependencies.logger.debug(`Found manifest at: ${manifestPathYaml}`);
            return manifestPathYaml;
          } catch {
            // File doesn't exist, continue searching
          }

          // Check if we've reached a git repository root
          try {
            await fs.access(path.join(currentDir, '.git'));
            this.dependencies.logger.debug(`Reached git repository root at: ${currentDir}`);
            break;
          } catch {
            // Not a git root, continue up
          }

          currentDir = path.dirname(currentDir);
        }

        // If the loop finishes, no manifest was found up to the root
        this.dependencies.logger.debug('No service.yml or service.yaml found in directory tree');
        if (!options?.silentOnMissing) {
          this.dependencies.logger.warn('No service.yml or service.yaml manifest file found in this project directory or its parents.');
        }
        return null;
      },
      { startDir, resolvedPath: path.resolve(startDir) }
    );
  }

  /**
   * Check if a service.yml file exists at the given path
   */
  async manifestExists(filePath: string): Promise<boolean> {
    // Validate path security before checking existence
    this.validatePathSecurity(filePath);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate that the file path is secure and doesn't attempt directory traversal
   * @param filePath The path to validate
   * @throws Error if path is insecure
   */
  private validatePathSecurity(filePath: string): void {
    const normalizedPath = path.normalize(filePath);

    // Check for directory traversal attempts
    if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
      throw new Error(ErrorMessages.pathTraversalAttempt(filePath, 'FileDiscovery'));
    }

    // Ensure path is within reasonable bounds (not absolute system paths)
    const resolvedPath = path.resolve(normalizedPath);
    if (resolvedPath.startsWith('/etc/') || resolvedPath.startsWith('/usr/') ||
      resolvedPath.startsWith('/var/') || resolvedPath.startsWith('/root/')) {
      throw new Error(ErrorMessages.systemDirectoryAccess(filePath, 'FileDiscovery'));
    }
  }
}
