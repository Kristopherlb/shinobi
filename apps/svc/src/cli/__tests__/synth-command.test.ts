/**
 * Synth Command Tests
 * 
 * Tests for the synth command implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SynthCommand } from '../synth-command.js';
import { createMockLogger } from './helpers/mock-logger.js';
import { createMockFileDiscovery } from './helpers/mock-file-discovery.js';
import { createTempDir, cleanupTempDir, writeManifestToTempDir } from './helpers/temp-dirs.js';
import { createValidManifest } from './fixtures/manifests.js';

vi.mock('../utils/service-synthesizer.js', () => ({
  readManifest: vi.fn(),
  synthesizeService: vi.fn()
}));

import { readManifest, synthesizeService } from '../utils/service-synthesizer.js';

describe('SynthCommand', () => {
  let synthCommand: SynthCommand;
  let mockFileDiscovery: ReturnType<typeof createMockFileDiscovery>;
  let logger: ReturnType<typeof createMockLogger>;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    logger = createMockLogger();
    mockFileDiscovery = createMockFileDiscovery();
    
    synthCommand = new SynthCommand({
      fileDiscovery: mockFileDiscovery,
      logger
    });
  });

  afterEach(async () => {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
    vi.clearAllMocks();
  });

  describe('manifest resolution', () => {
    it('ManifestResolution__ExplicitPath__ResolvesCorrectly', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const readManifestMock = readManifest as vi.Mock;
      const synthesizeServiceMock = synthesizeService as vi.Mock;
      
      readManifestMock.mockResolvedValue(createValidManifest());
      synthesizeServiceMock.mockResolvedValue({
        manifest: createValidManifest(),
        outputDir: tempDir,
        stacks: [],
        components: []
      });

      await synthCommand.execute({ file: manifestPath });

      expect(readManifestMock).toHaveBeenCalled();
    });

    it('ManifestResolution__NoFileProvided__UsesFileDiscovery', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      
      const readManifestMock = readManifest as vi.Mock;
      const synthesizeServiceMock = synthesizeService as vi.Mock;
      
      readManifestMock.mockResolvedValue(createValidManifest());
      synthesizeServiceMock.mockResolvedValue({
        manifest: createValidManifest(),
        outputDir: tempDir,
        stacks: [],
        components: []
      });

      await synthCommand.execute({});

      expect(mockFileDiscovery.findManifest).toHaveBeenCalled();
    });
  });

  describe('account ID validation', () => {
    it('AccountIdValidation__MissingAccountId__FailsWithExitCode2', async () => {
      const originalEnv = process.env.CDK_DEFAULT_ACCOUNT;
      delete process.env.CDK_DEFAULT_ACCOUNT;
      
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      
      const readManifestMock = readManifest as vi.Mock;
      readManifestMock.mockResolvedValue({});

      const result = await synthCommand.execute({});

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
      
      if (originalEnv) {
        process.env.CDK_DEFAULT_ACCOUNT = originalEnv;
      }
    });
  });

  describe('integration', () => {
    it('Integration__ValidManifest__GeneratesValidAssembly', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
      
      const readManifestMock = readManifest as vi.Mock;
      const synthesizeServiceMock = synthesizeService as vi.Mock;
      
      process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
      process.env.CDK_DEFAULT_REGION = 'us-east-1';
      
      readManifestMock.mockResolvedValue(createValidManifest());
      synthesizeServiceMock.mockResolvedValue({
        manifest: createValidManifest(),
        outputDir: tempDir,
        assembly: {
          stacks: [{ id: 'test-stack', templateFile: 'test-stack.template.json', displayName: 'test-stack' }],
          directory: tempDir
        },
        components: [{ name: 'test-component', type: 's3-bucket' }]
      });

      const result = await synthCommand.execute({});

      expect(result.success).toBe(true);
      expect(result.data?.stacks).toBeDefined();
      expect(result.data?.components).toBeDefined();
    });
  });
});




