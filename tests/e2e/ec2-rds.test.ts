/**
 * E2E Test: EC2 + RDS via Service Manifest
 * 
scripts.  use the pro
I see a failed attbring it upbsolutely matter * Tests multi-component service manifest creation and parsing
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as os from 'os';
import { ServiceManifest } from '@shinobi/mcp-server';

describe('E2E: EC2 + RDS via Service Manifest', () => {
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

  test('should create EC2 and RDS service manifest correctly', () => {
    const serviceManifest: ServiceManifest = {
      service: 'ec2-rds-test',
      owner: 'platform-team',
      complianceFramework: 'commercial',
      components: [
        {
          name: 'web-server',
          type: 'ec2-instance',
          config: {
            instanceType: 't3.micro',
            imageId: 'ami-0c02fb55956c7d316',
            userData: `#!/bin/bash
yum update -y
yum install -y postgresql-client
echo "Database setup complete" > /tmp/db-setup.txt`,
            tags: {
              'component-type': 'web-server'
            }
          }
        },
        {
          name: 'app-database',
          type: 'rds-postgres',
          config: {
            instanceClass: 'db.t3.micro',
            dbName: 'appdb',
            allocatedStorage: 20,
            tags: {
              'component-type': 'database'
            }
          }
        }
      ]
    };

    // Write service manifest to temporary file
    fs.writeFileSync(serviceFile, yaml.dump(serviceManifest));

    expect(fs.existsSync(serviceFile)).toBe(true);
    
    const fileContent = fs.readFileSync(serviceFile, 'utf8');
    const parsedManifest = yaml.load(fileContent) as ServiceManifest;
    
    expect(parsedManifest.service).toBe('ec2-rds-test');
    expect(parsedManifest.owner).toBe('platform-team');
    expect(parsedManifest.complianceFramework).toBe('commercial');
    expect(parsedManifest.components).toHaveLength(2);
    
    // Verify EC2 component
    const ec2Component = parsedManifest.components.find(c => c.name === 'web-server');
    expect(ec2Component).toBeDefined();
    expect(ec2Component?.type).toBe('ec2-instance');
    expect(ec2Component?.config.instanceType).toBe('t3.micro');
    
    // Verify RDS component
    const rdsComponent = parsedManifest.components.find(c => c.name === 'app-database');
    expect(rdsComponent).toBeDefined();
    expect(rdsComponent?.type).toBe('rds-postgres');
    expect(rdsComponent?.config.dbName).toBe('appdb');
  });

  test('should handle FedRAMP compliance framework', () => {
    const fedrampManifest: ServiceManifest = {
      service: 'fedramp-test',
      owner: 'platform-team',
      complianceFramework: 'fedramp-moderate',
      components: [
        {
          name: 'secure-database',
          type: 'rds-postgres',
          config: {
            instanceClass: 'db.t3.micro',
            dbName: 'securedb',
            allocatedStorage: 20
          }
        }
      ]
    };

    // Write service manifest to temporary file
    fs.writeFileSync(serviceFile, yaml.dump(fedrampManifest));

    const fileContent = fs.readFileSync(serviceFile, 'utf8');
    const parsedManifest = yaml.load(fileContent) as ServiceManifest;
    
    expect(parsedManifest.complianceFramework).toBe('fedramp-moderate');
    expect(parsedManifest.components).toHaveLength(1);
    expect(parsedManifest.components[0].type).toBe('rds-postgres');
  });
});
