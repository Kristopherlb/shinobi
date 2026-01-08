/**
 * Execution Context Manager Tests
 * 
 * Tests for the execution context manager that caches resolved manifests and plan results.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

