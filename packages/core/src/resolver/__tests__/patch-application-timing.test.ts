import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { createMockBinderRegistry, createTestResolverEngine, MockComponent } from './test-helpers.js';

describe('ResolverEngine__PatchTiming', () => {
  const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'patch-tests-'));

  it('PatchTiming__PatchModifiesConstruct__ComponentUsesAfter__Inconsistency', async () => {
    const tempDir = createTempDir();
    const originalCwd = process.cwd();
    try {
      process.chdir(tempDir);

      const patchFile = path.join(tempDir, 'patches.js');
      fs.writeFileSync(
        patchFile,
        `
        export async function applyPatches({ constructs }) {
          constructs.api.node.addMetadata('patched', true);
        }
        `,
        'utf8'
      );

      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');
      const apiConstruct = new cdk.CfnResource(stack, 'Api', { type: 'Custom::Api' });
      const component = new MockComponent(stack, 'ApiComponent', {
        name: 'api',
        type: 'api-gateway-rest',
        constructs: { main: apiConstruct }
      });

      const resolver = createTestResolverEngine({ binderRegistry: createMockBinderRegistry([]) });
      const patchesApplied = await (resolver as any).applyPatches(stack, [component], {});

      expect(patchesApplied).toBe(true);
      expect(apiConstruct.node.metadata.some(entry => entry.type === 'patched')).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('PatchTiming__PreSynthesisPatch__WorksCorrectly', async () => {
    const tempDir = createTempDir();
    const originalCwd = process.cwd();
    try {
      process.chdir(tempDir);

      const patchFile = path.join(tempDir, 'patches.js');
      fs.writeFileSync(
        patchFile,
        `
        export async function applyPatches({ constructs }) {
          constructs.worker.node.addMetadata('pre-synthesis', true);
        }
        `,
        'utf8'
      );

      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');
      const workerConstruct = new cdk.CfnResource(stack, 'Worker', { type: 'Custom::Worker' });
      const component = new MockComponent(stack, 'WorkerComponent', {
        name: 'worker',
        type: 'lambda-api',
        constructs: { main: workerConstruct }
      });

      const resolver = createTestResolverEngine({ binderRegistry: createMockBinderRegistry([]) });
      const patchesApplied = await (resolver as any).applyPatches(stack, [component], {});

      expect(patchesApplied).toBe(true);
      expect(workerConstruct.node.metadata.some(entry => entry.type === 'pre-synthesis')).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('PatchTiming__PatchValidation__DetectsConflicts', async () => {
    const tempDir = createTempDir();
    const originalCwd = process.cwd();
    try {
      process.chdir(tempDir);

      const patchFile = path.join(tempDir, 'patches.js');
      fs.writeFileSync(
        patchFile,
        `
        export async function applyPatches() {
          throw new Error('Patch conflict detected');
        }
        `,
        'utf8'
      );

      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack');
      const component = new MockComponent(stack, 'Component', {
        name: 'component',
        type: 'lambda-api'
      });

      const resolver = createTestResolverEngine({ binderRegistry: createMockBinderRegistry([]) });

      await expect((resolver as any).applyPatches(stack, [component], {}))
        .rejects
        .toThrow('Patch application failed: Patch conflict detected');
    } finally {
      process.chdir(originalCwd);
    }
  });
});
