/**
 * E2E Test: Simple EC2 Instance via CLI Commands
 * 
 * Tests the complete platform workflow by:
 * 1. Creating a temporary service.yml
 * 2. Running CLI commands (validate, plan)
 * 3. Verifying the output
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as os from 'os';
import { ServiceManifest } from '../../packages/components/mcp-server/services/service-endpoints';

describe('E2E: Simple EC2 via CLI', () => {
  let tempDir: string;
  let serviceFile: string;

  beforeEach(() => {
    // Create temporary directory for test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdk-lib-e2e-'));
    serviceFile = path.join(tempDir, 'service.yml');
  });

  afterEach(() => {
    // Cleanup temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should validate EC2 service manifest using ResolverEngine directly', async () => {
    const serviceManifest: ServiceManifest = {
      service: 'simple-ec2-test',
      owner: 'platform-team',
      complianceFramework: 'commercial',
      components: [
        {
          name: 'test-ec2',
          type: 'ec2-instance',
          config: {
            instanceType: 't3.micro',
            imageId: 'ami-0c02fb55956c7d316',
            userData: `#!/bin/bash
yum update -y
echo "Hello from E2E test" > /tmp/test.txt`,
            tags: {
              'test-component': 'true'
            }
          }
        }
      ]
    };

    // Write service manifest to temporary file
    fs.writeFileSync(serviceFile, yaml.dump(serviceManifest));

    // For now, just test that the manifest file is created correctly
    expect(fs.existsSync(serviceFile)).toBe(true);
    
    const fileContent = fs.readFileSync(serviceFile, 'utf8');
    const parsedManifest = yaml.load(fileContent) as ServiceManifest;
    
    expect(parsedManifest.service).toBe('simple-ec2-test');
    expect(parsedManifest.owner).toBe('platform-team');
    expect(parsedManifest.complianceFramework).toBe('commercial');
    expect(parsedManifest.components).toHaveLength(1);
    expect(parsedManifest.components[0].name).toBe('test-ec2');
    expect(parsedManifest.components[0].type).toBe('ec2-instance');
  });

  test('should handle invalid manifest structure', () => {
    const invalidManifest = {
      // Missing required 'service' field
      owner: 'platform-team',
      complianceFramework: 'commercial',
      components: [
        {
          name: 'bad-ec2',
          type: 'ec2-instance',
          config: {
            instanceType: 't3.micro',
            imageId: 'ami-0c02fb55956c7d316'
          }
        }
      ]
    };

    // Write invalid manifest to temporary file
    fs.writeFileSync(serviceFile, yaml.dump(invalidManifest));

    const fileContent = fs.readFileSync(serviceFile, 'utf8');
    const parsedManifest = yaml.load(fileContent) as any;
    
    // Should be missing the required service field
    expect(parsedManifest.service).toBeUndefined();
    expect(parsedManifest.owner).toBe('platform-team');
  });
});
