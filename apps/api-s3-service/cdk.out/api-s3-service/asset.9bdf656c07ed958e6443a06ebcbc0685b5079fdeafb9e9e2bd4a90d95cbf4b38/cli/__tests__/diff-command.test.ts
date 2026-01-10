import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { DiffCommand } from '../diff-command.js';
import type { DiffOptions } from '../diff-command.js';
import type { Logger } from '../console-logger.js';
import type { FileDiscovery } from '@shinobi/core';

vi.mock('../utils/service-synthesizer.js', () => ({
  readManifest: vi.fn(),
  synthesizeService: vi.fn()
}));

import { readManifest, synthesizeService } from '../utils/service-synthesizer.js';

const synthesizeServiceMock = synthesizeService as unknown as vi.Mock;
const readManifestMock = readManifest as unknown as vi.Mock;

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-cloudformation', () => {
  return {
    CloudFormationClient: vi.fn().mockImplementation(() => ({
      send: sendMock
    })),
    GetTemplateCommand: vi.fn().mockImplementation((args) => args)
  };
});

describe('DiffCommand', () => {
  const logger: Logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn()
  } as unknown as Logger;

  const fileDiscovery: FileDiscovery = {
    findManifest: vi.fn()
  } as unknown as FileDiscovery;

  const diffCommand = new DiffCommand({ fileDiscovery, logger });
  const manifestPath = path.join(os.tmpdir(), 'service.yml');
  const baseOptions: DiffOptions = {
    file: manifestPath,
    env: 'dev',
    region: 'us-east-1',
    account: '123456789012',
    output: fs.mkdtempSync(path.join(os.tmpdir(), 'shinobi-diff-test-'))
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fileDiscovery.findManifest as vi.Mock).mockResolvedValue(manifestPath);
    readManifestMock.mockResolvedValue({
      service: 'sample-service',
      environment: 'dev',
      accountId: '123456789012',
      region: 'us-east-1',
      components: []
    });
  });

  it('Execute__StackMissing__ReturnsChanges', async () => {
    const desiredTemplate = {
      Resources: {
        NewResource: {
          Type: 'AWS::S3::Bucket'
        }
      }
    };

    synthesizeServiceMock.mockResolvedValue({
      assembly: {
        stacks: [
          {
            id: 'sample-service-dev',
            templateFile: 'sample-service-dev.template.json',
            displayName: 'sample-service-dev'
          }
        ]
      },
      stack: {
        stackName: 'sample-service-dev',
        template: desiredTemplate,
        templateFile: 'sample-service-dev.template.json'
      },
      outputDir: baseOptions.output,
      components: []
    });

    sendMock.mockRejectedValueOnce({
      name: 'ValidationError',
      message: 'Stack with id sample-service-dev does not exist'
    });

    const result = await diffCommand.execute(baseOptions);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(3); // differences detected
    expect(result.data?.diff.addedResources).toContain('NewResource');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
  });

  it('Execute__TemplatesMatch__ReturnsExitCode0', async () => {
    const template = {
      Resources: {
        Shared: {
          Type: 'AWS::SNS::Topic'
        }
      }
    };

    synthesizeServiceMock.mockResolvedValue({
      assembly: {
        stacks: [
          {
            id: 'sample-service-dev',
            templateFile: 'sample-service-dev.template.json',
            displayName: 'sample-service-dev'
          }
        ]
      },
      stack: {
        stackName: 'sample-service-dev',
        template,
        templateFile: 'sample-service-dev.template.json'
      },
      outputDir: baseOptions.output,
      components: []
    });

    sendMock.mockResolvedValueOnce({ TemplateBody: JSON.stringify(template) });

    const result = await diffCommand.execute(baseOptions);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.data?.diff.hasChanges).toBe(false);
  });
});
