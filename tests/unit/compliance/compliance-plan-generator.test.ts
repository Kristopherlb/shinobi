import { CompliancePlanGenerator, CompliancePlanConfig } from '../../../src/platform/services/compliance-plan-generator';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn()
  }
}));

describe('CompliancePlanGenerator', () => {
  let generator: CompliancePlanGenerator;
  let mockConfig: CompliancePlanConfig;

  beforeEach(() => {
    generator = new CompliancePlanGenerator();
    mockConfig = {
      outputDir: './test-output',
      includeAuditTrail: true,
      includeControlDetails: true,
      includeTaggingPolicy: true
    };

    // Reset mocks
    jest.clearAllMocks();
    (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  describe('generateCompliancePlan', () => {
    it('should generate compliance plan for s3-bucket', async () => {
      const componentConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        encryption: { enabled: true },
        publicAccessBlock: true
      };

      const plan = await generator.generateCompliancePlan(
        'test-s3-bucket',
        's3-bucket',
        'commercial',
        componentConfig,
        mockConfig
      );

      expect(plan).toBeDefined();
      expect(plan.componentId).toBe('test-s3-bucket');
      expect(plan.componentType).toBe('s3-bucket');
      expect(plan.framework).toBe('commercial');
      expect(plan.controls.length).toBeGreaterThan(0);
      expect(plan.dataClassification).toBe('confidential');
      expect(Object.keys(plan.requiredTags)).toContain('Service');
      expect(plan.complianceRules.length).toBeGreaterThan(0);
    });

    it('should include tagging policy when requested', async () => {
      const componentConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner'
      };

      const plan = await generator.generateCompliancePlan(
        'test-lambda',
        'lambda-api',
        'commercial',
        componentConfig,
        mockConfig
      );

      expect((plan as any).taggingPolicy).toBeDefined();
      expect((plan as any).taggingPolicy.requiredTags).toContain('Service');
    });

    it('should include audit trail when requested', async () => {
      const componentConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner'
      };

      const plan = await generator.generateCompliancePlan(
        'test-lambda',
        'lambda-api',
        'commercial',
        componentConfig,
        mockConfig
      );

      expect((plan as any).auditTrail).toBeDefined();
      expect((plan as any).auditTrail.generatedBy).toBe('Shinobi Platform');
    });

    it('should persist compliance plan to file', async () => {
      const componentConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner'
      };

      await generator.generateCompliancePlan(
        'test-component',
        's3-bucket',
        'commercial',
        componentConfig,
        mockConfig
      );

      expect(fs.promises.mkdir).toHaveBeenCalledWith('./test-output', { recursive: true });
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        'test-output/test-component.plan.json',
        expect.any(String),
        'utf8'
      );
    });
  });

  describe('generateComplianceSummary', () => {
    it('should generate compliance summary for multiple components', async () => {
      const components = [
        {
          id: 's3-bucket-1',
          type: 's3-bucket' as const,
          framework: 'commercial' as const,
          config: { service: 'test-service', environment: 'dev' }
        },
        {
          id: 'lambda-1',
          type: 'lambda-api' as const,
          framework: 'commercial' as const,
          config: { service: 'test-service', environment: 'dev' }
        }
      ];

      const summary = await generator.generateComplianceSummary(components, mockConfig);

      expect(summary.summary.totalComponents).toBe(2);
      expect(summary.summary.frameworks.commercial).toBe(2);
      expect(summary.components).toHaveLength(2);
      expect(summary.components[0].id).toBe('s3-bucket-1');
      expect(summary.components[1].id).toBe('lambda-1');
    });

    it('should count controls and data classifications', async () => {
      const components = [
        {
          id: 's3-bucket-1',
          type: 's3-bucket' as const,
          framework: 'commercial' as const,
          config: {
            service: 'test-service',
            environment: 'dev',
            dataClassification: 'confidential'
          }
        }
      ];

      const summary = await generator.generateComplianceSummary(components, mockConfig);

      expect(summary.summary.controls).toBeDefined();
      expect(summary.summary.dataClassifications).toBeDefined();
      expect(summary.summary.dataClassifications.confidential).toBe(1);
    });
  });

  describe('validateManifestCompliance', () => {
    it('should validate compliant manifest', () => {
      const manifest = {
        manifestVersion: '1.0',
        service: {
          name: 'test-service',
          owner: 'test-owner'
        },
        components: [
          {
            name: 'test-s3',
            type: 's3-bucket',
            labels: {
              dataClassification: 'confidential'
            }
          }
        ]
      };

      const result = generator.validateManifestCompliance(manifest, 'commercial');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing data classification for data stores', () => {
      const manifest = {
        manifestVersion: '1.0',
        service: {
          name: 'test-service',
          owner: 'test-owner'
        },
        components: [
          {
            name: 'test-s3',
            type: 's3-bucket'
            // Missing dataClassification
          }
        ]
      };

      const result = generator.validateManifestCompliance(manifest, 'commercial');

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('requires data classification label'))).toBe(true);
      expect(result.missingDataClassifications).toContain('test-s3');
    });

    it('should detect invalid data classification', () => {
      const manifest = {
        manifestVersion: '1.0',
        service: {
          name: 'test-service',
          owner: 'test-owner'
        },
        components: [
          {
            name: 'test-s3',
            type: 's3-bucket',
            labels: {
              dataClassification: 'invalid-classification'
            }
          }
        ]
      };

      const result = generator.validateManifestCompliance(manifest, 'commercial');

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid data classification'))).toBe(true);
    });

    it('should detect missing required manifest fields', () => {
      const manifest = {
        // Missing manifestVersion
        service: {
          // Missing name and owner
        }
      };

      const result = generator.validateManifestCompliance(manifest, 'commercial');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Manifest version is required');
      expect(result.errors).toContain('Service name is required');
      expect(result.errors).toContain('Service owner is required');
    });

    it('should warn about missing SSP ID for FedRAMP', () => {
      const manifest = {
        manifestVersion: '1.0',
        service: {
          name: 'test-service',
          owner: 'test-owner'
          // Missing sspId
        },
        components: []
      };

      const result = generator.validateManifestCompliance(manifest, 'fedramp-moderate');

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('SSP ID is recommended for FedRAMP deployments');
    });
  });

  describe('generateOPAPolicy', () => {
    it('should generate OPA policy for commercial framework', () => {
      const policy = generator.generateOPAPolicy('commercial');

      expect(policy).toContain('package shinobi.compliance');
      expect(policy).toContain('Compliance validation policy for commercial');
      expect(policy).toContain('has_required_tags');
      expect(policy).toContain('valid_data_classification');
      expect(policy).toContain('compliant');
    });

    it('should generate OPA policy for fedramp-moderate framework', () => {
      const policy = generator.generateOPAPolicy('fedramp-moderate');

      expect(policy).toContain('Compliance validation policy for fedramp-moderate');
      expect(policy).toContain('valid_compliance_framework');
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance report', async () => {
      const components = [
        {
          id: 'test-component',
          type: 's3-bucket' as const,
          framework: 'commercial' as const,
          config: { service: 'test-service', environment: 'dev' }
        }
      ];

      const report = await generator.generateComplianceReport(components, mockConfig);

      expect(report).toContain('# Compliance Report');
      expect(report).toContain('Total Components: 1');
      expect(report).toContain('## Component Details');
      expect(report).toContain('### test-component');
    });
  });
});
