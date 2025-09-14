import { StandardArtifactWriter } from '../../../src/platform/services/artifact-writer';
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
    copyFile: jest.fn()
  }
}));

describe('StandardArtifactWriter', () => {
  let writer: StandardArtifactWriter;
  let tempDir: string;

  beforeEach(() => {
    writer = new StandardArtifactWriter();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-writer-test-'));
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

  describe('writePlanArtifact', () => {
    it('should write plan artifact with all files', async () => {
      const planArtifact: PlanArtifact = {
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
            compliancePlan: '{"componentId": "test-component"}',
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

      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const writtenFiles = await writer.writePlanArtifact(planArtifact, tempDir);

      expect(writtenFiles).toHaveLength(6); // plan.json, component plan, compliance plan, summary, validation, compliance
      expect(writtenFiles).toContain(path.join(tempDir, 'plan.json'));
      expect(writtenFiles).toContain(path.join(tempDir, 'components', 'test-component', 'component.plan.json'));
      expect(writtenFiles).toContain(path.join(tempDir, 'components', 'test-component', 'compliance.plan.json'));
      expect(writtenFiles).toContain(path.join(tempDir, 'summary.json'));
      expect(writtenFiles).toContain(path.join(tempDir, 'validation.json'));
      expect(writtenFiles).toContain(path.join(tempDir, 'compliance.json'));

      expect(fs.promises.mkdir).toHaveBeenCalledWith(tempDir, { recursive: true });
      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.join(tempDir, 'components', 'test-component'), { recursive: true });
    });

    it('should write plan artifact without compliance plan', async () => {
      const planArtifact: PlanArtifact = {
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

      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const writtenFiles = await writer.writePlanArtifact(planArtifact, tempDir);

      expect(writtenFiles).toHaveLength(5); // No compliance plan file
      expect(writtenFiles).not.toContain(path.join(tempDir, 'components', 'test-component', 'compliance.plan.json'));
    });
  });

  describe('writeDeploymentArtifact', () => {
    it('should write deployment artifact with all files', async () => {
      const deploymentArtifact: DeploymentArtifact = {
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'up',
        environment: 'dev',
        serviceName: 'test-service',
        complianceFramework: 'commercial',
        deploymentId: 'test-deployment-123',
        status: 'success',
        stacks: [
          {
            stackName: 'test-stack',
            status: 'CREATE_COMPLETE',
            stackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/123',
            outputs: { ServiceName: 'test-service' },
            resources: ['MyBucket', 'MyFunction'],
            events: [],
            duration: 30000
          }
        ],
        resources: [
          {
            logicalId: 'MyBucket',
            physicalId: 'test-bucket-123',
            type: 'AWS::S3::Bucket',
            status: 'CREATE_COMPLETE',
            stackName: 'test-stack'
          }
        ],
        outputs: { ServiceName: 'test-service' },
        changes: {
          added: 1,
          modified: 0,
          removed: 0,
          unchanged: 0,
          total: 1
        },
        duration: 30000
      };

      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const writtenFiles = await writer.writeDeploymentArtifact(deploymentArtifact, tempDir);

      expect(writtenFiles).toHaveLength(5); // deployment.json, stack, resources, changes, outputs
      expect(writtenFiles).toContain(path.join(tempDir, 'deployment.json'));
      expect(writtenFiles).toContain(path.join(tempDir, 'stacks', 'test-stack.json'));
      expect(writtenFiles).toContain(path.join(tempDir, 'resources.json'));
      expect(writtenFiles).toContain(path.join(tempDir, 'changes.json'));
      expect(writtenFiles).toContain(path.join(tempDir, 'outputs.json'));

      expect(fs.promises.mkdir).toHaveBeenCalledWith(tempDir, { recursive: true });
      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.join(tempDir, 'stacks'), { recursive: true });
    });
  });

  describe('writeMigrationArtifact', () => {
    it('should write migration artifact with all files', async () => {
      const migrationArtifact: MigrationArtifact = {
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'migrate',
        environment: 'dev',
        serviceName: 'test-service',
        complianceFramework: 'commercial',
        migrationId: 'test-migration-123',
        sourcePath: '/source/path',
        targetPath: '/target/path',
        status: 'success',
        components: [
          {
            componentId: 'test-component',
            componentType: 's3-bucket',
            status: 'mapped',
            originalResources: [
              {
                logicalId: 'MyBucket',
                type: 'AWS::S3::Bucket',
                properties: { BucketName: 'test-bucket' }
              }
            ],
            mappedResources: [
              {
                logicalId: 'StorageBucket',
                type: 'AWS::S3::Bucket',
                componentType: 's3-bucket',
                componentId: 'test-component',
                properties: { BucketName: 'test-bucket' },
                complianceControls: ['AC-2', 'SC-7']
              }
            ],
            unmappedResources: [],
            manualPatches: []
          }
        ],
        logicalIdMap: {
          version: '1.0.0',
          mappings: { 'MyBucket': 'StorageBucket' },
          reverse: { 'StorageBucket': 'MyBucket' },
          components: { 'MyBucket': 'test-component' }
        },
        report: {
          summary: {
            totalResources: 1,
            mappedResources: 1,
            unmappedResources: 0,
            componentsCreated: 1,
            manualPatchesRequired: 0,
            driftDetected: false
          },
          components: [],
          unmappedResources: [],
          manualPatches: [],
          driftCheck: {
            hasDrift: false,
            driftDetails: [],
            emptyDiff: true
          },
          recommendations: ['Test the migrated service with svc plan']
        },
        artifacts: {
          serviceManifest: '/path/to/service.yml',
          logicalIdMap: '/path/to/logical-id-map.json',
          migrationReport: '/path/to/MIGRATION_REPORT.md',
          patchesFile: '/path/to/patches.ts',
          srcDirectory: '/path/to/src'
        }
      };

      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.copyFile as jest.Mock).mockResolvedValue(undefined);

      const writtenFiles = await writer.writeMigrationArtifact(migrationArtifact, tempDir);

      expect(writtenFiles.length).toBeGreaterThanOrEqual(4); // migration.json, logical-id-map.json, MIGRATION_REPORT.md, component file
      expect(writtenFiles).toContain(path.join(tempDir, 'migration.json'));
      expect(writtenFiles).toContain(path.join(tempDir, 'logical-id-map.json'));
      expect(writtenFiles).toContain(path.join(tempDir, 'MIGRATION_REPORT.md'));
      expect(writtenFiles).toContain(path.join(tempDir, 'components', 'test-component.json'));

      expect(fs.promises.mkdir).toHaveBeenCalledWith(tempDir, { recursive: true });
      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.join(tempDir, 'components'), { recursive: true });
    });

    it('should generate migration report markdown', async () => {
      const migrationArtifact: MigrationArtifact = {
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'migrate',
        environment: 'dev',
        serviceName: 'test-service',
        complianceFramework: 'commercial',
        migrationId: 'test-migration-123',
        sourcePath: '/source/path',
        targetPath: '/target/path',
        status: 'success',
        components: [],
        logicalIdMap: {
          version: '1.0.0',
          mappings: {},
          reverse: {},
          components: {}
        },
        report: {
          summary: {
            totalResources: 2,
            mappedResources: 1,
            unmappedResources: 1,
            componentsCreated: 1,
            manualPatchesRequired: 1,
            driftDetected: false
          },
          components: [],
          unmappedResources: [
            {
              logicalId: 'UnmappedResource',
              type: 'AWS::Custom::Resource',
              reason: 'Unsupported resource type',
              properties: {}
            }
          ],
          manualPatches: [
            {
              componentId: 'test-component',
              description: 'Manual configuration required',
              code: '// Manual patch code',
              priority: 'high'
            }
          ],
          driftCheck: {
            hasDrift: false,
            driftDetails: [],
            emptyDiff: true
          },
          recommendations: ['Review unmapped resources']
        },
        artifacts: {
          serviceManifest: '/path/to/service.yml',
          logicalIdMap: '/path/to/logical-id-map.json',
          migrationReport: '/path/to/MIGRATION_REPORT.md',
          patchesFile: '/path/to/patches.ts',
          srcDirectory: '/path/to/src'
        }
      };

      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      await writer.writeMigrationArtifact(migrationArtifact, tempDir);

      // Check that writeFile was called with markdown content
      const writeFileCalls = (fs.promises.writeFile as jest.Mock).mock.calls;
      const markdownCall = writeFileCalls.find(call => call[0].includes('MIGRATION_REPORT.md'));

      expect(markdownCall).toBeDefined();
      const markdownContent = markdownCall[1];

      expect(markdownContent).toContain('# Migration Report');
      expect(markdownContent).toContain('**Total Resources**: 2');
      expect(markdownContent).toContain('**Mapped Resources**: 1');
      expect(markdownContent).toContain('**Unmapped Resources**: 1');
      expect(markdownContent).toContain('## Manual Patches Required');
      expect(markdownContent).toContain('## Recommendations');
    });
  });
});
