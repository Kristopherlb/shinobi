import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import os from 'os';
import { DestroyCommand } from '../destroy-command.js';
import type { DestroyOptions } from '../destroy-command.js';
import type { Logger } from '../console-logger.js';
import type { FileDiscovery } from '@shinobi/core';

vi.mock('../utils/service-synthesizer.js', () => ({
  readManifest: vi.fn()
}));

vi.mock('@aws-sdk/client-cloudformation', async () => {
  const actual = await vi.importActual('@aws-sdk/client-cloudformation');
  return {
    ...actual,
    CloudFormationClient: vi.fn(),
    DeleteStackCommand: vi.fn(),
    waitUntilStackDeleteComplete: vi.fn()
  };
});

vi.mock('inquirer', () => ({
  __esModule: true,
  default: { prompt: vi.fn() }
}));

import { readManifest } from '../utils/service-synthesizer.js';
import {
  CloudFormationClient,
  DeleteStackCommand,
  waitUntilStackDeleteComplete
} from '@aws-sdk/client-cloudformation';
import inquirer from 'inquirer';

const readManifestMock = readManifest as unknown as ReturnType<typeof vi.fn>;
const promptMock = inquirer.prompt as unknown as ReturnType<typeof vi.fn>;

const sendMock = vi.fn();
const waitUntilStackDeleteCompleteMock = waitUntilStackDeleteComplete as unknown as ReturnType<typeof vi.fn>;

(CloudFormationClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({ send: sendMock }));
(DeleteStackCommand as unknown as ReturnType<typeof vi.fn>).mockImplementation((args: any) => args);

describe('DestroyCommand', () => {
  const logger: Logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  } as unknown as Logger;

  const fileDiscovery: FileDiscovery = {
    findManifest: vi.fn()
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
    vi.clearAllMocks();
    (fileDiscovery.findManifest as ReturnType<typeof vi.fn>).mockResolvedValue(manifestPath);
    readManifestMock.mockResolvedValue({
      service: 'sample-service',
      environment: 'dev',
      accountId: '123456789012'
    });
    waitUntilStackDeleteCompleteMock.mockResolvedValue(undefined);
    promptMock.mockReset();
  });

  it('Execute__StackDeleteSucceeds__ReturnsSuccess', async () => {
    sendMock.mockResolvedValueOnce({});

    const result = await destroyCommand.execute(baseOptions);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(waitUntilStackDeleteCompleteMock).toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith('Stack sample-service-dev deleted.');
  });

  it('Execute__StackMissing__ReturnsSuccessWithoutDeletion', async () => {
    sendMock.mockRejectedValueOnce({
      name: 'ValidationError',
      message: 'Stack with id sample-service-dev does not exist'
    });

    const result = await destroyCommand.execute(baseOptions);

    expect(result.success).toBe(true);
    expect(result.data?.deleted).toBe(false);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
  });

  it('Execute__ConfirmationRejected__FailsWithExitCode2', async () => {
    promptMock.mockResolvedValue({ confirm: false });

    const result = await destroyCommand.execute({ ...baseOptions, yes: undefined, json: false });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(logger.warn).toHaveBeenCalledWith('Destroy cancelled by user.');
    promptMock.mockReset();
  });
});
