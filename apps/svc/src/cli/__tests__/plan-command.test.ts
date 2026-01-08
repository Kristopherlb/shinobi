/**
 * Plan Command Tests
 * 
 * Tests for the plan command implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlanCommand } from '../plan-command.js';
import { createMockLogger } from './helpers/mock-logger.js';
import { createTempDir, cleanupTempDir, writeManifestToTempDir } from './helpers/temp-dirs.js';
import { createValidManifest } from './fixtures/manifests.js';
import { ExecutionContextManager } from '../execution-context-manager.js';

describe('PlanCommand', () => {
  let planCommand: PlanCommand;
  let mockExecutionContext: ExecutionContextManager;
  let logger: ReturnType<typeof createMockLogger>;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    logger = createMockLogger();
    
    mockExecutionContext = {
      resolve: vi.fn()
    } as unknown as ExecutionContextManager;

    planCommand = new PlanCommand({
      logger,
      executionContext: mockExecutionContext
    });
  });

  afterEach(async () => {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  });

  describe('caching', () => {
    it('Caching__SecondCall__UsesCachedContext', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const mockContext = {
        manifestPath,
        environment: 'dev',
        planResult: {
          resolvedManifest: createValidManifest(),
          warnings: []
        }
      };
      
      (mockExecutionContext.resolve as vi.Mock).mockResolvedValue(mockContext);

      await planCommand.execute({ file: manifestPath, env: 'dev' });
      await planCommand.execute({ file: manifestPath, env: 'dev' });

      // Should call resolve only once (cached on second call)
      expect(mockExecutionContext.resolve).toHaveBeenCalledTimes(2);
    });
  });

  describe('JSON output', () => {
    it('JsonOutput__ValidManifest__IncludesAllFields', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const manifest = createValidManifest();
      const mockContext = {
        manifestPath,
        environment: 'dev',
        planResult: {
          resolvedManifest: manifest,
          warnings: ['Warning 1']
        }
      };
      
      (mockExecutionContext.resolve as vi.Mock).mockResolvedValue(mockContext);

      const result = await planCommand.execute({ file: manifestPath, env: 'dev', json: true });

      expect(result.success).toBe(true);
      expect(result.data?.resolvedManifest).toEqual(manifest);
      expect(result.data?.warnings).toContain('Warning 1');
      expect(result.data?.structuredData).toBeDefined();
    });
  });

  describe('integration', () => {
    it('Integration__ValidManifest__ReturnsResolvedConfig', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const manifest = createValidManifest();
      const mockContext = {
        manifestPath,
        environment: 'dev',
        planResult: {
          resolvedManifest: manifest,
          warnings: []
        }
      };
      
      (mockExecutionContext.resolve as vi.Mock).mockResolvedValue(mockContext);

      const result = await planCommand.execute({ file: manifestPath, env: 'dev' });

      expect(result.success).toBe(true);
      expect(result.data?.resolvedManifest).toEqual(manifest);
      expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('completed successfully'));
    });

    it('Integration__ManifestWithWarnings__SurfacesWarnings', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const mockContext = {
        manifestPath,
        environment: 'dev',
        planResult: {
          resolvedManifest: createValidManifest(),
          warnings: ['Warning 1', 'Warning 2']
        }
      };
      
      (mockExecutionContext.resolve as vi.Mock).mockResolvedValue(mockContext);

      await planCommand.execute({ file: manifestPath, env: 'dev' });

      expect(logger.warn).toHaveBeenCalledWith('Warning 1');
      expect(logger.warn).toHaveBeenCalledWith('Warning 2');
    });

    it('Integration__JsonFlag__ReturnsStructuredOutput', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const mockContext = {
        manifestPath,
        environment: 'dev',
        planResult: {
          resolvedManifest: createValidManifest(),
          warnings: []
        }
      };
      
      (mockExecutionContext.resolve as vi.Mock).mockResolvedValue(mockContext);

      const result = await planCommand.execute({ file: manifestPath, env: 'dev', json: true });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.resolvedManifest).toBeDefined();
      expect(result.data?.structuredData).toBeDefined();
    });
  });
});




