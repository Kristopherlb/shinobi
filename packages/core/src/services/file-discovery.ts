/**
 * File Discovery Service - Single responsibility for manifest file discovery
 * 
 * Implements Principle 4: Single Responsibility Principle.
 * See docs/architecture/design-principles.md for the complete set of architectural principles.
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as fsSync from 'fs';
import type { Logger } from '../platform/logger/src/index.js';
import { ErrorMessages } from './error-message-utils.js';
import { withPerformanceTiming } from './performance-metrics.js';

export interface FileDiscoveryDependencies {
  logger: Logger;
}

export class FileDiscovery {
  constructor(private dependencies: FileDiscoveryDependencies) {}
  /**
   * Discover service.yml by searching from current directory upwards to git root,
   * or resolve a specific file path if provided.
   * 
   * Supports both:
   * - Directory paths: Searches for service.yml starting from the directory
   * - File paths: Resolves the file path with fallback strategies
   * 
   * FR-CLI-2: Configuration Discovery
   */
  async findManifest(
    pathOrDir: string = '.',
    options?: { silentOnMissing?: boolean }
  ): Promise<string | null> {
    return withPerformanceTiming(
      'file-discovery.findManifest',
      async () => {
        // Check if the provided path is a file (ends with .yml or .yaml)
        const isFilePath = pathOrDir.endsWith('.yml') || pathOrDir.endsWith('.yaml');

        if (isFilePath) {
          // It's a file path - resolve it with fallback strategies
          return await this.resolveFilePath(pathOrDir, options);
        } else {
          // It's a directory path - search for service.yml starting from the directory
          return await this.searchDirectory(pathOrDir, options);
        }
      },
      { pathOrDir, resolvedPath: path.resolve(pathOrDir) }
    );
  }

  /**
   * Resolve a file path with fallback strategies:
   * 1. Resolve relative to workspace root (git root)
   * 2. Resolve relative to current working directory
   * 3. Resolve as absolute path
   */
  private async resolveFilePath(
    filePath: string,
    options?: { silentOnMissing?: boolean }
  ): Promise<string | null> {
    this.dependencies.logger.debug(`Resolving file path: ${filePath}`);

    // Strategy 1: Resolve relative to workspace root (git root)
    const workspaceRoot = await this.findWorkspaceRoot(process.cwd());
    if (workspaceRoot) {
      const resolvedPath = path.resolve(workspaceRoot, filePath);
      try {
        await fs.access(resolvedPath);
        this.dependencies.logger.debug(`Found manifest at: ${resolvedPath}`);
        return resolvedPath;
      } catch {
        // Continue to next strategy
      }
    }

    // Strategy 2: Resolve relative to current working directory
    const cwdPath = path.resolve(process.cwd(), filePath);
    try {
      await fs.access(cwdPath);
      this.dependencies.logger.debug(`Found manifest at: ${cwdPath}`);
      return cwdPath;
    } catch {
      // Continue to next strategy
    }

    // Strategy 3: Resolve as absolute path
    const absPath = path.resolve(filePath);
    try {
      await fs.access(absPath);
      this.dependencies.logger.debug(`Found manifest at: ${absPath}`);
      return absPath;
    } catch {
      // File not found
      if (!options?.silentOnMissing) {
        this.dependencies.logger.warn(`Manifest file not found: ${filePath}`);
      }
      return null;
    }
  }

  /**
   * Search for service.yml starting from a directory, walking up to git root
   */
  private async searchDirectory(
    startDir: string,
    options?: { silentOnMissing?: boolean }
  ): Promise<string | null> {
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
  }

  /**
   * Find workspace root (git repository root) by walking up from a directory
   */
  private async findWorkspaceRoot(startDir: string): Promise<string | null> {
    let currentDir = path.resolve(startDir);
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      try {
        // Check for .git directory
        await fs.access(path.join(currentDir, '.git'));
        return currentDir;
      } catch {
        // Not a git root, continue up
      }

      currentDir = path.dirname(currentDir);
    }

    return null;
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
