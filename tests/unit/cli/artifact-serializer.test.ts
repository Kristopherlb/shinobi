import { JSONArtifactSerializer, YAMLArtifactSerializer, ArtifactSerializerFactory } from '../../../src/platform/services/artifact-serializer';
import { PlanArtifact, DeploymentArtifact, MigrationArtifact } from '../../../src/platform/contracts/artifacts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs module
jest.mock('fs', () => ({
  mkdtempSync: jest.fn((prefix) => prefix + 'temp-dir'),
  rmSync: jest.fn(),
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn()
  }
}));

describe('ArtifactSerializer', () => {
  let tempDir: string;
  let jsonSerializer: JSONArtifactSerializer;
  let yamlSerializer: YAMLArtifactSerializer;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-test-'));
    jsonSerializer = new JSONArtifactSerializer();
    yamlSerializer = new YAMLArtifactSerializer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('JSONArtifactSerializer', () => {
    it('should serialize plan artifact to JSON', () => {
      const planArtifact: PlanArtifact = {
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'plan',
        environment: 'dev',
        serviceName: 'test-service',
        complianceFramework: 'commercial',
        components: [],
        summary: {
          totalComponents: 0,
          totalResources: 0,
          changes: {
            added: [],
            modified: [],
            removed: [],
            unchanged: []
          },
          complianceStatus: 'compliant',
          warnings: [],
          errors: []
        },
        validation: {
          valid: true,
          errors: [],
          warnings: [],
          complianceErrors: []
        },
        compliance: {
          framework: 'commercial',
          totalControls: 0,
          compliantComponents: 0,
          nonCompliantComponents: 0,
          partialCompliantComponents: 0,
          controls: []
        }
      };

      const serialized = jsonSerializer.serialize(planArtifact);
      const parsed = JSON.parse(serialized);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.command).toBe('plan');
      expect(parsed.serviceName).toBe('test-service');
    });

    it('should deserialize JSON artifact', () => {
      const jsonData = JSON.stringify({
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'plan',
        environment: 'dev',
        serviceName: 'test-service',
        complianceFramework: 'commercial'
      });

      const deserialized = jsonSerializer.deserialize<PlanArtifact>(jsonData);

      expect(deserialized.version).toBe('1.0.0');
      expect(deserialized.command).toBe('plan');
      expect(deserialized.serviceName).toBe('test-service');
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = '{ invalid json }';

      expect(() => {
        jsonSerializer.deserialize(invalidJson);
      }).toThrow('Failed to deserialize JSON artifact');
    });

    it('should write artifact to file', async () => {
      const artifact = {
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'plan',
        environment: 'dev',
        serviceName: 'test-service',
        complianceFramework: 'commercial' as const
      };

      const filePath = path.join(tempDir, 'test-artifact.json');
      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      await jsonSerializer.writeToFile(artifact, filePath);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.dirname(filePath), { recursive: true });
      expect(fs.promises.writeFile).toHaveBeenCalledWith(filePath, expect.any(String), 'utf8');
    });

    it('should read artifact from file', async () => {
      const artifact = {
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'plan',
        environment: 'dev',
        serviceName: 'test-service',
        complianceFramework: 'commercial' as const
      };

      const filePath = path.join(tempDir, 'test-artifact.json');
      const jsonData = JSON.stringify(artifact, null, 2);

      (fs.promises.readFile as jest.Mock).mockResolvedValue(jsonData);

      const result = await jsonSerializer.readFromFile<PlanArtifact>(filePath);

      expect(result.version).toBe('1.0.0');
      expect(result.serviceName).toBe('test-service');
    });
  });

  describe('YAMLArtifactSerializer', () => {
    it('should serialize plan artifact to YAML', () => {
      const planArtifact: PlanArtifact = {
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'plan',
        environment: 'dev',
        serviceName: 'test-service',
        complianceFramework: 'commercial',
        components: [],
        summary: {
          totalComponents: 0,
          totalResources: 0,
          changes: {
            added: [],
            modified: [],
            removed: [],
            unchanged: []
          },
          complianceStatus: 'compliant',
          warnings: [],
          errors: []
        },
        validation: {
          valid: true,
          errors: [],
          warnings: [],
          complianceErrors: []
        },
        compliance: {
          framework: 'commercial',
          totalControls: 0,
          compliantComponents: 0,
          nonCompliantComponents: 0,
          partialCompliantComponents: 0,
          controls: []
        }
      };

      const serialized = yamlSerializer.serialize(planArtifact);

      expect(serialized).toContain('version: 1.0.0');
      expect(serialized).toContain('command: plan');
      expect(serialized).toContain('serviceName: test-service');
    });

    it('should deserialize YAML artifact', () => {
      const yamlData = `
version: 1.0.0
timestamp: '2023-01-01T00:00:00.000Z'
command: plan
environment: dev
serviceName: test-service
complianceFramework: commercial
      `;

      const deserialized = yamlSerializer.deserialize<PlanArtifact>(yamlData);

      expect(deserialized.version).toBe('1.0.0');
      expect(deserialized.command).toBe('plan');
      expect(deserialized.serviceName).toBe('test-service');
    });

    it('should handle invalid YAML gracefully', () => {
      const invalidYaml = 'invalid: yaml: content: [';

      expect(() => {
        yamlSerializer.deserialize(invalidYaml);
      }).toThrow('Failed to deserialize YAML artifact');
    });

    it('should write artifact to file', async () => {
      const artifact = {
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'plan',
        environment: 'dev',
        serviceName: 'test-service',
        complianceFramework: 'commercial' as const
      };

      const filePath = path.join(tempDir, 'test-artifact.yaml');
      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      await yamlSerializer.writeToFile(artifact, filePath);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.dirname(filePath), { recursive: true });
      expect(fs.promises.writeFile).toHaveBeenCalledWith(filePath, expect.any(String), 'utf8');
    });
  });

  describe('ArtifactSerializerFactory', () => {
    it('should create JSON serializer', () => {
      const serializer = ArtifactSerializerFactory.create('json');
      expect(serializer).toBeInstanceOf(JSONArtifactSerializer);
    });

    it('should create YAML serializer', () => {
      const serializer = ArtifactSerializerFactory.create('yaml');
      expect(serializer).toBeInstanceOf(YAMLArtifactSerializer);
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        ArtifactSerializerFactory.create('xml' as any);
      }).toThrow('Unsupported artifact format: xml');
    });
  });

  describe('Round-trip serialization', () => {
    it('should preserve data through JSON round-trip', () => {
      const originalArtifact: PlanArtifact = {
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'plan',
        environment: 'dev',
        serviceName: 'test-service',
        complianceFramework: 'commercial',
        components: [
          {
            componentId: 'test-component',
            componentType: 's3-bucket',
            config: {
              final: { bucketName: 'test-bucket' },
              appliedDefaults: {},
              environmentOverrides: {},
              complianceDefaults: {}
            },
            complianceControls: ['AC-2', 'SC-7'],
            dependencies: [],
            resources: [],
            changes: {
              added: [],
              modified: [],
              removed: [],
              unchanged: []
            }
          }
        ],
        summary: {
          totalComponents: 1,
          totalResources: 0,
          changes: {
            added: [],
            modified: [],
            removed: [],
            unchanged: []
          },
          complianceStatus: 'compliant',
          warnings: [],
          errors: []
        },
        validation: {
          valid: true,
          errors: [],
          warnings: [],
          complianceErrors: []
        },
        compliance: {
          framework: 'commercial',
          totalControls: 2,
          compliantComponents: 1,
          nonCompliantComponents: 0,
          partialCompliantComponents: 0,
          controls: []
        }
      };

      const serialized = jsonSerializer.serialize(originalArtifact);
      const deserialized = jsonSerializer.deserialize<PlanArtifact>(serialized);

      expect(deserialized).toEqual(originalArtifact);
    });

    it('should preserve data through YAML round-trip', () => {
      const originalArtifact = {
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'plan',
        environment: 'dev',
        serviceName: 'test-service',
        complianceFramework: 'commercial' as const
      };

      const serialized = yamlSerializer.serialize(originalArtifact);
      const deserialized = yamlSerializer.deserialize(serialized);

      expect(deserialized).toEqual(originalArtifact);
    });
  });
});
