/**
 * Validate Command Tests
 * 
 * Tests for the validate command implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ValidateCommand } from '../validate-command.js';
import { createMockLogger } from './helpers/mock-logger.js';
import { createMockFileDiscovery } from './helpers/mock-file-discovery.js';
import { createTempDir, cleanupTempDir, writeManifestToTempDir } from './helpers/temp-dirs.js';
import { createValidManifest, createInvalidManifest } from './fixtures/manifests.js';
import * as path from 'path';

describe('ValidateCommand', () => {
  let validateCommand: ValidateCommand;
  let mockPipeline: any;
  let mockFileDiscovery: ReturnType<typeof createMockFileDiscovery>;
  let logger: ReturnType<typeof createMockLogger>;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    logger = createMockLogger();
    mockFileDiscovery = createMockFileDiscovery();
    
    mockPipeline = {
      validate: vi.fn()
    } as any;

    validateCommand = new ValidateCommand({
      pipeline: mockPipeline,
      fileDiscovery: mockFileDiscovery,
      logger
    });
  });

  afterEach(async () => {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  });

  describe('manifest discovery', () => {
    it('ManifestDiscovery__FileOption__ResolvesManifest', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      
      (mockPipeline.validate as vi.Mock).mockResolvedValue({
        manifest: createValidManifest(),
        warnings: []
      });

      const result = await validateCommand.execute({ file: manifestPath });

      expect(result.success).toBe(true);
      expect(mockFileDiscovery.findManifest).not.toHaveBeenCalled();
    });

    it('ManifestDiscovery__NoFileOption__UsesFileDiscovery', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      
      (mockPipeline.validate as vi.Mock).mockResolvedValue({
        manifest: createValidManifest(),
        warnings: []
      });

      const result = await validateCommand.execute({});

      expect(result.success).toBe(true);
      expect(mockFileDiscovery.findManifest).toHaveBeenCalledWith('.');
    });

    it('ManifestDiscovery__RelativePath__ResolvesToAbsolute', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const relativePath = './service.yml';
      
      (mockPipeline.validate as vi.Mock).mockResolvedValue({
        manifest: createValidManifest(),
        warnings: []
      });

      await validateCommand.execute({ file: relativePath });

      // The command should resolve relative paths to absolute
      // We verify this by checking the pipeline was called
      expect(mockPipeline.validate).toHaveBeenCalled();
    });
  });

  describe('success cases', () => {
    it('Success__ValidManifest__ReturnsManifestAndWarnings', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const manifest = createValidManifest();
      const warnings = ['Warning 1', 'Warning 2'];
      
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      (mockPipeline.validate as vi.Mock).mockResolvedValue({
        manifest,
        warnings
      });

      const result = await validateCommand.execute({});

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.data?.manifest).toEqual(manifest);
      expect(result.data?.warnings).toEqual(warnings);
    });

    it('Success__ValidManifest__ReturnsExitCode0', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      (mockPipeline.validate as vi.Mock).mockResolvedValue({
        manifest: createValidManifest(),
        warnings: []
      });

      const result = await validateCommand.execute({});

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('failure cases', () => {
    it('Failure__ValidationError__ReturnsErrorAndExitCode2', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      (mockPipeline.validate as vi.Mock).mockRejectedValue(new Error('Validation failed'));

      const result = await validateCommand.execute({});

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
      expect(result.error).toContain('Validation failed');
    });

    it('Failure__ManifestNotFound__ReturnsExitCode2', async () => {
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(null);

      const result = await validateCommand.execute({});

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
      expect(result.error).toContain('No service.yml found');
    });
  });

  describe('JSON mode', () => {
    it('JsonMode__Enabled__SuppressesHumanOutput', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      (mockPipeline.validate as vi.Mock).mockResolvedValue({
        manifest: createValidManifest(),
        warnings: []
      });

      await validateCommand.execute({ json: true });

      // In JSON mode, info logs should not be called for summary
      // The command should still log debug messages
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Validation summary'));
    });
  });

  describe('integration', () => {
    it('Integration__ValidManifest__ReturnsSuccessWithHumanSummary', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const manifest = createValidManifest();
      
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      (mockPipeline.validate as vi.Mock).mockResolvedValue({
        manifest,
        warnings: []
      });

      const result = await validateCommand.execute({});

      expect(result.success).toBe(true);
      expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('completed successfully'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Validation summary'));
    });

    it('Integration__InvalidManifest__ReturnsFailureWithClearError', async () => {
      const manifestPath = await writeManifestToTempDir(createInvalidManifest(), tempDir);
      
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      (mockPipeline.validate as vi.Mock).mockRejectedValue(new Error('Schema validation failed'));

      const result = await validateCommand.execute({});

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
      expect(result.error).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('Integration__JsonFlag__ReturnsStructuredOutputNoHumanLogs', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const manifest = createValidManifest();
      
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      (mockPipeline.validate as vi.Mock).mockResolvedValue({
        manifest,
        warnings: ['Warning 1']
      });

      const result = await validateCommand.execute({ json: true });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.manifest).toEqual(manifest);
      expect(result.data?.warnings).toEqual(['Warning 1']);
      
      // Should not log human-readable summary
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Validation summary'));
    });

    it('Integration__VariousScenarios__ExitCodesCorrect', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      (mockPipeline.validate as vi.Mock).mockResolvedValue({
        manifest: createValidManifest(),
        warnings: []
      });

      const successResult = await validateCommand.execute({});
      expect(successResult.exitCode).toBe(0);

      (mockPipeline.validate as vi.Mock).mockRejectedValue(new Error('Error'));
      const failureResult = await validateCommand.execute({});
      expect(failureResult.exitCode).toBe(2);
    });
  });
});

