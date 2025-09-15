import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger';

const logger = new Logger('file-discovery');

export class FileDiscovery {
  /**
   * Discover service.yml by searching from current directory upwards to git root
   * FR-CLI-2: Configuration Discovery
   */
  async findManifest(startDir: string = '.'): Promise<string | null> {
    logger.debug(`Searching for service.yml starting from: ${startDir}`);

    let currentDir = path.resolve(startDir);
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      const manifestPath = path.join(currentDir, 'service.yml');

      try {
        await fs.access(manifestPath);
        logger.debug(`Found manifest at: ${manifestPath}`);
        return manifestPath;
      } catch {
        // File doesn't exist, continue searching
      }

      // Check if we've reached a git repository root
      try {
        await fs.access(path.join(currentDir, '.git'));
        logger.debug(`Reached git repository root at: ${currentDir}`);
        break;
      } catch {
        // Not a git root, continue up
      }

      currentDir = path.dirname(currentDir);
    }

    // If the loop finishes, no manifest was found up to the root
    logger.debug('No service.yml found in directory tree');
    return null;
  }

  /**
   * Check if a service.yml file exists at the given path
   */
  async manifestExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}