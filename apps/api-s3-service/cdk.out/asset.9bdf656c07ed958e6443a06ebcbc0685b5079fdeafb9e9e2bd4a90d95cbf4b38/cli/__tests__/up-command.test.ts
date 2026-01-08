import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import { UpCommand } from '../up-command.js';
import type { UpOptions } from '../up-command.js';
import type { Logger } from '../console-logger.js';
import type { FileDiscovery, SingletonResourceHandlerService } from '@shinobi/core';
vi.mock('../utils/service-synthesizer.js', () => ({
  readManifest: vi.fn(),
  synthesizeService: vi.fn()
}));

const deployMock = vi.fn();
let capturedProducer: any;

vi.mock('@aws-cdk/cli-lib-alpha', () => ({
  AwsCdkCli: class {
    static fromCloudAssemblyDirectoryProducer(producer: any) {
      capturedProducer = producer;
      return { deploy: deployMock };
    }
  }
}));

vi.mock('inquirer', () => ({
  __esModule: true,
  default: { prompt: vi.fn() }
}));

import { readManifest, synthesizeService } from '../utils/service-synthesizer.js';
import inquirer from 'inquirer';

describe('UpCommand', () => {
  const logger: Logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  } as unknown as Logger;

  const fileDiscovery: FileDiscovery = {
    findManifest: vi.fn()
  } as unknown as FileDiscovery;

  const singletonResourceHandler: SingletonResourceHandlerService = {
    postProcessTemplate: vi.fn().mockResolvedValue(undefined)
  } as unknown as SingletonResourceHandlerService;

  const upCommand = new UpCommand({ fileDiscovery, logger, singletonResourceHandler });
  const manifestPath = path.join(os.tmpdir(), 'service.yml');

  const readManifestMock = readManifest as unknown as vi.Mock;
  const synthesizeServiceMock = synthesizeService as unknown as vi.Mock;
  const promptMock = inquirer.prompt as unknown as vi.Mock;

  const baseOptions: UpOptions = {
    file: manifestPath,
    env: 'dev',
    region: 'us-east-1',
    account: '123456789012',
    yes: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    deployMock.mockReset();
    capturedProducer = undefined;
    (fileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
    readManifestMock.mockResolvedValue({
      service: 'sample-service',
      environment: 'dev',
      accountId: '123456789012'
    });
    synthesizeServiceMock.mockResolvedValue({
      manifest: {
        service: 'sample-service',
        environment: 'dev',
        accountId: '123456789012',
        components: []
      },
      stack: {
        stackName: 'sample-service-dev',
        templateFile: 'sample-service-dev.template.json'
      },
      assembly: {
        directory: path.join(os.tmpdir(), 'assembly'),
        stacks: []
      },
      outputDir: path.join(os.tmpdir(), 'synth-output'),
      components: []
    });
    deployMock.mockImplementation(async () => {
      if (capturedProducer) {
        await capturedProducer.produce({});
      }
    });
  });

  it('Execute__ValidManifest__DeploysSuccessfully', async () => {
    const result = await upCommand.execute(baseOptions);

    expect(result.success).toBe(true);
    expect(deployMock).toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith('Deployment complete for sample-service-dev.');
  });

  it('Execute__ConfirmationRejected__SkipsDeploy', async () => {
    promptMock.mockResolvedValueOnce({ confirm: false });

    const result = await upCommand.execute({ ...baseOptions, yes: undefined, json: false });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(logger.warn).toHaveBeenCalledWith('Deployment cancelled by user.');
    expect(deployMock).not.toHaveBeenCalled();
  });
});
