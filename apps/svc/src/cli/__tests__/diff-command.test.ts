import path from 'path';
import os from 'os';
import fs from 'fs';
import { DiffCommand } from '../diff.js';
import type { DiffOptions } from '../diff.js';
import type { Logger } from '../utils/logger.js';
import type { FileDiscovery } from '@shinobi/core';

jest.mock('../utils/service-synthesizer.js', () => ({
  readManifest: jest.fn(),
  synthesizeService: jest.fn()
}));

import { readManifest, synthesizeService } from '../utils/service-synthesizer.js';

const synthesizeServiceMock = synthesizeService as unknown as jest.Mock;
const readManifestMock = readManifest as unknown as jest.Mock;

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-cloudformation', () => {
  return {
    CloudFormationClient: jest.fn().mockImplementation(() => ({
      send: sendMock
    })),
    GetTemplateCommand: jest.fn().mockImplementation((args) => args)
  };
});

describe('DiffCommand', () => {
  const logger: Logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
  } as unknown as Logger;

  const fileDiscovery: FileDiscovery = {
    findManifest: jest.fn()
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
    jest.clearAllMocks();
    (fileDiscovery.findManifest as jest.Mock).mockResolvedValue(manifestPath);
    readManifestMock.mockResolvedValue({
      service: 'sample-service',
      environment: 'dev',
      accountId: '123456789012',
      region: 'us-east-1',
      components: []
    });
  });

  it('returns changes when stack does not exist', async () => {
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

  it('returns exit code 0 when templates match', async () => {
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
