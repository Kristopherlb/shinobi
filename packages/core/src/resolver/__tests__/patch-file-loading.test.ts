import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { createMockBinderRegistry, createTestLogger, createTestResolverEngine, MockComponent } from './test-helpers.js';

describe('ResolverEngine__PatchFileLoading', () => {
  const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'patch-loading-'));

  it('PatchLoading__PathResolutionFailure__ClearError', async () => {
    const tempDir = createTempDir();
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const component = new MockComponent(stack, 'Component', { name: 'component', type: 'lambda-api' });
    const resolver = createTestResolverEngine({ binderRegistry: createMockBinderRegistry([]) });

    const applied = await (resolver as any).applyPatches(stack, [component], {});
    expect(applied).toBe(false);

    process.chdir(originalCwd);
  });

  it('PatchLoading__SyntaxError__ClearError', async () => {
    const tempDir = createTempDir();
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    fs.writeFileSync(path.join(tempDir, 'patches.js'), 'export const =;', 'utf8');

    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const component = new MockComponent(stack, 'Component', { name: 'component', type: 'lambda-api' });
    const resolver = createTestResolverEngine({ binderRegistry: createMockBinderRegistry([]) });

    await expect((resolver as any).applyPatches(stack, [component], {}))
      .rejects
      .toThrow('Patch application failed');

    process.chdir(originalCwd);
  });

  it('PatchLoading__MissingExport__ClearError', async () => {
    const tempDir = createTempDir();
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    fs.writeFileSync(path.join(tempDir, 'patches.js'), 'export const patchInfo = {};', 'utf8');

    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const component = new MockComponent(stack, 'Component', { name: 'component', type: 'lambda-api' });
    const logger = createTestLogger();
    const resolver = createTestResolverEngine({ binderRegistry: createMockBinderRegistry([]), logger });

    const applied = await (resolver as any).applyPatches(stack, [component], {});
    expect(applied).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith('patches.ts exists but does not export applyPatches function');

    process.chdir(originalCwd);
  });
});
