/**
 * Theme 3: Extending the Platform (Patches) Test Cases
 * Tests the patch system for extending platform capabilities
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { ResolverEngine } from '../../packages/core-engine/src/resolver-engine';
import { Logger } from '../../packages/core-engine/src/logger';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('Theme 3: Extending the Platform (Patches)', () => {
  let resolverEngine: ResolverEngine;
  let mockLogger: Logger;
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    mockLogger = new Logger();
    resolverEngine = new ResolverEngine({ logger: mockLogger });
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'patch-test-'));
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('TC-PATCH-01: Adding ElastiCache cluster via patches', () => {
    test('should add ElastiCache resource to synthesized CloudFormation template', async () => {
      // Arrange: Create service manifest
      const manifest = {
        service: 'patch-elasticache-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            }
          }
        ]
      };

      // Create patches.ts file
      const patchesContent = `
import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export const patchInfo = {
  name: 'ElastiCache Session Store',
  version: '1.0.0',
  description: 'Adds Redis cluster for session caching to improve API performance',
  author: 'platform-team',
  approvedBy: 'architecture-review-board',
  approvedDate: '2024-01-15'
};

export async function applyPatches(context: any) {
  const { stack, components, config, constructs } = context;
  
  console.log('Applying ElastiCache patch...');
  
  // Create subnet group for ElastiCache
  const subnetGroup = new elasticache.CfnSubnetGroup(stack, 'CacheSubnetGroup', {
    description: 'Subnet group for ElastiCache',
    subnetIds: ['subnet-12345', 'subnet-67890'] // In real implementation, get from VPC
  });
  
  // Add ElastiCache Redis cluster
  const redis = new elasticache.CfnCacheCluster(stack, 'SessionCache', {
    cacheNodeType: 'cache.t3.micro',
    engine: 'redis',
    engineVersion: '6.2',
    numCacheNodes: 1,
    cacheSubnetGroupName: subnetGroup.ref,
    vpcSecurityGroupIds: constructs.api ? [constructs.api.securityGroupId] : []
  });
  
  // Add Redis connection information to API Lambda environment
  if (constructs.api) {
    constructs.api.addEnvironment('REDIS_HOST', redis.attrRedisEndpointAddress);
    constructs.api.addEnvironment('REDIS_PORT', redis.attrRedisEndpointPort);
    constructs.api.addEnvironment('CACHE_ENABLED', 'true');
  }
  
  // Add tags for governance
  cdk.Tags.of(redis).add('PatchName', 'elasticache-session-store');
  cdk.Tags.of(redis).add('PatchVersion', '1.0.0');
  cdk.Tags.of(redis).add('ApprovedBy', 'architecture-review-board');
  
  return {
    resourcesAdded: ['AWS::ElastiCache::CacheCluster', 'AWS::ElastiCache::SubnetGroup'],
    environmentVariablesAdded: ['REDIS_HOST', 'REDIS_PORT', 'CACHE_ENABLED']
  };
}
`;

      fs.writeFileSync(path.join(testDir, 'patches.ts'), patchesContent);

      // Act: Synthesize with patches
      const result = await resolverEngine.synthesize(manifest);

      // Assert: CloudFormation template contains ElastiCache resources
      const cfnTemplate = result.app.synth().getStackByName(`${manifest.service}-stack`).template;
      
      // Verify ElastiCache cluster was added
      const elasticacheResources = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => 
          resource.Type === 'AWS::ElastiCache::CacheCluster'
        );
      
      expect(elasticacheResources).toHaveLength(1);
      
      const [_, cacheResource] = elasticacheResources[0] as [string, any];
      expect(cacheResource.Properties.Engine).toBe('redis');
      expect(cacheResource.Properties.CacheNodeType).toBe('cache.t3.micro');

      // Verify subnet group was added
      const subnetGroups = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => 
          resource.Type === 'AWS::ElastiCache::SubnetGroup'
        );
      
      expect(subnetGroups).toHaveLength(1);

      // Verify Lambda has Redis environment variables
      const lambdaResource = Object.values(cfnTemplate.Resources)
        .find((r: any) => r.Type === 'AWS::Lambda::Function') as any;
      
      const envVars = lambdaResource.Properties.Environment.Variables;
      expect(envVars.REDIS_HOST).toBeDefined();
      expect(envVars.REDIS_PORT).toBeDefined();
      expect(envVars.CACHE_ENABLED).toBe('true');

      // Verify patches were applied (check synthesis result)
      expect(result.patchesApplied).toBe(true);
    });

    test('should handle patch failures gracefully', async () => {
      const manifest = {
        service: 'patch-failure-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            }
          }
        ]
      };

      // Create patches.ts with intentional error
      const faultyPatchesContent = `
export async function applyPatches(context) {
  // This will throw an error
  throw new Error('Simulated patch failure: Invalid resource configuration');
}
`;

      fs.writeFileSync(path.join(testDir, 'patches.ts'), faultyPatchesContent);

      // Act & Assert: Should throw informative error
      await expect(resolverEngine.synthesize(manifest))
        .rejects.toThrow('Patch application failed: Simulated patch failure');
    });
  });

  describe('TC-PATCH-AUDIT-01: Patch registration validation', () => {
    test('should fail validation when patch registration is missing justification', async () => {
      // Arrange: Manifest missing required patch registration fields
      const invalidManifest = {
        service: 'invalid-patch-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        patches: [
          {
            name: 'add-elasticache',
            // Missing justification field
            approvedBy: 'architecture-review-board',
            approvedDate: '2024-01-15'
          }
        ],
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            }
          }
        ]
      };

      // Act & Assert: Validation should fail
      await expect(resolverEngine.synthesize(invalidManifest))
        .rejects.toThrow();

      try {
        await resolverEngine.synthesize(invalidManifest);
      } catch (error: any) {
        expect(error.message).toContain('justification field is required');
        expect(error.message).toContain('patch registration');
        expect(error.message).toContain('add-elasticache');
      }
    });

    test('should fail validation for patches missing required approval fields', async () => {
      const invalidApprovalManifest = {
        service: 'invalid-approval-test',
        owner: 'dev-team',
        complianceFramework: 'fedramp-moderate', // Stricter requirements
        patches: [
          {
            name: 'add-elasticache',
            justification: 'Required for performance',
            // Missing approvedBy and approvedDate for FedRAMP
          }
        ],
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            }
          }
        ]
      };

      await expect(resolverEngine.synthesize(invalidApprovalManifest))
        .rejects.toThrow();

      try {
        await resolverEngine.synthesize(invalidApprovalManifest);
      } catch (error: any) {
        expect(error.message).toContain('FedRAMP compliance requires');
        expect(error.message).toContain('approvedBy');
        expect(error.message).toContain('approvedDate');
        expect(error.message).toContain('formal approval process');
      }
    });
  });

  describe('TC-PATCH-AUDIT-02: Unregistered patch detection', () => {
    test('should warn and skip patch when patches.ts exists but is not registered', async () => {
      // Arrange: Manifest without patch registration
      const unregisteredManifest = {
        service: 'unregistered-patch-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        // No patches array - but patches.ts exists
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            }
          }
        ]
      };

      // Create patches.ts file (unregistered)
      const unregisteredPatchesContent = `
export async function applyPatches(context) {
  console.log('This patch should be skipped');
  return { resourcesAdded: ['UnregisteredResource'] };
}
`;

      fs.writeFileSync(path.join(testDir, 'patches.ts'), unregisteredPatchesContent);

      // Act: Synthesize
      const result = await resolverEngine.synthesize(unregisteredManifest);

      // Assert: Patch should not be applied
      expect(result.patchesApplied).toBe(false);

      // Verify warning was logged
      const logs = mockLogger.getLogs();
      const warnings = logs.filter(log => log.level === 2); // WARN level
      
      const patchWarning = warnings.find(log => 
        log.message.includes('patches.ts exists but no patches are registered')
      );
      
      expect(patchWarning).toBeDefined();
      expect(patchWarning!.message).toContain('governance requirement');
      expect(patchWarning!.message).toContain('register in manifest');
    });

    test('should detect patches.ts modifications without registration update', async () => {
      const manifest = {
        service: 'modification-detection-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        patches: [
          {
            name: 'add-cache',
            justification: 'Performance improvement',
            approvedBy: 'tech-lead',
            approvedDate: '2024-01-15',
            checksum: 'abc123' // Expected checksum
          }
        ],
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            }
          }
        ]
      };

      // Create patches.ts with different content than checksum expects
      const modifiedPatchesContent = `
export async function applyPatches(context) {
  // This content doesn't match the registered checksum
  console.log('Modified patch content');
}
`;

      fs.writeFileSync(path.join(testDir, 'patches.ts'), modifiedPatchesContent);

      // Act & Assert: Should detect modification
      await expect(resolverEngine.synthesize(manifest))
        .rejects.toThrow();

      try {
        await resolverEngine.synthesize(manifest);
      } catch (error: any) {
        expect(error.message).toContain('patches.ts has been modified');
        expect(error.message).toContain('checksum mismatch');
        expect(error.message).toContain('requires re-approval');
      }
    });
  });

  describe('TC-PATCH-METRIC-01: Patch usage tracking and audit logging', () => {
    test('should log patch application in audit trail with justification', async () => {
      const auditManifest = {
        service: 'audit-test',
        owner: 'security-team',
        complianceFramework: 'commercial',
        patches: [
          {
            name: 'add-monitoring',
            justification: 'Required for enhanced observability and compliance monitoring',
            approvedBy: 'architecture-review-board',
            approvedDate: '2024-01-15',
            riskAssessment: 'low',
            businessImpact: 'improved monitoring reduces incident response time'
          }
        ],
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            }
          }
        ]
      };

      const auditPatchesContent = `
export const patchInfo = {
  name: 'Enhanced Monitoring',
  version: '1.0.0',
  description: 'Adds CloudWatch custom metrics and alarms',
  author: 'platform-team'
};

export async function applyPatches(context) {
  // Add CloudWatch resources (simplified for test)
  console.log('Adding monitoring resources...');
  
  return {
    resourcesAdded: ['AWS::CloudWatch::Alarm', 'AWS::CloudWatch::Dashboard'],
    metricsAdded: ['custom.api.response_time', 'custom.api.error_rate']
  };
}
`;

      fs.writeFileSync(path.join(testDir, 'patches.ts'), auditPatchesContent);

      // Enable CI mode for audit logging
      process.env.CI = 'true';
      process.env.PLATFORM_AUDIT_LOG = 'true';

      try {
        // Act: Synthesize with audit logging
        const result = await resolverEngine.synthesize(auditManifest);

        // Assert: Audit log contains patch information
        const logs = mockLogger.getLogs();
        const auditLogs = logs.filter(log => 
          log.message.includes('AUDIT') || log.message.includes('patch')
        );

        expect(auditLogs.length).toBeGreaterThan(0);

        // Verify audit log structure
        const patchAuditLog = auditLogs.find(log => 
          log.message.includes('patch applied')
        );

        expect(patchAuditLog).toBeDefined();
        
        // In a real implementation, this would be JSON structured logging
        if (patchAuditLog!.data) {
          expect(patchAuditLog!.data.patchName).toBe('add-monitoring');
          expect(patchAuditLog!.data.justification).toBe(
            'Required for enhanced observability and compliance monitoring'
          );
          expect(patchAuditLog!.data.approvedBy).toBe('architecture-review-board');
          expect(patchAuditLog!.data.riskAssessment).toBe('low');
          expect(patchAuditLog!.data.timestamp).toBeDefined();
          expect(patchAuditLog!.data.service).toBe('audit-test');
        }

        // Verify synthesis report includes patch metrics
        const synthReport = resolverEngine.getSynthesisReport(result);
        expect(synthReport).toContain('Patches Applied: Yes');
        expect(synthReport).toContain('add-monitoring');

      } finally {
        delete process.env.CI;
        delete process.env.PLATFORM_AUDIT_LOG;
      }
    });

    test('should track patch usage metrics for platform analytics', async () => {
      const metricsManifest = {
        service: 'metrics-test',
        owner: 'data-team',
        complianceFramework: 'commercial',
        patches: [
          {
            name: 'add-analytics',
            justification: 'Business intelligence requirements',
            approvedBy: 'product-manager',
            approvedDate: '2024-01-20',
            category: 'analytics',
            complexity: 'medium'
          }
        ],
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            }
          }
        ]
      };

      const metricsPatchesContent = `
export async function applyPatches(context) {
  return {
    resourcesAdded: ['AWS::Kinesis::Stream'],
    executionTime: 1250 // milliseconds
  };
}
`;

      fs.writeFileSync(path.join(testDir, 'patches.ts'), metricsPatchesContent);

      // Enable telemetry
      process.env.PLATFORM_TELEMETRY = 'true';

      try {
        const startTime = Date.now();
        const result = await resolverEngine.synthesize(metricsManifest);
        const endTime = Date.now();

        // Assert: Metrics are captured
        const logs = mockLogger.getLogs();
        const telemetryLogs = logs.filter(log => 
          log.message.includes('telemetry') || log.message.includes('metrics')
        );

        expect(telemetryLogs.length).toBeGreaterThan(0);

        // Verify metrics structure (in real implementation, would send to metrics service)
        const metricsLog = telemetryLogs.find(log => 
          log.message.includes('patch metrics')
        );

        if (metricsLog && metricsLog.data) {
          expect(metricsLog.data.metrics).toEqual(expect.objectContaining({
            patchName: 'add-analytics',
            category: 'analytics',
            complexity: 'medium',
            resourcesAdded: 1,
            executionTime: expect.any(Number),
            synthesisTime: expect.any(Number),
            complianceFramework: 'commercial',
            service: 'metrics-test'
          }));
        }

      } finally {
        delete process.env.PLATFORM_TELEMETRY;
      }
    });
  });
});