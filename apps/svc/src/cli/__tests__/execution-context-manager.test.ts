/**
 * Execution Context Manager Tests
 * 
 * Tests for the execution context manager that caches resolved manifests and plan results.
 */

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
      plan: jest.fn()
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
    it('works by manifestPath::environment key', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

      // First call - should call pipeline
      const result1 = await manager.resolve({ manifestPath, environment: 'dev' });
      
      // Second call with same key - should return cached result
      const result2 = await manager.resolve({ manifestPath, environment: 'dev' });

      expect(mockPipeline.plan).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
      expect(result1.manifestPath).toBe(manifestPath);
      expect(result1.environment).toBe('dev');
    });

    it('calls pipeline only on cache miss', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ manifestPath, environment: 'dev' });
      await manager.resolve({ manifestPath, environment: 'dev' });
      await manager.resolve({ manifestPath, environment: 'dev' });

      expect(mockPipeline.plan).toHaveBeenCalledTimes(1);
    });

    it('returns cached result on cache hit', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

      const result1 = await manager.resolve({ manifestPath, environment: 'dev' });
      const result2 = await manager.resolve({ manifestPath, environment: 'dev' });

      expect(result1).toBe(result2);
      expect(result1.planResult).toBe(result2.planResult);
    });

    it('creates new cache entry for different environment', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ manifestPath, environment: 'dev' });
      await manager.resolve({ manifestPath, environment: 'prod' });

      expect(mockPipeline.plan).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset', () => {
    it('clears cache', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ manifestPath, environment: 'dev' });
      manager.reset();
      await manager.resolve({ manifestPath, environment: 'dev' });

      expect(mockPipeline.plan).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateLoggerContext', () => {
    it('sets serviceName, compliance, environment', async () => {
      const manifest = createValidManifest();
      manifest.service = 'test-service';
      manifest.complianceFramework = 'fedramp-moderate';
      
      const manifestPath = await writeManifestToTempDir(manifest, tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: manifest,
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ manifestPath, environment: 'dev' });

      const config = logger.getCurrentConfig();
      expect(config.serviceName).toBe('test-service');
      expect(config.compliance).toBe('fedramp-moderate');
      expect(config.environment).toBe('dev');
    });

    it('logger context updated even on cache hit', async () => {
      const manifest = createValidManifest();
      manifest.service = 'test-service';
      
      const manifestPath = await writeManifestToTempDir(manifest, tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: manifest,
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

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
    it('normalizes relative path to absolute', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const relativePath = './service.yml';
      
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

      const result = await manager.resolve({ manifestPath: relativePath, environment: 'dev' });

      // Should normalize to absolute path
      expect(result.manifestPath).toBe(require('path').resolve(relativePath));
    });

    it('preserves absolute paths', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

      const result = await manager.resolve({ manifestPath, environment: 'dev' });

      expect(result.manifestPath).toBe(manifestPath);
    });

    it('uses fileDiscovery when manifestPath not provided', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ environment: 'dev' });

      expect(mockFileDiscovery.findManifest).toHaveBeenCalledWith('.');
    });

    it('throws error when no manifest found', async () => {
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(null);

      await expect(manager.resolve({ environment: 'dev' })).rejects.toThrow(
        'No service.yml found'
      );
    });
  });

  describe('integration', () => {
    it('multiple commands share same resolved context', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: createValidManifest(),
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

      const result1 = await manager.resolve({ manifestPath, environment: 'dev' });
      const result2 = await manager.resolve({ manifestPath, environment: 'dev' });
      const result3 = await manager.resolve({ manifestPath, environment: 'dev' });

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(mockPipeline.plan).toHaveBeenCalledTimes(1);
    });

    it('logger context updated after first resolve', async () => {
      const manifest = createValidManifest();
      manifest.service = 'test-service';
      
      const manifestPath = await writeManifestToTempDir(manifest, tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);

      const mockPlanResult = {
        resolvedManifest: manifest,
        warnings: []
      };
      (mockPipeline.plan as jest.Mock).mockResolvedValue(mockPlanResult);

      await manager.resolve({ manifestPath, environment: 'dev' });

      const config = logger.getCurrentConfig();
      expect(config.serviceName).toBe('test-service');
      expect(config.environment).toBe('dev');
    });
  });
});

