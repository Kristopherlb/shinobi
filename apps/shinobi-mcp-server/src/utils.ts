/**
 * Shared utilities for MCP server domains
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Find workspace root by walking up directory tree
 */
export function findWorkspaceRoot(): string {
  let currentDir = process.cwd();

  while (currentDir !== path.dirname(currentDir)) {
    const pkgPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.workspaces || fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return process.cwd();
}

/**
 * Execute shell command and return stdout
 */
export async function sh(cmd: string, args: string[], opts: any = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'pipe',
      encoding: 'utf-8',
      ...opts
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data;
    });

    child.stderr?.on('data', (data) => {
      stderr += data;
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Command failed with code ${code}: ${cmd} ${args.join(' ')}`));
      } else {
        resolve(stdout.trim());
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn command: ${err.message}`));
    });
  });
}

/**
 * Resolve manifest path (absolute or relative to workspace)
 */
export function resolveManifestPath(inputPath: string | undefined, workspaceRoot: string): string {
  if (!inputPath) {
    return path.join(workspaceRoot, 'service.yml');
  }

  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  return path.join(workspaceRoot, inputPath);
}


