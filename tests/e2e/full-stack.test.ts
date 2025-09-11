/**
 * E2E Test: Full Stack (EC2 + RDS + Redis) via Service Manifest
 * 
 * Tests complete service manifest creation and parsing with multiple components
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as os from 'os';
import { ServiceManifest } from '../../packages/components/mcp-server/services/service-endpoints';

describe('E2E: Full Stack via Service Manifest', () => {
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

  test('should create full stack service manifest correctly', () => {
    const serviceManifest: ServiceManifest = {
      service: 'full-stack-test',
      owner: 'platform-team',
      complianceFramework: 'commercial',
      components: [
        {
          name: 'app-server',
          type: 'ec2-instance',
          config: {
            instanceType: 't3.small',
            imageId: 'ami-0c02fb55956c7d316',
            userData: `#!/bin/bash
yum update -y
yum install -y postgresql-client redis-tools
echo "Full stack app server ready" > /tmp/ready.txt`,
            tags: {
              'component-type': 'application-server',
              'tier': 'web'
            }
          }
        },
        {
          name: 'primary-database',
          type: 'rds-postgres',
          config: {
            instanceClass: 'db.t3.micro',
            dbName: 'mainapp',
            allocatedStorage: 20,
            tags: {
              'component-type': 'database',
              'tier': 'data'
            }
          }
        },
        {
          name: 'session-cache',
          type: 'elasticache-redis',
          config: {
            nodeType: 'cache.t3.micro',
            numCacheNodes: 1,
            tags: {
              'component-type': 'cache',
              'tier': 'cache'
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
    
    expect(parsedManifest.service).toBe('full-stack-test');
    expect(parsedManifest.owner).toBe('platform-team');
    expect(parsedManifest.complianceFramework).toBe('commercial');
    expect(parsedManifest.components).toHaveLength(3);
    
    // Verify EC2 component
    const ec2Component = parsedManifest.components.find(c => c.name === 'app-server');
    expect(ec2Component).toBeDefined();
    expect(ec2Component?.type).toBe('ec2-instance');
    expect(ec2Component?.config.instanceType).toBe('t3.small');
    
    // Verify RDS component
    const rdsComponent = parsedManifest.components.find(c => c.name === 'primary-database');
    expect(rdsComponent).toBeDefined();
    expect(rdsComponent?.type).toBe('rds-postgres');
    expect(rdsComponent?.config.dbName).toBe('mainapp');
    
    // Verify Redis component
    const redisComponent = parsedManifest.components.find(c => c.name === 'session-cache');
    expect(redisComponent).toBeDefined();
    expect(redisComponent?.type).toBe('elasticache-redis');
    expect(redisComponent?.config.nodeType).toBe('cache.t3.micro');
  });

  test('should handle complex component configurations', () => {
    const complexManifest: ServiceManifest = {
      service: 'complex-app',
      owner: 'platform-team',
      complianceFramework: 'fedramp-high',
      components: [
        {
          name: 'load-balancer',
          type: 'application-load-balancer',
          config: {
            scheme: 'internet-facing',
            listeners: [
              {
                port: 443,
                protocol: 'HTTPS',
                certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
              }
            ]
          }
        },
        {
          name: 'high-security-db',
          type: 'rds-postgres',
          config: {
            instanceClass: 'db.r5.large',
            dbName: 'secure_app',
            allocatedStorage: 100,
            encrypted: true,
            backupRetentionPeriod: 30
          }
        }
      ]
    };

    // Write service manifest to temporary file
    fs.writeFileSync(serviceFile, yaml.dump(complexManifest));

    const fileContent = fs.readFileSync(serviceFile, 'utf8');
    const parsedManifest = yaml.load(fileContent) as ServiceManifest;
    
    expect(parsedManifest.complianceFramework).toBe('fedramp-high');
    expect(parsedManifest.components).toHaveLength(2);
    
    // Verify ALB component
    const albComponent = parsedManifest.components.find(c => c.name === 'load-balancer');
    expect(albComponent?.type).toBe('application-load-balancer');
    expect(albComponent?.config.scheme).toBe('internet-facing');
    
    // Verify high-security RDS component
    const secureDbComponent = parsedManifest.components.find(c => c.name === 'high-security-db');
    expect(secureDbComponent?.type).toBe('rds-postgres');
    expect(secureDbComponent?.config.encrypted).toBe(true);
    expect(secureDbComponent?.config.backupRetentionPeriod).toBe(30);
  });

  test('should handle manifest with component bindings', () => {
    const bindingManifest: ServiceManifest = {
      service: 'binding-test',
      owner: 'platform-team',
      complianceFramework: 'commercial',
      components: [
        {
          name: 'api-service',
          type: 'lambda-api',
          config: {
            runtime: 'nodejs20.x',
            handler: 'index.handler',
            code: {
              zipFile: 'exports.handler = async () => ({ statusCode: 200, body: "Hello World" });'
            }
          },
          binds: [
            {
              to: 'user-data',
              capability: 'db:postgres'
            },
            {
              to: 'session-store',
              capability: 'cache:redis'
            }
          ]
        },
        {
          name: 'user-data',
          type: 'rds-postgres',
          config: {
            instanceClass: 'db.t3.micro',
            dbName: 'users',
            allocatedStorage: 20
          }
        },
        {
          name: 'session-store',
          type: 'elasticache-redis',
          config: {
            nodeType: 'cache.t3.micro',
            numCacheNodes: 1
          }
        }
      ]
    };

    // Write service manifest to temporary file
    fs.writeFileSync(serviceFile, yaml.dump(bindingManifest));

    const fileContent = fs.readFileSync(serviceFile, 'utf8');
    const parsedManifest = yaml.load(fileContent) as ServiceManifest;
    
    expect(parsedManifest.components).toHaveLength(3);
    
    // Verify bindings
    const apiComponent = parsedManifest.components.find(c => c.name === 'api-service');
    expect(apiComponent?.binds).toHaveLength(2);
    expect(apiComponent?.binds?.[0].to).toBe('user-data');
    expect(apiComponent?.binds?.[0].capability).toBe('db:postgres');
    expect(apiComponent?.binds?.[1].to).toBe('session-store');
    expect(apiComponent?.binds?.[1].capability).toBe('cache:redis');
  });
});