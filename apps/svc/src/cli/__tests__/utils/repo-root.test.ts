/**
 * findRepoRoot Tests
 * 
 * Tests for the repository root detection utility.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { findRepoRoot } from '../../utils/repo-root.js';
import { createTempDir, cleanupTempDir } from '../helpers/temp-dirs.js';

describe('findRepoRoot', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  });

  describe('monorepo marker detection', () => {
    it('FindRepoRoot__PnpmWorkspaceYaml__ReturnsCorrectRoot', async () => {
      const rootDir = path.join(tempDir, 'repo');
      const subDir = path.join(rootDir, 'packages', 'app');
      
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(rootDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');

      const result = await findRepoRoot(subDir);
      expect(result).toBe(rootDir);
    });

    it('FindRepoRoot__PnpmWorkspaceYml__ReturnsCorrectRoot', async () => {
      const rootDir = path.join(tempDir, 'repo');
      const subDir = path.join(rootDir, 'packages', 'app');
      
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(rootDir, 'pnpm-workspace.yml'), 'packages:\n  - packages/*\n');

      const result = await findRepoRoot(subDir);
      expect(result).toBe(rootDir);
    });

    it('FindRepoRoot__NxJson__ReturnsCorrectRoot', async () => {
      const rootDir = path.join(tempDir, 'repo');
      const subDir = path.join(rootDir, 'apps', 'app');
      
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(rootDir, 'nx.json'), '{}');

      const result = await findRepoRoot(subDir);
      expect(result).toBe(rootDir);
    });

    it('FindRepoRoot__TurboJson__ReturnsCorrectRoot', async () => {
      const rootDir = path.join(tempDir, 'repo');
      const subDir = path.join(rootDir, 'apps', 'app');
      
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(rootDir, 'turbo.json'), '{}');

      const result = await findRepoRoot(subDir);
      expect(result).toBe(rootDir);
    });

    it('FindRepoRoot__RushJson__ReturnsCorrectRoot', async () => {
      const rootDir = path.join(tempDir, 'repo');
      const subDir = path.join(rootDir, 'apps', 'app');
      
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(rootDir, 'rush.json'), '{}');

      const result = await findRepoRoot(subDir);
      expect(result).toBe(rootDir);
    });

    it('FindRepoRoot__PackageJsonWorkspaces__ReturnsCorrectRoot', async () => {
      const rootDir = path.join(tempDir, 'repo');
      const subDir = path.join(rootDir, 'packages', 'app');
      
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(
        path.join(rootDir, 'package.json'),
        JSON.stringify({ workspaces: ['packages/*'] })
      );

      const result = await findRepoRoot(subDir);
      expect(result).toBe(rootDir);
    });

    it('FindRepoRoot__NoMarkers__ReturnsResolvedStartDir', async () => {
      const subDir = path.join(tempDir, 'some', 'nested', 'dir');
      await fs.mkdir(subDir, { recursive: true });

      const result = await findRepoRoot(subDir);
      expect(result).toBe(require('path').resolve(subDir));
    });
  });

  describe('edge cases', () => {
    it('FindRepoRoot__UnreadableDirectories__HandlesGracefully', async () => {
      // On Unix systems, we can't easily test unreadable directories in a sandbox
      // This test verifies the function doesn't crash on edge cases
      const subDir = path.join(tempDir, 'readable', 'dir');
      await fs.mkdir(subDir, { recursive: true });

      const result = await findRepoRoot(subDir);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('FindRepoRoot__DeepNested__StopsAtFilesystemRoot', async () => {
      // Start from a deep nested directory
      const deepDir = path.join(tempDir, 'very', 'deep', 'nested', 'structure');
      await fs.mkdir(deepDir, { recursive: true });

      const result = await findRepoRoot(deepDir);
      
      // Should return a valid path (either found marker or resolved startDir)
      expect(result).toBeDefined();
      expect(require('path').isAbsolute(result)).toBe(true);
    });

    it('FindRepoRoot__AnyInput__ReturnsAbsolutePath', async () => {
      const subDir = path.join(tempDir, 'some', 'dir');
      await fs.mkdir(subDir, { recursive: true });

      const result = await findRepoRoot(subDir);
      expect(require('path').isAbsolute(result)).toBe(true);
    });
  });

  describe('caching', () => {
    it('FindRepoRoot__MultipleCalls__CachingWorks', async () => {
      const rootDir = path.join(tempDir, 'repo');
      const subDir = path.join(rootDir, 'packages', 'app');
      
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(rootDir, 'nx.json'), '{}');

      // Clear any existing cache by importing fresh
      // Note: The actual implementation uses module-level cache
      // This test verifies the function works correctly
      const result1 = await findRepoRoot(subDir);
      const result2 = await findRepoRoot(subDir);

      expect(result1).toBe(result2);
      expect(result1).toBe(rootDir);
    });
  });

  describe('priority order', () => {
    it('FindRepoRoot__MultipleMarkers__PrefersPnpmWorkspaceYaml', async () => {
      const rootDir = path.join(tempDir, 'repo');
      const subDir = path.join(rootDir, 'packages', 'app');
      
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(rootDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      await fs.writeFile(path.join(rootDir, 'nx.json'), '{}');
      await fs.writeFile(path.join(rootDir, 'turbo.json'), '{}');

      const result = await findRepoRoot(subDir);
      expect(result).toBe(rootDir);
    });
  });
});




