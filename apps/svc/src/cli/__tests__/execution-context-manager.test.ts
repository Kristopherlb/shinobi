/**
 * Execution Context Manager Tests
 * 
 * Tests for the execution context manager that caches resolved manifests and plan results.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as YAML from 'yaml';
import { ExecutionContextManager } from '../execution-context-manager.js';
import { createMockLogger } from './helpers/mock-logger.js';
import { createMockFileDiscovery } from './helpers/mock-file-discovery.js';
import { createTempDir, cleanupTempDir, writeManifestToTempDir } from './helpers/temp-dirs.js';
import { createValidManifest } from './fixtures/manifests.js';
import type { Logger } from '../console-logger.js';

describe('ExecutionContextManager', () => {
  let manager: ExecutionContextManager;
  let mockPipeline: any;
  let mockFileDiscovery: ReturnType<typeof createMockFileDiscovery>;
  let logger: Logger;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    logger = createMockLogger();
    mockFileDiscovery = createMockFileDiscovery();
    
    mockPipeline = {
      plan: vi.fn()
    };

    manager = new ExecutionContextManager({
      logger,
      pipeline: mockPipeline,
      fileDiscovery: mockFileDiscovery
    });
  });

  afterEach(async () => {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  });

  describe('caching', () => {
    it('Caching__SameKey__ReturnsCachedResult', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      // First call - should call pipeline
      const result1 = await manager.resolve({ manifestPath, environment: 'dev' });
      
      // Second call with same key - should return cached result
      const result2 = await manager.resolve({ manifestPath, environment: 'dev' });

      expect(mockPipeline.plan).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
      expect(result1.manifestPath).toBe(manifestPath);
      expect(result1.environment).toBe('dev');
    });

    it('Caching__CacheMiss__CallsPipeline', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ manifestPath, environment: 'dev' });
      await manager.resolve({ manifestPath, environment: 'dev' });
      await manager.resolve({ manifestPath, environment: 'dev' });

      expect(mockPipeline.plan).toHaveBeenCalledTimes(1);
    });

    it('Caching__CacheHit__ReturnsCachedResult', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      const result1 = await manager.resolve({ manifestPath, environment: 'dev' });
      const result2 = await manager.resolve({ manifestPath, environment: 'dev' });

      expect(result1).toBe(result2);
      expect(result1.planResult).toBe(result2.planResult);
    });

    it('Caching__DifferentEnvironment__CreatesNewCacheEntry', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ manifestPath, environment: 'dev' });
      await manager.resolve({ manifestPath, environment: 'prod' });

      expect(mockPipeline.plan).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset', () => {
    it('Reset__Called__ClearsCache', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ manifestPath, environment: 'dev' });
      manager.reset();
      await manager.resolve({ manifestPath, environment: 'dev' });

      expect(mockPipeline.plan).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateLoggerContext', () => {
    it('UpdateLoggerContext__ResolvedManifest__SetsServiceNameComplianceEnvironment', async () => {
      const manifest = createValidManifest();
      manifest.service = 'test-service';
      manifest.complianceFramework = 'fedramp-moderate';
      
      const manifestPath = await writeManifestToTempDir(manifest, tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: manifest,
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ manifestPath, environment: 'dev' });

      const config = logger.getCurrentConfig();
      expect(config.serviceName).toBe('test-service');
      expect(config.compliance).toBe('fedramp-moderate');
      expect(config.environment).toBe('dev');
    });

    it('UpdateLoggerContext__CacheHit__UpdatesLoggerContext', async () => {
      const manifest = createValidManifest();
      manifest.service = 'test-service';
      
      const manifestPath = await writeManifestToTempDir(manifest, tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: manifest,
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ manifestPath, environment: 'dev' });
      
      // Clear logger state
      const logger2 = createMockLogger();
      manager = new ExecutionContextManager({
        logger: logger2,
        pipeline: mockPipeline,
        fileDiscovery: mockFileDiscovery
      });

      await manager.resolve({ manifestPath, environment: 'dev' });

      const config = logger2.getCurrentConfig();
      expect(config.serviceName).toBe('test-service');
      expect(config.environment).toBe('dev');
    });
  });

  describe('manifest path normalization', () => {
    it('ManifestPathNormalization__RelativePath__NormalizesToAbsolute', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const relativePath = './service.yml';
      
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      const result = await manager.resolve({ manifestPath: relativePath, environment: 'dev' });

      // Should normalize to absolute path
      expect(result.manifestPath).toBe(require('path').resolve(relativePath));
    });

    it('ManifestPathNormalization__RelativePathFromWorkspaceRoot__ResolvesFromRepoRoot', async () => {
      // Simulate scenario where user runs from workspace root with relative path,
      // but CLI process is running from a subdirectory (e.g., apps/svc)
      const repoRoot = tempDir;
      const subDir = path.join(repoRoot, 'apps', 'svc');
      const manifestFile = path.join(repoRoot, 'apps', 'api-service', 'service.yml');
      
      // Create directory structure
      await fs.mkdir(path.join(repoRoot, 'apps', 'api-service'), { recursive: true });
      await fs.mkdir(subDir, { recursive: true });
      
      // Create manifest in workspace root subdirectory
      const manifestContent = createValidManifest();
      await fs.writeFile(manifestFile, YAML.stringify(manifestContent), 'utf-8');
      
      // Create pnpm-workspace.yaml to mark repo root
      await fs.writeFile(
        path.join(repoRoot, 'pnpm-workspace.yaml'),
        'packages:\n  - packages/*\n',
        'utf-8'
      );

      const mockPlanResult = {
        resolvedManifest: manifestContent,
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      // Simulate running from subdirectory with relative path from workspace root
      const relativePath = 'apps/api-service/service.yml';
      const originalCwd = process.cwd();
      
      try {
        // Change to subdirectory to simulate CLI running from apps/svc
        process.chdir(subDir);
        
        const result = await manager.resolve({ manifestPath: relativePath, environment: 'dev' });

        // Should resolve to absolute path from repo root, not from subdirectory
        // Normalize paths to handle macOS symlinks (/var vs /private/var)
        const expectedPath = path.resolve(repoRoot, relativePath);
        // Use realpathSync to resolve symlinks (macOS /var -> /private/var)
        const normalizedExpected = fsSync.realpathSync(expectedPath);
        const normalizedActual = fsSync.realpathSync(result.manifestPath);
        expect(normalizedActual).toBe(normalizedExpected);
        // Also verify the mock was called with the correct path (normalize for comparison)
        const mockCallArgs = (mockPipeline.plan as vi.Mock).mock.calls[0];
        if (mockCallArgs && mockCallArgs[0]) {
          const normalizedMockPath = fsSync.realpathSync(mockCallArgs[0]);
          expect(normalizedMockPath).toBe(normalizedExpected);
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('ManifestPathNormalization__AbsolutePath__PreservesPath', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      const result = await manager.resolve({ manifestPath, environment: 'dev' });

      expect(result.manifestPath).toBe(manifestPath);
    });

    it('ManifestPathNormalization__NoPathProvided__UsesFileDiscovery', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ environment: 'dev' });

      expect(mockFileDiscovery.findManifest).toHaveBeenCalledWith('.');
    });

    it('ManifestPathNormalization__NoManifestFound__ThrowsError', async () => {
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(null);

      await expect(manager.resolve({ environment: 'dev' })).rejects.toThrow(
        'No service.yml found'
      );
    });
  });

  describe('integration', () => {
    it('Integration__MultipleCommands__ShareSameResolvedContext', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      const result1 = await manager.resolve({ manifestPath, environment: 'dev' });
      const result2 = await manager.resolve({ manifestPath, environment: 'dev' });
      const result3 = await manager.resolve({ manifestPath, environment: 'dev' });

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(mockPipeline.plan).toHaveBeenCalledTimes(1);
    });

    it('Integration__FirstResolve__UpdatesLoggerContext', async () => {
      const manifest = createValidManifest();
      manifest.service = 'test-service';
      
      const manifestPath = await writeManifestToTempDir(manifest, tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: manifest,
        warnings: []
      };
      (mockPipeline.plan as vi.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ manifestPath, environment: 'dev' });

      const config = logger.getCurrentConfig();
      expect(config.serviceName).toBe('test-service');
      expect(config.environment).toBe('dev');
    });
  });
});

