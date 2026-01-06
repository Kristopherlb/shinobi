/**
 * Synth Command Tests
 * 
 * Tests for the synth command implementation.
 */

import { SynthCommand } from '../synth-command.js';
import { createMockLogger } from './helpers/mock-logger.js';
import { createMockFileDiscovery } from './helpers/mock-file-discovery.js';
import { createTempDir, cleanupTempDir, writeManifestToTempDir } from './helpers/temp-dirs.js';
import { createValidManifest } from './fixtures/manifests.js';

jest.mock('../utils/service-synthesizer.js', () => ({
  readManifest: jest.fn(),
  synthesizeService: jest.fn()
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
    jest.clearAllMocks();
  });

  describe('manifest resolution', () => {
    it('resolves explicit file path', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      const readManifestMock = readManifest as jest.Mock;
      const synthesizeServiceMock = synthesizeService as jest.Mock;
      
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

    it('uses fileDiscovery when file not provided', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);
      
      const readManifestMock = readManifest as jest.Mock;
      const synthesizeServiceMock = synthesizeService as jest.Mock;
      
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
    it('fails when account ID cannot be determined', async () => {
      const originalEnv = process.env.CDK_DEFAULT_ACCOUNT;
      delete process.env.CDK_DEFAULT_ACCOUNT;
      
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);
      
      const readManifestMock = readManifest as jest.Mock;
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
    it('generates valid CDK assembly', async () => {
      const manifestPath = await writeManifestToTempDir(createValidManifest(), tempDir);
      (mockFileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);
      
      const readManifestMock = readManifest as jest.Mock;
      const synthesizeServiceMock = synthesizeService as jest.Mock;
      
      process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
      process.env.CDK_DEFAULT_REGION = 'us-east-1';
      
      readManifestMock.mockResolvedValue(createValidManifest());
      synthesizeServiceMock.mockResolvedValue({
        manifest: createValidManifest(),
        outputDir: tempDir,
        stacks: [{ id: 'test-stack' }],
        components: [{ name: 'test-component', type: 's3-bucket' }]
      });

      const result = await synthCommand.execute({});

      expect(result.success).toBe(true);
      expect(result.data?.stacks).toBeDefined();
      expect(result.data?.components).toBeDefined();
    });
  });
});




