/**
 * Integration Tests for ContextHydrator $ref Processing with svc plan
 * Tests the complete workflow from service.yml to plan output
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import * as yaml from 'yaml';

describe('ContextHydrator $ref Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'context-hydrator-ref-test-'));
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('TC-REF-IT-01: svc plan with top-level $ref', () => {
    test('should use instanceSize from referenced file in final plan output', async () => {
      // Arrange: Create external environments file
      const externalEnvironmentsPath = path.join(testDir, 'config', 'standard-environments.yml');
      fs.mkdirSync(path.dirname(externalEnvironmentsPath), { recursive: true });
      
      const externalEnvironments = {
        'dev-us-east-1': {
          defaults: {
            instanceSize: 'db.t4g.small',
            region: 'us-east-1',
            multiAz: false
          }
        },
        'prod-eu-west-1': {
          defaults: {
            instanceSize: 'db.r5.large',
            region: 'eu-west-1',
            multiAz: true
          }
        }
      };

      fs.writeFileSync(externalEnvironmentsPath, yaml.stringify(externalEnvironments));

      // Create service.yml with top-level $ref
      const serviceManifest = {
        service: 'global-database-service',
        owner: 'data-team',
        environments: {
          $ref: './config/standard-environments.yml'
        },
        components: [
          {
            name: 'primary-db',
            type: 'rds-postgres',
            properties: {
              databaseName: 'appdb',
              username: 'dbuser'
            }
          }
        ]
      };

      fs.writeFileSync('service.yml', yaml.stringify(serviceManifest));

      // Act: Run svc plan for dev environment
      const planResult = execSync('svc plan --env dev-us-east-1 --output-format json --dry-run', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Assert: Plan output should reflect instanceSize from external file
      const planOutput = JSON.parse(planResult);
      
      // Find the RDS database resource in the plan
      const rdsResources = Object.entries(planOutput.Resources || {})
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');

      expect(rdsResources).toHaveLength(1);
      
      const [resourceId, rdsResource] = rdsResources[0] as [string, any];
      expect(rdsResource.Properties.DBInstanceClass).toBe('db.t4g.small');
      
      // Verify other environment-specific properties
      expect(rdsResource.Properties.AvailabilityZone).toContain('us-east-1');
      expect(rdsResource.Properties.MultiAZ).toBe(false);
    }, 30000);

    test('should work with production environment configuration', async () => {
      // Arrange: Same external file, test prod environment
      const externalEnvironmentsPath = path.join(testDir, 'config', 'environments.yml');
      fs.mkdirSync(path.dirname(externalEnvironmentsPath), { recursive: true });

      const environments = {
        'dev-us-east-1': {
          defaults: { instanceSize: 'db.t3.micro' }
        },
        'prod-eu-west-1': {
          defaults: { 
            instanceSize: 'db.r5.large',
            storageEncrypted: true,
            backupRetentionPeriod: 30
          }
        }
      };

      fs.writeFileSync(externalEnvironmentsPath, yaml.stringify(environments));

      const serviceManifest = {
        service: 'prod-service',
        environments: { $ref: './config/environments.yml' },
        components: [
          { name: 'db', type: 'rds-postgres' }
        ]
      };

      fs.writeFileSync('service.yml', yaml.stringify(serviceManifest));

      // Act: Plan for production environment
      const planResult = execSync('svc plan --env prod-eu-west-1 --output-format json --dry-run', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Assert: Production configuration applied
      const planOutput = JSON.parse(planResult);
      const rdsResources = Object.entries(planOutput.Resources || {})
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');

      const [resourceId, rdsResource] = rdsResources[0] as [string, any];
      expect(rdsResource.Properties.DBInstanceClass).toBe('db.r5.large');
      expect(rdsResource.Properties.StorageEncrypted).toBe(true);
      expect(rdsResource.Properties.BackupRetentionPeriod).toBe(30);
    });
  });

  describe('TC-REF-IT-02: svc plan with mixed inline and $ref configurations', () => {
    test('should prioritize inline definition over global $ref', async () => {
      // Arrange: Create global environments file
      const globalEnvironmentsPath = path.join(testDir, 'config', 'global-environments.yml');
      fs.mkdirSync(path.dirname(globalEnvironmentsPath), { recursive: true });

      const globalEnvironments = {
        'prod-eu-west-1': {
          defaults: {
            instanceSize: 'db.r5.large',  // Will be overridden
            multiAz: true,
            region: 'eu-west-1'
          }
        }
      };

      fs.writeFileSync(globalEnvironmentsPath, yaml.stringify(globalEnvironments));

      // Create service-specific environment override
      const serviceSpecificPath = path.join(testDir, 'config', 'service-specific.yml');
      const serviceSpecificConfig = {
        defaults: {
          instanceSize: 'db.r5.xlarge',  // Override from service-specific config
          connections: 200,
          ssl: true
        }
      };

      fs.writeFileSync(serviceSpecificPath, yaml.stringify(serviceSpecificConfig));

      // Create service.yml with mixed configuration
      const serviceManifest = {
        service: 'mixed-config-service',
        environments: {
          $ref: './config/global-environments.yml',  // Global base
          'prod-eu-west-1': {  // Inline override
            $ref: './config/service-specific.yml'
          }
        },
        components: [
          {
            name: 'database',
            type: 'rds-postgres',
            properties: {
              databaseName: 'servicedb'
            }
          }
        ]
      };

      fs.writeFileSync('service.yml', yaml.stringify(serviceManifest));

      // Act: Run svc plan for overridden environment
      const planResult = execSync('svc plan --env prod-eu-west-1 --output-format json --dry-run', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Assert: Service-specific override should take precedence
      const planOutput = JSON.parse(planResult);
      const rdsResources = Object.entries(planOutput.Resources || {})
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');

      const [resourceId, rdsResource] = rdsResources[0] as [string, any];
      
      // Service-specific values should override global
      expect(rdsResource.Properties.DBInstanceClass).toBe('db.r5.xlarge'); // Overridden
      expect(rdsResource.Properties.MaxConnections).toBe(200); // Service-specific
      
      // Note: The exact property mapping depends on the RDS component implementation
      // In a real integration test, verify the final CloudFormation properties
    });

    test('should handle environment-specific JSON reference', async () => {
      // Arrange: Create JSON environment configuration
      const jsonConfigPath = path.join(testDir, 'config', 'dev-config.json');
      fs.mkdirSync(path.dirname(jsonConfigPath), { recursive: true });

      const jsonConfig = {
        defaults: {
          instanceSize: 'db.t3.medium',
          storageSize: 100,
          monitoringEnabled: true
        }
      };

      fs.writeFileSync(jsonConfigPath, JSON.stringify(jsonConfig, null, 2));

      const serviceManifest = {
        service: 'json-config-service',
        environments: {
          'dev-us-west-2': {
            $ref: './config/dev-config.json'
          },
          'prod-us-west-2': {
            defaults: {
              instanceSize: 'db.r5.large',
              storageSize: 500
            }
          }
        },
        components: [
          { name: 'db', type: 'rds-postgres' }
        ]
      };

      fs.writeFileSync('service.yml', yaml.stringify(serviceManifest));

      // Act: Test both environments
      const devPlan = execSync('svc plan --env dev-us-west-2 --output-format json --dry-run', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const prodPlan = execSync('svc plan --env prod-us-west-2 --output-format json --dry-run', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Assert: Dev environment uses JSON config
      const devOutput = JSON.parse(devPlan);
      const devRdsResources = Object.entries(devOutput.Resources || {})
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');

      const [devResourceId, devRds] = devRdsResources[0] as [string, any];
      expect(devRds.Properties.DBInstanceClass).toBe('db.t3.medium');

      // Assert: Prod environment uses inline config
      const prodOutput = JSON.parse(prodPlan);
      const prodRdsResources = Object.entries(prodOutput.Resources || {})
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');

      const [prodResourceId, prodRds] = prodRdsResources[0] as [string, any];
      expect(prodRds.Properties.DBInstanceClass).toBe('db.r5.large');
    });

    test('should work with nested directory structure', async () => {
      // Arrange: Create nested config directory structure
      const nestedConfigPath = path.join(testDir, 'environments', 'regions', 'us-east-1', 'dev.yml');
      fs.mkdirSync(path.dirname(nestedConfigPath), { recursive: true });

      const nestedConfig = {
        defaults: {
          instanceSize: 'db.t3.small',
          availabilityZone: 'us-east-1a',
          region: 'us-east-1'
        }
      };

      fs.writeFileSync(nestedConfigPath, yaml.stringify(nestedConfig));

      const serviceManifest = {
        service: 'nested-config-service',
        environments: {
          'dev-us-east-1': {
            $ref: './environments/regions/us-east-1/dev.yml'
          }
        },
        components: [
          { name: 'regional-db', type: 'rds-postgres' }
        ]
      };

      fs.writeFileSync('service.yml', yaml.stringify(serviceManifest));

      // Act
      const planResult = execSync('svc plan --env dev-us-east-1 --output-format json --dry-run', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Assert: Nested config loaded correctly
      const planOutput = JSON.parse(planResult);
      const rdsResources = Object.entries(planOutput.Resources || {})
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');

      const [resourceId, rdsResource] = rdsResources[0] as [string, any];
      expect(rdsResource.Properties.DBInstanceClass).toBe('db.t3.small');
      expect(rdsResource.Properties.AvailabilityZone).toBe('us-east-1a');
    });
  });

  describe('Error handling in integration scenarios', () => {
    test('should provide clear error when referenced file is missing', async () => {
      // Arrange: Service.yml with reference to non-existent file
      const serviceManifest = {
        service: 'error-test-service',
        environments: {
          $ref: './config/missing-file.yml'
        },
        components: [
          { name: 'db', type: 'rds-postgres' }
        ]
      };

      fs.writeFileSync('service.yml', yaml.stringify(serviceManifest));

      // Act & Assert: Should fail with clear error message
      expect(() => {
        execSync('svc plan --env dev --dry-run', {
          encoding: 'utf8',
          stdio: 'pipe'
        });
      }).toThrow();

      // Verify error message contains helpful information
      try {
        execSync('svc plan --env dev --dry-run', {
          encoding: 'utf8',
          stdio: 'pipe'
        });
      } catch (error: any) {
        expect(error.stderr.toString()).toContain('Referenced file not found');
        expect(error.stderr.toString()).toContain('./config/missing-file.yml');
      }
    });

    test('should prevent path traversal in integration context', async () => {
      // Arrange: Malicious service.yml
      const maliciousManifest = {
        service: 'malicious-service',
        environments: {
          $ref: '../../../etc/passwd'
        },
        components: [
          { name: 'db', type: 'rds-postgres' }
        ]
      };

      fs.writeFileSync('service.yml', yaml.stringify(maliciousManifest));

      // Act & Assert: Should fail with security error
      expect(() => {
        execSync('svc plan --env dev --dry-run', {
          encoding: 'utf8',
          stdio: 'pipe'
        });
      }).toThrow();

      try {
        execSync('svc plan --env dev --dry-run', {
          encoding: 'utf8',
          stdio: 'pipe'
        });
      } catch (error: any) {
        expect(error.stderr.toString()).toContain('Security violation');
        expect(error.stderr.toString()).toContain('path traversal');
      }
    });
  });

  describe('Complex real-world scenarios', () => {
    test('should handle multi-region service with shared and region-specific configs', async () => {
      // Arrange: Complex multi-region setup
      
      // Shared global configuration
      const globalConfigPath = path.join(testDir, 'config', 'global.yml');
      fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
      
      const globalConfig = {
        'dev-us-east-1': {
          defaults: {
            instanceSize: 'db.t3.micro',
            backup: false
          }
        },
        'dev-eu-west-1': {
          defaults: {
            instanceSize: 'db.t3.micro',
            backup: false
          }
        },
        'prod-us-east-1': {
          defaults: {
            instanceSize: 'db.r5.large',
            backup: true,
            multiAz: true
          }
        }
      };

      fs.writeFileSync(globalConfigPath, yaml.stringify(globalConfig));

      // Region-specific override for EU production
      const euProdConfigPath = path.join(testDir, 'config', 'regions', 'eu-prod.yml');
      fs.mkdirSync(path.dirname(euProdConfigPath), { recursive: true });

      const euProdConfig = {
        defaults: {
          instanceSize: 'db.r5.xlarge',  // Larger for EU compliance
          backup: true,
          multiAz: true,
          gdprCompliant: true,
          dataResidency: 'eu-only'
        }
      };

      fs.writeFileSync(euProdConfigPath, yaml.stringify(euProdConfig));

      const serviceManifest = {
        service: 'global-payment-service',
        owner: 'payments-team',
        environments: {
          $ref: './config/global.yml',
          'prod-eu-west-1': {  // Override for EU production
            $ref: './config/regions/eu-prod.yml'
          }
        },
        components: [
          {
            name: 'payment-db',
            type: 'rds-postgres',
            properties: {
              databaseName: 'payments',
              username: 'paymentuser'
            }
          }
        ]
      };

      fs.writeFileSync('service.yml', yaml.stringify(serviceManifest));

      // Act: Test multiple environments
      const usProdPlan = execSync('svc plan --env prod-us-east-1 --output-format json --dry-run', {
        encoding: 'utf8', stdio: 'pipe'
      });

      const euProdPlan = execSync('svc plan --env prod-eu-west-1 --output-format json --dry-run', {
        encoding: 'utf8', stdio: 'pipe'
      });

      // Assert: US production uses global config
      const usProdOutput = JSON.parse(usProdPlan);
      const usRdsResources = Object.entries(usProdOutput.Resources || {})
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');
      const [usResourceId, usRds] = usRdsResources[0] as [string, any];
      expect(usRds.Properties.DBInstanceClass).toBe('db.r5.large');

      // Assert: EU production uses region-specific override
      const euProdOutput = JSON.parse(euProdPlan);
      const euRdsResources = Object.entries(euProdOutput.Resources || {})
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');
      const [euResourceId, euRds] = euRdsResources[0] as [string, any];
      expect(euRds.Properties.DBInstanceClass).toBe('db.r5.xlarge');
    });
  });
});