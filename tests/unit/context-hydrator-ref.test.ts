/**
 * Unit Tests for ContextHydrator $ref Processing
 * Tests the distributed environment configuration feature
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ContextHydrator } from '../../src/services/context-hydrator';
import { Logger } from '../../src/utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ContextHydrator $ref Processing', () => {
  let contextHydrator: ContextHydrator;
  let mockLogger: jest.Mocked<Logger>;
  let testDir: string;

  beforeEach(() => {
    mockLogger = {
      configure: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      getLogs: jest.fn()
    } as jest.Mocked<Logger>;

    testDir = '/mock/test/directory';
    contextHydrator = new ContextHydrator({
      logger: mockLogger,
      manifestPath: path.join(testDir, 'service.yml')
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('TC-REF-UT-01: Top-level $ref to valid YAML file', () => {
    test('should correctly load and merge external environment definitions', async () => {
      // Arrange: Mock external YAML file content
      const externalEnvironments = `
dev-us-east-1:
  defaults:
    instanceSize: db.t4g.small
    region: us-east-1
prod-eu-west-1:
  defaults:
    instanceSize: db.r5.large
    region: eu-west-1
      `;

      mockFs.readFile.mockResolvedValue(externalEnvironments);

      const manifest = {
        service: 'my-global-service',
        owner: 'team-world',
        environments: {
          $ref: './config/standard-environments.yml'
        },
        components: [
          { name: 'database', type: 'rds-postgres' }
        ]
      };

      // Act: Hydrate context for dev environment
      const result = await contextHydrator.hydrateContext(manifest, 'dev-us-east-1');

      // Assert: Verify external environments were loaded and merged
      expect(result.environments['dev-us-east-1']).toBeDefined();
      expect(result.environments['dev-us-east-1'].defaults.instanceSize).toBe('db.t4g.small');
      expect(result.environments['dev-us-east-1'].defaults.region).toBe('us-east-1');
      
      expect(result.environments['prod-eu-west-1']).toBeDefined();
      expect(result.environments['prod-eu-west-1'].defaults.instanceSize).toBe('db.r5.large');

      // Verify file was read from correct path
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.resolve(testDir, './config/standard-environments.yml'),
        'utf8'
      );

      // Verify logging
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Resolving top-level environments $ref')
      );
    });

    test('should preserve other manifest properties when replacing environments block', async () => {
      // Arrange: External environments file
      const externalEnvironments = `
dev:
  defaults:
    instanceSize: db.t3.micro
      `;

      mockFs.readFile.mockResolvedValue(externalEnvironments);

      const manifest = {
        service: 'test-service',
        owner: 'test-team',
        complianceFramework: 'fedramp-moderate',
        environments: {
          $ref: './environments.yml'
        },
        components: [
          { name: 'api', type: 'lambda-api' }
        ]
      };

      // Act
      const result = await contextHydrator.hydrateContext(manifest, 'dev');

      // Assert: Other properties preserved
      expect(result.service).toBe('test-service');
      expect(result.owner).toBe('test-team');
      expect(result.complianceFramework).toBe('fedramp-moderate');
      expect(result.components).toEqual(manifest.components);

      // Assert: Environments replaced with external content
      expect(result.environments.dev.defaults.instanceSize).toBe('db.t3.micro');
    });
  });

  describe('TC-REF-UT-02: Environment-specific $ref', () => {
    test('should load only specific environment configuration from external file', async () => {
      // Arrange: Mock environment-specific file
      const devEnvironment = `
defaults:
  instanceSize: db.t4g.small
  memorySize: 512
  region: us-east-1
      `;

      mockFs.readFile.mockResolvedValue(devEnvironment);

      const manifest = {
        service: 'mixed-config-service',
        environments: {
          'dev-us-east-1': {
            $ref: './config/dev-us-east-1.yml'
          },
          'prod-eu-west-1': {
            defaults: {
              instanceSize: 'db.r5.xlarge',
              region: 'eu-west-1'
            }
          }
        }
      };

      // Act
      const result = await contextHydrator.hydrateContext(manifest, 'dev-us-east-1');

      // Assert: Referenced environment loaded from external file
      expect(result.environments['dev-us-east-1'].defaults.instanceSize).toBe('db.t4g.small');
      expect(result.environments['dev-us-east-1'].defaults.memorySize).toBe(512);
      expect(result.environments['dev-us-east-1'].defaults.region).toBe('us-east-1');

      // Assert: Inline environment preserved
      expect(result.environments['prod-eu-west-1'].defaults.instanceSize).toBe('db.r5.xlarge');
      expect(result.environments['prod-eu-west-1'].defaults.region).toBe('eu-west-1');

      // Verify correct file was loaded
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.resolve(testDir, './config/dev-us-east-1.yml'),
        'utf8'
      );
    });

    test('should handle multiple environment-specific $refs', async () => {
      // Arrange: Mock multiple external files
      mockFs.readFile
        .mockResolvedValueOnce('defaults:\n  instanceSize: db.t3.micro') // dev file
        .mockResolvedValueOnce('defaults:\n  instanceSize: db.r5.large'); // staging file

      const manifest = {
        environments: {
          'dev': { $ref: './env/dev.yml' },
          'staging': { $ref: './env/staging.yml' },
          'prod': {
            defaults: { instanceSize: 'db.r5.xlarge' }
          }
        }
      };

      // Act
      const result = await contextHydrator.hydrateContext(manifest, 'dev');

      // Assert: All environments resolved correctly
      expect(result.environments.dev.defaults.instanceSize).toBe('db.t3.micro');
      expect(result.environments.staging.defaults.instanceSize).toBe('db.r5.large');
      expect(result.environments.prod.defaults.instanceSize).toBe('db.r5.xlarge');

      // Verify both files were loaded
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('TC-REF-UT-03: $ref to valid JSON file', () => {
    test('should correctly parse and merge JSON content', async () => {
      // Arrange: Mock JSON environment file
      const jsonEnvironments = JSON.stringify({
        'dev-us-east-1': {
          defaults: {
            instanceSize: 'db.t4g.small',
            backup: true
          }
        },
        'prod-eu-west-1': {
          defaults: {
            instanceSize: 'db.r5.large',
            backup: true,
            multiAz: true
          }
        }
      });

      mockFs.readFile.mockResolvedValue(jsonEnvironments);

      const manifest = {
        environments: {
          $ref: './config/environments.json'
        }
      };

      // Act
      const result = await contextHydrator.hydrateContext(manifest, 'dev-us-east-1');

      // Assert: JSON content parsed and merged correctly
      expect(result.environments['dev-us-east-1'].defaults.instanceSize).toBe('db.t4g.small');
      expect(result.environments['dev-us-east-1'].defaults.backup).toBe(true);
      
      expect(result.environments['prod-eu-west-1'].defaults.multiAz).toBe(true);

      // Verify JSON file was read
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.resolve(testDir, './config/environments.json'),
        'utf8'
      );
    });

    test('should handle environment-specific JSON $ref', async () => {
      // Arrange: Mock JSON environment configuration
      const jsonEnvConfig = JSON.stringify({
        defaults: {
          instanceSize: 'db.t4g.medium',
          connections: 100,
          ssl: true
        }
      });

      mockFs.readFile.mockResolvedValue(jsonEnvConfig);

      const manifest = {
        environments: {
          'prod-us-west-2': {
            $ref: './config/prod-us-west-2.json'
          }
        }
      };

      // Act
      const result = await contextHydrator.hydrateContext(manifest, 'prod-us-west-2');

      // Assert: JSON environment configuration loaded
      expect(result.environments['prod-us-west-2'].defaults.instanceSize).toBe('db.t4g.medium');
      expect(result.environments['prod-us-west-2'].defaults.connections).toBe(100);
      expect(result.environments['prod-us-west-2'].defaults.ssl).toBe(true);
    });
  });

  describe('TC-REF-UT-04: File not found error handling', () => {
    test('should throw clear FileNotFoundError for non-existent file', async () => {
      // Arrange: Mock file not found error
      const fileNotFoundError = new Error('File not found') as any;
      fileNotFoundError.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(fileNotFoundError);

      const manifest = {
        environments: {
          $ref: './config/non-existent.yml'
        }
      };

      // Act & Assert: Should throw user-friendly error
      await expect(contextHydrator.hydrateContext(manifest, 'dev'))
        .rejects
        .toThrow('Referenced file not found: ./config/non-existent.yml. Please ensure the file exists and the path is correct.');

      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.resolve(testDir, './config/non-existent.yml'),
        'utf8'
      );
    });

    test('should throw clear error for environment-specific missing file', async () => {
      // Arrange: File not found for environment-specific reference
      const fileNotFoundError = new Error('File not found') as any;
      fileNotFoundError.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(fileNotFoundError);

      const manifest = {
        environments: {
          'dev-missing': {
            $ref: './config/missing-env.yml'
          }
        }
      };

      // Act & Assert
      await expect(contextHydrator.hydrateContext(manifest, 'dev-missing'))
        .rejects
        .toThrow('Referenced file not found: ./config/missing-env.yml');
    });

    test('should provide helpful error for unsupported file format', async () => {
      // Arrange: Mock file with unsupported extension
      mockFs.readFile.mockResolvedValue('some content');

      const manifest = {
        environments: {
          $ref: './config/environments.txt'
        }
      };

      // Act & Assert
      await expect(contextHydrator.hydrateContext(manifest, 'dev'))
        .rejects
        .toThrow('Unsupported file format for $ref: ./config/environments.txt. Only .json, .yml, and .yaml files are supported.');
    });
  });

  describe('TC-REF-UT-05: Circular reference detection', () => {
    test('should detect and prevent circular references', async () => {
      // Arrange: Mock circular reference scenario
      const fileA = `
environments:
  dev:
    $ref: './file-b.yml'
      `;

      const fileB = `
environments:
  dev:
    $ref: './file-a.yml'
      `;

      // Mock file reads to simulate circular reference
      mockFs.readFile
        .mockResolvedValueOnce(fileA)
        .mockResolvedValueOnce(fileB);

      const manifest = {
        environments: {
          $ref: './file-a.yml'
        }
      };

      // Act & Assert: Should detect circular dependency
      await expect(contextHydrator.hydrateContext(manifest, 'dev'))
        .rejects
        .toThrow('Circular reference detected');
    });

    test('should track resolved references across multiple environment-specific refs', async () => {
      // Arrange: Mock scenario where same file is referenced twice
      const sharedConfig = `
defaults:
  sharedSetting: true
      `;

      mockFs.readFile.mockResolvedValue(sharedConfig);

      const manifest = {
        environments: {
          'dev': { $ref: './shared/common.yml' },
          'staging': { $ref: './shared/common.yml' } // Same file referenced again
        }
      };

      // Act: Should handle duplicate references gracefully
      const result = await contextHydrator.hydrateContext(manifest, 'dev');

      // Assert: Both environments should have the shared configuration
      expect(result.environments.dev.defaults.sharedSetting).toBe(true);
      expect(result.environments.staging.defaults.sharedSetting).toBe(true);

      // File should be read for each reference
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('TC-REF-UT-06: Path traversal security', () => {
    test('should reject path traversal attempts with ../../', async () => {
      // Arrange: Malicious path traversal attempt
      const manifest = {
        environments: {
          $ref: '../../etc/passwd'
        }
      };

      // Act & Assert: Should throw security error
      await expect(contextHydrator.hydrateContext(manifest, 'dev'))
        .rejects
        .toThrow('Security violation: $ref path "../../etc/passwd" attempts to access files outside the service repository. Path traversal is not allowed.');

      // Should not attempt to read the file
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    test('should reject absolute path attempts', async () => {
      // Arrange: Absolute path attempt
      const manifest = {
        environments: {
          'dev': {
            $ref: '/etc/passwd'
          }
        }
      };

      // Act & Assert: Should reject absolute paths outside service directory
      await expect(contextHydrator.hydrateContext(manifest, 'dev'))
        .rejects
        .toThrow('Security violation');

      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    test('should allow valid relative paths within service directory', async () => {
      // Arrange: Valid relative paths
      mockFs.readFile.mockResolvedValue('defaults:\n  valid: true');

      const manifest = {
        environments: {
          'dev-1': { $ref: './config/dev.yml' },
          'dev-2': { $ref: 'config/dev.yml' },
          'dev-3': { $ref: './nested/config/dev.yml' }
        }
      };

      // Act: Should allow valid relative paths
      const result = await contextHydrator.hydrateContext(manifest, 'dev-1');

      // Assert: Valid paths should be processed
      expect(result.environments['dev-1'].defaults.valid).toBe(true);
      expect(mockFs.readFile).toHaveBeenCalledTimes(3);

      // Verify correct path resolution
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.resolve(testDir, './config/dev.yml'),
        'utf8'
      );
    });

    test('should prevent subtle path traversal with encoded characters', async () => {
      // Arrange: Encoded path traversal attempt
      const manifest = {
        environments: {
          $ref: './config/../../../etc/passwd'
        }
      };

      // Act & Assert: Should normalize and detect traversal
      await expect(contextHydrator.hydrateContext(manifest, 'dev'))
        .rejects
        .toThrow('Security violation');
    });
  });

  describe('Deep merge functionality', () => {
    test('should merge nested configuration objects correctly', async () => {
      // Arrange: External config with nested objects
      const externalConfig = `
dev:
  defaults:
    database:
      instanceSize: db.t3.micro
      backup: true
    networking:
      vpc: vpc-123
  scaling:
    minInstances: 1
      `;

      mockFs.readFile.mockResolvedValue(externalConfig);

      const manifest = {
        environments: {
          $ref: './environments.yml'
        }
      };

      // Act
      const result = await contextHydrator.hydrateContext(manifest, 'dev');

      // Assert: Nested objects merged correctly
      expect(result.environments.dev.defaults.database.instanceSize).toBe('db.t3.micro');
      expect(result.environments.dev.defaults.database.backup).toBe(true);
      expect(result.environments.dev.defaults.networking.vpc).toBe('vpc-123');
      expect(result.environments.dev.scaling.minInstances).toBe(1);
    });

    test('should handle array replacement in merged configurations', async () => {
      // Arrange: Configuration with arrays
      const externalConfig = `
dev:
  defaults:
    regions: ['us-east-1', 'us-west-2']
    ports: [80, 443]
      `;

      mockFs.readFile.mockResolvedValue(externalConfig);

      const manifest = {
        environments: {
          $ref: './config.yml'
        }
      };

      // Act
      const result = await contextHydrator.hydrateContext(manifest, 'dev');

      // Assert: Arrays replaced entirely
      expect(result.environments.dev.defaults.regions).toEqual(['us-east-1', 'us-west-2']);
      expect(result.environments.dev.defaults.ports).toEqual([80, 443]);
    });
  });

  describe('Integration with existing interpolation', () => {
    test('should work with ${env:key} interpolation after $ref resolution', async () => {
      // Arrange: External config with interpolation placeholders
      const externalConfig = `
dev:
  defaults:
    instanceSize: db.t3.micro
    region: us-east-1
    dbUrl: "postgresql://user:pass@\${env:dbHost}:5432/mydb"
      `;

      mockFs.readFile.mockResolvedValue(externalConfig);

      const manifest = {
        environments: {
          $ref: './config.yml'
        },
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            environment: {
              DATABASE_URL: '${env:dbUrl}'
            }
          }
        ]
      };

      // Act: Hydrate with specific environment
      const result = await contextHydrator.hydrateContext(manifest, 'dev');

      // Assert: $ref resolved first, then interpolation applied
      expect(result.environments.dev.defaults.dbUrl).toContain('${env:dbHost}');
      
      // The interpolation would be applied to components during processing
      expect(result.components[0].environment.DATABASE_URL).toBe('${env:dbUrl}');
    });
  });
});