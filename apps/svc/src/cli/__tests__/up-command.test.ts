import path from 'path';
import os from 'os';
import { UpCommand } from '../up.js';
import type { UpOptions } from '../up.js';
import type { Logger } from '../utils/logger.js';
import type { FileDiscovery } from '@shinobi/core';
jest.mock('../utils/service-synthesizer.js', () => ({
  readManifest: jest.fn(),
  synthesizeService: jest.fn()
}));

const deployMock = jest.fn();
let capturedProducer: any;

jest.mock('@aws-cdk/cli-lib-alpha', () => ({
  AwsCdkCli: class {
    static fromCloudAssemblyDirectoryProducer(producer: any) {
      capturedProducer = producer;
      return { deploy: deployMock };
    }
  }
}));

jest.mock('inquirer', () => ({
  __esModule: true,
  default: { prompt: jest.fn() }
}));

import { readManifest, synthesizeService } from '../utils/service-synthesizer.js';
import inquirer from 'inquirer';

describe('UpCommand', () => {
  const logger: Logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn()
  } as unknown as Logger;

  const fileDiscovery: FileDiscovery = {
    findManifest: jest.fn()
  } as unknown as FileDiscovery;

  const upCommand = new UpCommand({ fileDiscovery, logger });
  const manifestPath = path.join(os.tmpdir(), 'service.yml');

  const readManifestMock = readManifest as unknown as jest.Mock;
  const synthesizeServiceMock = synthesizeService as unknown as jest.Mock;
  const promptMock = inquirer.prompt as unknown as jest.Mock;

  const baseOptions: UpOptions = {
    file: manifestPath,
    env: 'dev',
    region: 'us-east-1',
    account: '123456789012',
    yes: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    deployMock.mockReset();
    capturedProducer = undefined;
    (fileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);
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

  it('deploys stack successfully', async () => {
    const result = await upCommand.execute(baseOptions);

    expect(result.success).toBe(true);
    expect(deployMock).toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith('Deployment complete for sample-service-dev.');
  });

  it('skips deploy when confirmation rejected', async () => {
    promptMock.mockResolvedValueOnce({ confirm: false });

    const result = await upCommand.execute({ ...baseOptions, yes: undefined, json: false });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith('Deployment cancelled by user.');
    expect(deployMock).not.toHaveBeenCalled();
  });
});
