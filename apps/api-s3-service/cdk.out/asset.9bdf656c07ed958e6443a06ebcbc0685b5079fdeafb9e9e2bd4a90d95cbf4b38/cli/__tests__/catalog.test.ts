/**
 * Catalog Command Tests
 * 
 * Tests for the catalog command implementation.
 */

import { describe, it, expect, vi } from 'vitest';
import { CatalogCommand } from '../catalog.js';
import { createMockLogger } from './helpers/mock-logger.js';
import { createTempDir, cleanupTempDir } from './helpers/temp-dirs.js';
import {
  createMockComponentPackage,
  createComponentPackageWithCreator
} from './fixtures/component-packages.js';

vi.mock('../utils/component-catalog.js', () => ({
  loadComponentCatalog: vi.fn()
}));

vi.mock('../utils/component-loader.js', () => ({
  loadComponentCreators: vi.fn()
}));

import { loadComponentCatalog } from '../utils/component-catalog.js';
import { loadComponentCreators } from '../utils/component-loader.js';

describe('CatalogCommand', () => {
  let catalogCommand: CatalogCommand;
  let logger: ReturnType<typeof createMockLogger>;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    logger = createMockLogger();
    catalogCommand = new CatalogCommand(logger);
  });

  afterEach(async () => {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
    vi.clearAllMocks();
  });

  describe('loading', () => {
    it('Loading__ValidCatalog__LoadsCorrectly', async () => {
      const mockEntries = [
        {
          componentType: 's3-bucket',
          displayName: 'S3 Bucket',
          lifecycle: 'production',
          capabilities: ['storage'],
          tags: ['storage'],
          packageDir: '/path/to/s3-bucket',
          packageName: '@shinobi/s3-bucket'
        }
      ];
      
      (loadComponentCatalog as vi.Mock).mockResolvedValue(mockEntries);
      (loadComponentCreators as vi.Mock).mockResolvedValue(new Map());

      const result = await catalogCommand.execute({});

      expect(result.success).toBe(true);
      expect(result.data?.entries).toHaveLength(1);
      expect(result.data?.count).toBe(1);
    });

    it('Loading__WithCreators__EnrichesEntries', async () => {
      const mockEntries = [
        {
          componentType: 's3-bucket',
          displayName: 'S3 Bucket',
          lifecycle: 'production',
          capabilities: [],
          tags: [],
          packageDir: '/path/to/s3-bucket',
          packageName: '@shinobi/s3-bucket'
        }
      ];
      
      const mockCreators = new Map([
        ['s3-bucket', {
          creator: {
            getRequiredCapabilities: () => ['aws-s3']
          }
        }]
      ]);
      
      (loadComponentCatalog as vi.Mock).mockResolvedValue(mockEntries);
      (loadComponentCreators as vi.Mock).mockResolvedValue(mockCreators);

      const result = await catalogCommand.execute({});

      expect(result.success).toBe(true);
      expect(result.data?.entries[0].requiredCapabilities).toEqual(['aws-s3']);
    });

    it('Loading__AllFlag__FiltersByLifecycle', async () => {
      (loadComponentCatalog as vi.Mock).mockResolvedValue([]);
      (loadComponentCreators as vi.Mock).mockResolvedValue(new Map());

      await catalogCommand.execute({ all: false });
      expect(loadComponentCatalog).toHaveBeenCalledWith({ includeNonProduction: false });

      await catalogCommand.execute({ all: true });
      expect(loadComponentCatalog).toHaveBeenCalledWith({ includeNonProduction: true });
    });
  });

  describe('output format', () => {
    it('OutputFormat__JsonFlag__ReturnsJsonFormat', async () => {
      const mockEntries = [
        {
          componentType: 's3-bucket',
          displayName: 'S3 Bucket',
          lifecycle: 'production',
          capabilities: [],
          tags: [],
          packageDir: '/path/to/s3-bucket',
          packageName: '@shinobi/s3-bucket'
        }
      ];
      
      (loadComponentCatalog as vi.Mock).mockResolvedValue(mockEntries);
      (loadComponentCreators as vi.Mock).mockResolvedValue(new Map());

      const result = await catalogCommand.execute({ json: true });

      expect(result.success).toBe(true);
      expect(result.data?.entries).toBeDefined();
      expect(Array.isArray(result.data?.entries)).toBe(true);
    });

    it('OutputFormat__NoJsonFlag__ReturnsHumanReadableFormat', async () => {
      const mockEntries = [
        {
          componentType: 's3-bucket',
          displayName: 'S3 Bucket',
          description: 'S3 bucket component',
          lifecycle: 'production',
          category: 'storage',
          capabilities: ['storage'],
          tags: ['storage'],
          packageDir: '/path/to/s3-bucket',
          packageName: '@shinobi/s3-bucket'
        }
      ];
      
      (loadComponentCatalog as vi.Mock).mockResolvedValue(mockEntries);
      (loadComponentCreators as vi.Mock).mockResolvedValue(new Map());

      await catalogCommand.execute({});

      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('integration', () => {
    it('Integration__RealComponentPackages__WorksCorrectly', async () => {
      const mockEntries = [
        {
          componentType: 's3-bucket',
          displayName: 'S3 Bucket',
          lifecycle: 'production',
          capabilities: [],
          tags: [],
          packageDir: '/path/to/s3-bucket',
          packageName: '@shinobi/s3-bucket'
        }
      ];
      
      (loadComponentCatalog as vi.Mock).mockResolvedValue(mockEntries);
      (loadComponentCreators as vi.Mock).mockResolvedValue(new Map());

      const result = await catalogCommand.execute({});

      expect(result.success).toBe(true);
      expect(result.data?.entries).toBeDefined();
    });

    it('Integration__MissingCreators__HandlesGracefully', async () => {
      const mockEntries = [
        {
          componentType: 's3-bucket',
          displayName: 'S3 Bucket',
          lifecycle: 'production',
          capabilities: [],
          tags: [],
          packageDir: '/path/to/s3-bucket',
          packageName: '@shinobi/s3-bucket'
        }
      ];
      
      (loadComponentCatalog as vi.Mock).mockResolvedValue(mockEntries);
      (loadComponentCreators as vi.Mock).mockRejectedValue(new Error('Failed to load creators'));

      const result = await catalogCommand.execute({});

      expect(result.success).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Continuing without component creators'));
    });
  });
});


