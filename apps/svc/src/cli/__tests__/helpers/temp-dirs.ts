/**
 * Temporary Directory Helpers
 * 
 * Utilities for creating and managing temporary directories in tests.
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as YAML from 'yaml';

/**
 * Creates a temporary directory and returns its path
 */
export async function createTempDir(prefix = 'shinobi-test-'): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

/**
 * Removes a temporary directory and all its contents
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors during cleanup - directory may already be removed
    if (error instanceof Error && !error.message.includes('ENOENT')) {
      throw error;
    }
  }
}

/**
 * Writes a manifest object as YAML to a temporary directory
 */
export async function writeManifestToTempDir(
  manifest: any,
  tempDir: string,
  filename = 'service.yml'
): Promise<string> {
  const manifestPath = path.join(tempDir, filename);
  const yamlContent = YAML.stringify(manifest);
  await fs.writeFile(manifestPath, yamlContent, 'utf-8');
  return manifestPath;
}

/**
 * Creates a temporary directory with a manifest file
 */
export async function createTempDirWithManifest(
  manifest: any,
  prefix = 'shinobi-test-',
  filename = 'service.yml'
): Promise<{ tempDir: string; manifestPath: string }> {
  const tempDir = await createTempDir(prefix);
  const manifestPath = await writeManifestToTempDir(manifest, tempDir, filename);
  return { tempDir, manifestPath };
}


