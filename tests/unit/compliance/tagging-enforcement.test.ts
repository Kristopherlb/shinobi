import { TaggingEnforcementService, TaggingConfig, ResourceTags } from '../../../src/platform/services/tagging-enforcement';

describe('TaggingEnforcementService', () => {
  let service: TaggingEnforcementService;

  beforeEach(() => {
    service = new TaggingEnforcementService();
  });

  describe('applyComplianceTags', () => {
    it('should apply compliance tags for s3-bucket', () => {
      const config: TaggingConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        complianceFramework: 'commercial',
        dataClassification: 'confidential'
      };

      const tags = service.applyComplianceTags('s3-bucket', 'test-bucket', config);

      expect(tags.Service).toBe('test-service');
      expect(tags.Component).toBe('test-bucket');
      expect(tags.ComponentType).toBe('s3-bucket');
      expect(tags.Environment).toBe('dev');
      expect(tags.Owner).toBe('test-owner');
      expect(tags.ComplianceFramework).toBe('commercial');
      expect(tags.DataClassification).toBe('confidential');
      expect(tags.ManagedBy).toBe('Shinobi');
    });

    it('should apply FedRAMP tags for fedramp-moderate', () => {
      const config: TaggingConfig = {
        service: 'test-service',
        environment: 'prod',
        owner: 'test-owner',
        complianceFramework: 'fedramp-moderate',
        sspId: 'SSP-123'
      };

      const tags = service.applyComplianceTags('lambda-api', 'test-lambda', config);

      expect(tags.ComplianceFramework).toBe('fedramp-moderate');
      expect(tags.FedRAMPCompliant).toBe('true');
      expect(tags.SSPId).toBe('SSP-123');
    });

    it('should apply custom tags', () => {
      const config: TaggingConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        complianceFramework: 'commercial',
        customTags: {
          'CustomTag1': 'value1',
          'CustomTag2': 'value2'
        }
      };

      const tags = service.applyComplianceTags('ec2-instance', 'test-instance', config);

      expect(tags.CustomTag1).toBe('value1');
      expect(tags.CustomTag2).toBe('value2');
    });
  });

  describe('validateTags', () => {
    it('should validate compliant tags', () => {
      const tags: ResourceTags = {
        Service: 'test-service',
        Component: 'test-bucket',
        Environment: 'dev',
        Owner: 'test-owner',
        DataClassification: 'confidential',
        ComplianceFramework: 'commercial'
      };

      const config: TaggingConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        complianceFramework: 'commercial',
        dataClassification: 'confidential'
      };

      const result = service.validateTags('s3-bucket', tags, config);

      expect(result.valid).toBe(true);
      expect(result.missingTags).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required tags', () => {
      const tags: ResourceTags = {
        Service: 'test-service'
        // Missing other required tags
      };

      const config: TaggingConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        complianceFramework: 'commercial'
      };

      const result = service.validateTags('s3-bucket', tags, config);

      expect(result.valid).toBe(false);
      expect(result.missingTags.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect tag value mismatches', () => {
      const tags: ResourceTags = {
        Service: 'wrong-service',
        Component: 'test-bucket',
        Environment: 'wrong-env',
        Owner: 'test-owner',
        ComplianceFramework: 'commercial'
      };

      const config: TaggingConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        complianceFramework: 'commercial'
      };

      const result = service.validateTags('s3-bucket', tags, config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Service tag mismatch'))).toBe(true);
      expect(result.errors.some(error => error.includes('Environment tag mismatch'))).toBe(true);
    });

    it('should validate data classification', () => {
      const tags: ResourceTags = {
        Service: 'test-service',
        Component: 'test-bucket',
        Environment: 'dev',
        Owner: 'test-owner',
        DataClassification: 'invalid-classification',
        ComplianceFramework: 'commercial'
      };

      const config: TaggingConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        complianceFramework: 'commercial'
      };

      const result = service.validateTags('s3-bucket', tags, config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid data classification'))).toBe(true);
    });

    it('should validate FedRAMP tags', () => {
      const tags: ResourceTags = {
        Service: 'test-service',
        Component: 'test-lambda',
        Environment: 'prod',
        Owner: 'test-owner',
        ComplianceFramework: 'fedramp-moderate',
        FedRAMPCompliant: 'false', // Should be 'true'
        SSPId: 'wrong-ssp'
      };

      const config: TaggingConfig = {
        service: 'test-service',
        environment: 'prod',
        owner: 'test-owner',
        complianceFramework: 'fedramp-moderate',
        sspId: 'SSP-123'
      };

      const result = service.validateTags('lambda-api', tags, config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('FedRAMPCompliant tag must be set to "true"'))).toBe(true);
      expect(result.errors.some(error => error.includes('SSPId tag mismatch'))).toBe(true);
    });
  });

  describe('generateTaggingPolicy', () => {
    it('should generate tagging policy for s3-bucket', () => {
      const config: TaggingConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        complianceFramework: 'commercial',
        dataClassification: 'confidential'
      };

      const policy = service.generateTaggingPolicy('s3-bucket', config);

      expect(policy.requiredTags).toContain('Service');
      expect(policy.requiredTags).toContain('DataClassification');
      expect(policy.tagValues.Service).toBe('test-service');
      expect(policy.tagValues.DataClassification).toBe('confidential');
      expect(policy.validationRules.length).toBeGreaterThan(0);
    });

    it('should generate tagging policy for lambda-api', () => {
      const config: TaggingConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        complianceFramework: 'commercial'
      };

      const policy = service.generateTaggingPolicy('lambda-api', config);

      expect(policy.requiredTags).toContain('Service');
      expect(policy.requiredTags).not.toContain('DataClassification');
      expect(policy.tagValues.Service).toBe('test-service');
    });
  });

  describe('isDataClassificationRequired', () => {
    it('should return true for data store components', () => {
      expect(service.isDataClassificationRequired('s3-bucket')).toBe(true);
      expect(service.isDataClassificationRequired('rds-postgres')).toBe(true);
    });

    it('should return false for non-data store components', () => {
      expect(service.isDataClassificationRequired('lambda-api')).toBe(false);
      expect(service.isDataClassificationRequired('ec2-instance')).toBe(false);
    });
  });

  describe('getValidDataClassifications', () => {
    it('should return valid data classification values', () => {
      const classifications = service.getValidDataClassifications();

      expect(classifications).toContain('public');
      expect(classifications).toContain('internal');
      expect(classifications).toContain('confidential');
      expect(classifications).toContain('pii');
      expect(classifications).toHaveLength(4);
    });
  });

  describe('validateDataClassification', () => {
    it('should validate correct data classifications', () => {
      expect(service.validateDataClassification('public')).toBe(true);
      expect(service.validateDataClassification('internal')).toBe(true);
      expect(service.validateDataClassification('confidential')).toBe(true);
      expect(service.validateDataClassification('pii')).toBe(true);
    });

    it('should reject invalid data classifications', () => {
      expect(service.validateDataClassification('invalid')).toBe(false);
      expect(service.validateDataClassification('')).toBe(false);
      expect(service.validateDataClassification('PUBLIC')).toBe(false);
    });
  });

  describe('generateCDKTaggingConfig', () => {
    it('should generate CDK tagging configuration', () => {
      const config: TaggingConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        complianceFramework: 'commercial',
        dataClassification: 'confidential'
      };

      const cdkConfig = service.generateCDKTaggingConfig('s3-bucket', 'test-bucket', config);

      expect(cdkConfig.tags).toBeDefined();
      expect(cdkConfig.tags.Service).toBe('test-service');
      expect(cdkConfig.tagPolicy).toBeDefined();
      expect(cdkConfig.tagPolicy.requiredTags).toContain('Service');
      expect(cdkConfig.tagPolicy.tagValueConstraints).toBeDefined();
    });
  });
});