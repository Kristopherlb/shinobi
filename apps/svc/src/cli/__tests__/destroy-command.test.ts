import path from 'path';
import os from 'os';
import { DestroyCommand } from '../destroy.js';
import type { DestroyOptions } from '../destroy.js';
import type { Logger } from '../utils/logger.js';
import type { FileDiscovery } from '@shinobi/core';
jest.mock('../utils/service-synthesizer.js', () => ({
  readManifest: jest.fn()
}));

jest.mock('@aws-sdk/client-cloudformation', () => {
  const actual = jest.requireActual('@aws-sdk/client-cloudformation');
  return {
    ...actual,
    CloudFormationClient: jest.fn(),
    DeleteStackCommand: jest.fn(),
    waitUntilStackDeleteComplete: jest.fn()
  };
});

jest.mock('inquirer', () => ({
  __esModule: true,
  default: { prompt: jest.fn() }
}));

import { readManifest } from '../utils/service-synthesizer.js';
import {
  CloudFormationClient,
  DeleteStackCommand,
  waitUntilStackDeleteComplete
} from '@aws-sdk/client-cloudformation';
import inquirer from 'inquirer';

const readManifestMock = readManifest as unknown as jest.Mock;
const promptMock = inquirer.prompt as unknown as jest.Mock;

const sendMock = jest.fn();
const waitUntilStackDeleteCompleteMock = waitUntilStackDeleteComplete as unknown as jest.Mock;

(CloudFormationClient as unknown as jest.Mock).mockImplementation(() => ({ send: sendMock }));
(DeleteStackCommand as unknown as jest.Mock).mockImplementation((args: any) => args);

describe('DestroyCommand', () => {
  const logger: Logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn()
  } as unknown as Logger;

  const fileDiscovery: FileDiscovery = {
    findManifest: jest.fn()
  } as unknown as FileDiscovery;

  const destroyCommand = new DestroyCommand({ fileDiscovery, logger });
  const manifestPath = path.join(os.tmpdir(), 'service.yml');
  const baseOptions: DestroyOptions = {
    file: manifestPath,
    env: 'dev',
    region: 'us-east-1',
    account: '123456789012',
    yes: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);
    readManifestMock.mockResolvedValue({
      service: 'sample-service',
      environment: 'dev',
      accountId: '123456789012'
    });
    waitUntilStackDeleteCompleteMock.mockResolvedValue(undefined);
    promptMock.mockReset();
  });

  it('returns success when stack delete succeeds', async () => {
    sendMock.mockResolvedValueOnce({});

    const result = await destroyCommand.execute(baseOptions);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(waitUntilStackDeleteCompleteMock).toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith('Stack sample-service-dev deleted.');
  });

  it('treats missing stack as success without deletion', async () => {
    sendMock.mockRejectedValueOnce({
      name: 'ValidationError',
      message: 'Stack with id sample-service-dev does not exist'
    });

    const result = await destroyCommand.execute(baseOptions);

    expect(result.success).toBe(true);
    expect(result.data?.deleted).toBe(false);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
  });

  it('fails when confirmation is required but not provided', async () => {
    promptMock.mockResolvedValue({ confirm: false });

    const result = await destroyCommand.execute({ ...baseOptions, yes: undefined, json: false });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith('Destroy cancelled by user.');
    promptMock.mockReset();
  });
});
