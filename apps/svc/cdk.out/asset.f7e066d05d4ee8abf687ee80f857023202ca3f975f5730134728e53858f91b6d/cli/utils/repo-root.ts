import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Find the monorepo root by walking up from a starting directory
 * Looks for common monorepo marker files: pnpm-workspace.yaml, nx.json, turbo.json, rush.json
 * For package.json, also checks for workspaces field
 * 
 * This is a shared utility used by component catalog and loader to avoid hard-coded path traversal
 */
export async function findRepoRoot(startDir: string): Promise<string> {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    // Check for common monorepo marker files
    const markerFiles = ['pnpm-workspace.yaml', 'nx.json', 'turbo.json', 'rush.json'];
    for (const marker of markerFiles) {
      try {
        await fs.access(path.join(current, marker));
        return current; // Found a monorepo marker
      } catch {
        // Continue checking other markers
      }
    }

    // Check package.json for workspaces field
    try {
      const packageJsonPath = path.join(current, 'package.json');
      await fs.access(packageJsonPath);
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      if (packageJson.workspaces) {
        return current; // Found workspace root
      }
    } catch {
      // Not a workspace root, continue
    }

    current = path.dirname(current);
  }

  // Fallback: return the starting directory if no root found
  return startDir;
}

