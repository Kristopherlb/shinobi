/**
 * Theme 4: Governance & Compliance Test Cases
 * Tests FedRAMP compliance enforcement and governance controls
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { ResolverEngine } from '../../packages/core-engine/src/resolver-engine';
import { Logger } from '../../packages/core-engine/src/logger';
import { ValidationPipeline } from '../../src/validation/pipeline';

describe('Theme 4: Governance & Compliance', () => {
  let resolverEngine: ResolverEngine;
  let validationPipeline: ValidationPipeline;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger();
    resolverEngine = new ResolverEngine({ logger: mockLogger });
    validationPipeline = new ValidationPipeline();
  });

  describe('TC-GOV-01: FedRAMP High RDS encryption requirements', () => {
    test('should use Customer-Managed KMS Key for FedRAMP High RDS instance', async () => {
      // Arrange: FedRAMP High manifest
      const fedrampHighManifest = {
        service: 'fedramp-high-test',
        owner: 'security-team',
        complianceFramework: 'fedramp-high',
        components: [
          {
            name: 'secure-database',
            type: 'rds-postgres',
            config: {
              dbName: 'secure_db',
              kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
            }
          }
        ]
      };

      // Act: Synthesize FedRAMP High service
      const result = await resolverEngine.synthesize(fedrampHighManifest);

      // Assert: Extract RDS configuration
      const cfnTemplate = result.app.synth().getStackByName(`${fedrampHighManifest.service}-stack`).template;
      const rdsResource = Object.values(cfnTemplate.Resources)
        .find((r: any) => r.Type === 'AWS::RDS::DBInstance') as any;

      // Verify encryption is enabled with CMK
      expect(rdsResource.Properties.StorageEncrypted).toBe(true);
      expect(rdsResource.Properties.KmsKeyId).toContain('arn:aws:kms:');
      expect(rdsResource.Properties.KmsKeyId).not.toBe('alias/aws/rds'); // Not AWS managed

      // Verify FedRAMP High specific settings
      expect(rdsResource.Properties.MultiAZ).toBe(true);
      expect(rdsResource.Properties.DeletionProtection).toBe(true);
      expect(rdsResource.Properties.BackupRetentionPeriod).toBeGreaterThanOrEqual(35);
      expect(rdsResource.Properties.EnablePerformanceInsights).toBe(true);
      expect(rdsResource.Properties.MonitoringInterval).toBe(60);
    });
  });

  describe('TC-GOV-02: Commercial framework uses AWS-managed keys', () => {
    test('should use AWS-managed KMS key for commercial compliance RDS instance', async () => {
      // Arrange: Commercial compliance manifest
      const commercialManifest = {
        service: 'commercial-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'standard-database',
            type: 'rds-postgres',
            config: {
              dbName: 'standard_db',
              encrypted: true // Optional for commercial
            }
          }
        ]
      };

      // Act: Synthesize commercial service
      const result = await resolverEngine.synthesize(commercialManifest);

      // Assert: Extract RDS configuration
      const cfnTemplate = result.app.synth().getStackByName(`${commercialManifest.service}-stack`).template;
      const rdsResource = Object.values(cfnTemplate.Resources)
        .find((r: any) => r.Type === 'AWS::RDS::DBInstance') as any;

      // Verify encryption uses AWS managed key or is optional
      if (rdsResource.Properties.StorageEncrypted) {
        expect(rdsResource.Properties.KmsKeyId).toBeUndefined(); // Uses default AWS managed key
      }

      // Verify commercial settings are less restrictive
      expect(rdsResource.Properties.BackupRetentionPeriod).toBeLessThan(35);
      expect(rdsResource.Properties.EnablePerformanceInsights).toBe(false);
      expect(rdsResource.Properties.MonitoringInterval).toBe(0);
    });
  });

  describe('TC-GOV-03: FedRAMP compliance violation enforcement', () => {
    test('should fail validation for unencrypted S3 bucket in FedRAMP High', async () => {
      // Arrange: FedRAMP High manifest with compliance violation
      const violatingManifest = {
        service: 'fedramp-violation-test',
        owner: 'test-team',
        complianceFramework: 'fedramp-high',
        components: [
          {
            name: 'insecure-bucket',
            type: 's3-bucket',
            config: {
              bucketName: 'test-bucket',
              encrypted: false, // Violation: FedRAMP requires encryption
              versioning: false  // Violation: FedRAMP requires versioning
            }
          }
        ]
      };

      // Act & Assert: Should throw validation error
      await expect(async () => {
        await resolverEngine.synthesize(violatingManifest);
      }).rejects.toThrow();

      // Verify specific error details
      try {
        await resolverEngine.synthesize(violatingManifest);
      } catch (error: any) {
        expect(error.message).toContain('FedRAMP compliance violation');
        expect(error.message).toContain('encryption');
        expect(error.message).toContain('AC-3'); // Example FedRAMP control citation
      }
    });

    test('should fail validation for insufficient backup retention in FedRAMP', async () => {
      const violatingManifest = {
        service: 'fedramp-backup-violation',
        owner: 'test-team',
        complianceFramework: 'fedramp-moderate',
        components: [
          {
            name: 'database',
            type: 'rds-postgres',
            config: {
              dbName: 'test_db',
              backupRetention: 5 // Violation: FedRAMP Moderate requires minimum 30 days
            }
          }
        ]
      };

      await expect(async () => {
        await resolverEngine.synthesize(violatingManifest);
      }).rejects.toThrow();

      try {
        await resolverEngine.synthesize(violatingManifest);
      } catch (error: any) {
        expect(error.message).toContain('backup retention');
        expect(error.message).toContain('30 days');
        expect(error.message).toContain('CP-9'); // FedRAMP backup control
      }
    });
  });

  describe('TC-GOV-04: Clear policy violation feedback', () => {
    test('should provide clear warning for non-critical policy violations', async () => {
      // Arrange: Manifest with non-critical policy issue
      const warningManifest = {
        service: 'warning-test',
        owner: 'test-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src',
              timeout: 900 // Warning: Very high timeout, potential cost concern
            }
          }
        ]
      };

      // Act: Synthesize with warnings
      const result = await resolverEngine.synthesize(warningManifest);

      // Assert: Check logs for warning messages
      const logs = mockLogger.getLogs();
      const warningLogs = logs.filter(log => log.level === 2); // WARN level

      expect(warningLogs.length).toBeGreaterThan(0);
      
      const timeoutWarning = warningLogs.find(log => 
        log.message.includes('timeout') && log.message.includes('900')
      );
      
      expect(timeoutWarning).toBeDefined();
      expect(timeoutWarning!.message).toContain('COST-001'); // Rule ID
      expect(timeoutWarning!.message).toContain('https://'); // Documentation link
    });

    test('should provide actionable guidance in error messages', async () => {
      const invalidManifest = {
        service: 'invalid-test',
        owner: 'test-team',
        complianceFramework: 'fedramp-high',
        components: [
          {
            name: 'database',
            type: 'rds-postgres',
            config: {
              dbName: 'test_db',
              instanceClass: 'db.t1.micro' // Error: Deprecated instance class
            }
          }
        ]
      };

      try {
        await resolverEngine.synthesize(invalidManifest);
        fail('Should have thrown validation error');
      } catch (error: any) {
        // Verify error message provides clear guidance
        expect(error.message).toContain('db.t1.micro is deprecated');
        expect(error.message).toContain('recommended alternatives:');
        expect(error.message).toContain('db.t3.micro');
        expect(error.message).toContain('RDS-003'); // Rule ID
        expect(error.message).toContain('migration guide'); // Link to help
      }
    });

    test('should validate compliance framework transitions', async () => {
      // Test upgrading from commercial to FedRAMP
      const upgradedManifest = {
        service: 'compliance-upgrade-test',
        owner: 'security-team',
        complianceFramework: 'fedramp-moderate',
        components: [
          {
            name: 'existing-bucket',
            type: 's3-bucket',
            config: {
              bucketName: 'legacy-bucket',
              encrypted: false, // This was OK for commercial, but not FedRAMP
              publicAccess: true // Definitely not OK for FedRAMP
            }
          }
        ]
      };

      try {
        await resolverEngine.synthesize(upgradedManifest);
        fail('Should have thrown compliance upgrade validation error');
      } catch (error: any) {
        expect(error.message).toContain('compliance framework upgrade');
        expect(error.message).toContain('commercial to fedramp-moderate');
        expect(error.message).toContain('breaking changes required');
        expect(error.message).toContain('migration checklist');
      }
    });
  });

  describe('Compliance Framework Feature Matrix', () => {
    test('should enforce different capabilities based on compliance framework', async () => {
      const testCases = [
        {
          framework: 'commercial',
          expectedFeatures: {
            allowPublicS3: true,
            requireEncryption: false,
            minBackupDays: 7,
            requireMultiAZ: false
          }
        },
        {
          framework: 'fedramp-moderate', 
          expectedFeatures: {
            allowPublicS3: false,
            requireEncryption: true,
            minBackupDays: 30,
            requireMultiAZ: true
          }
        },
        {
          framework: 'fedramp-high',
          expectedFeatures: {
            allowPublicS3: false,
            requireEncryption: true,
            minBackupDays: 35,
            requireMultiAZ: true,
            requireVPCEndpoints: true
          }
        }
      ];

      for (const testCase of testCases) {
        const manifest = {
          service: `${testCase.framework}-feature-test`,
          owner: 'test-team',
          complianceFramework: testCase.framework,
          components: [
            {
              name: 'database',
              type: 'rds-postgres',
              config: {
                dbName: 'test_db'
              }
            }
          ]
        };

        const result = await resolverEngine.synthesize(manifest);
        const cfnTemplate = result.app.synth().getStackByName(`${manifest.service}-stack`).template;
        const rdsResource = Object.values(cfnTemplate.Resources)
          .find((r: any) => r.Type === 'AWS::RDS::DBInstance') as any;

        // Verify framework-specific requirements
        expect(rdsResource.Properties.StorageEncrypted).toBe(testCase.expectedFeatures.requireEncryption);
        expect(rdsResource.Properties.MultiAZ).toBe(testCase.expectedFeatures.requireMultiAZ);
        expect(rdsResource.Properties.BackupRetentionPeriod).toBeGreaterThanOrEqual(testCase.expectedFeatures.minBackupDays);
      }
    });
  });
});