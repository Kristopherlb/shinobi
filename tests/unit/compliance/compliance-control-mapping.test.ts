import { ComplianceControlMappingService, NISTControl, ComponentControlMapping } from '../../../src/platform/services/compliance-control-mapping';

describe('ComplianceControlMappingService', () => {
  let service: ComplianceControlMappingService;

  beforeEach(() => {
    service = new ComplianceControlMappingService();
  });

  describe('getControlMapping', () => {
    it('should return control mapping for s3-bucket', () => {
      const mapping = service.getControlMapping('s3-bucket');

      expect(mapping).toBeDefined();
      expect(mapping?.componentType).toBe('s3-bucket');
      expect(mapping?.controls).toContain('AC-2');
      expect(mapping?.controls).toContain('SC-7');
      expect(mapping?.controls).toContain('SC-28');
      expect(mapping?.dataClassification).toBe('confidential');
      expect(mapping?.requiredTags).toContain('DataClassification');
    });

    it('should return control mapping for lambda-api', () => {
      const mapping = service.getControlMapping('lambda-api');

      expect(mapping).toBeDefined();
      expect(mapping?.componentType).toBe('lambda-api');
      expect(mapping?.controls).toContain('AC-2');
      expect(mapping?.controls).toContain('SC-7');
      expect(mapping?.dataClassification).toBeUndefined();
    });

    it('should return control mapping for rds-postgres', () => {
      const mapping = service.getControlMapping('rds-postgres');

      expect(mapping).toBeDefined();
      expect(mapping?.componentType).toBe('rds-postgres');
      expect(mapping?.controls).toContain('AC-2');
      expect(mapping?.controls).toContain('SC-28');
      expect(mapping?.dataClassification).toBe('confidential');
    });

    it('should return undefined for unsupported component type', () => {
      const mapping = service.getControlMapping('unsupported-type' as any);
      expect(mapping).toBeUndefined();
    });
  });

  describe('getNISTControl', () => {
    it('should return NIST control for AC-2', () => {
      const control = service.getNISTControl('AC-2');

      expect(control).toBeDefined();
      expect(control?.id).toBe('AC-2');
      expect(control?.title).toBe('Account Management');
      expect(control?.category).toBe('AC');
      expect(control?.severity).toBe('moderate');
    });

    it('should return NIST control for SC-7', () => {
      const control = service.getNISTControl('SC-7');

      expect(control).toBeDefined();
      expect(control?.id).toBe('SC-7');
      expect(control?.title).toBe('Boundary Protection');
      expect(control?.category).toBe('SC');
    });

    it('should return undefined for unknown control', () => {
      const control = service.getNISTControl('UNKNOWN-999');
      expect(control).toBeUndefined();
    });
  });

  describe('generateCompliancePlan', () => {
    it('should generate compliance plan for s3-bucket', () => {
      const componentConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        dataClassification: 'confidential',
        encryption: { enabled: true },
        publicAccessBlock: true
      };

      const plan = service.generateCompliancePlan(
        'test-s3-bucket',
        's3-bucket',
        'commercial',
        componentConfig
      );

      expect(plan).toBeDefined();
      expect(plan.componentId).toBe('test-s3-bucket');
      expect(plan.componentType).toBe('s3-bucket');
      expect(plan.framework).toBe('commercial');
      expect(plan.controls.length).toBeGreaterThan(0);
      expect(plan.dataClassification).toBe('confidential');
      expect(Object.keys(plan.requiredTags)).toContain('Service');
      expect(plan.requiredTags).toHaveProperty('DataClassification');
      expect(plan.complianceRules.length).toBeGreaterThan(0);
    });

    it('should generate compliance plan for lambda-api', () => {
      const componentConfig = {
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        iamRole: { leastPrivilege: true },
        logging: { structured: true }
      };

      const plan = service.generateCompliancePlan(
        'test-lambda',
        'lambda-api',
        'fedramp-moderate',
        componentConfig
      );

      expect(plan).toBeDefined();
      expect(plan.componentId).toBe('test-lambda');
      expect(plan.componentType).toBe('lambda-api');
      expect(plan.framework).toBe('fedramp-moderate');
      expect(plan.dataClassification).toBeUndefined();
      expect(plan.requiredTags.ComplianceFramework).toBe('fedramp-moderate');
    });

    it('should throw error for unsupported component type', () => {
      expect(() => {
        service.generateCompliancePlan(
          'test-component',
          'unsupported-type' as any,
          'commercial',
          {}
        );
      }).toThrow('No control mapping found for component type: unsupported-type');
    });
  });

  describe('validateCompliance', () => {
    it('should validate compliant s3-bucket', () => {
      const component = {
        type: 's3-bucket',
        config: {
          encryption: { enabled: true },
          publicAccessBlock: true,
          versioning: { enabled: true },
          dataClassification: 'confidential'
        }
      };

      const result = service.validateCompliance(component, 'commercial');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate non-compliant s3-bucket', () => {
      const component = {
        type: 's3-bucket',
        config: {
          encryption: { enabled: false },
          publicAccessBlock: false
        }
      };

      const result = service.validateCompliance(component, 'commercial');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('encryption enabled'))).toBe(true);
      expect(result.errors.some(error => error.includes('block public access'))).toBe(true);
    });

    it('should validate lambda-api with warnings', () => {
      const component = {
        type: 'lambda-api',
        config: {
          iamRole: { leastPrivilege: true },
          logging: { structured: true },
          tracing: { enabled: false } // This should generate a warning
        }
      };

      const result = service.validateCompliance(component, 'commercial');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should return error for unsupported component type', () => {
      const component = {
        type: 'unsupported-type',
        config: {}
      };

      const result = service.validateCompliance(component, 'commercial');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No control mapping found for component type: unsupported-type');
    });
  });

  describe('getSupportedComponentTypes', () => {
    it('should return all supported component types', () => {
      const types = service.getSupportedComponentTypes();

      expect(types).toContain('s3-bucket');
      expect(types).toContain('lambda-api');
      expect(types).toContain('rds-postgres');
      expect(types).toContain('ec2-instance');
      expect(types.length).toBe(7);
    });
  });

  describe('getControlsForFramework', () => {
    it('should return controls for commercial framework', () => {
      const controls = service.getControlsForFramework('commercial');

      expect(controls.length).toBeGreaterThan(0);
      expect(controls.some(c => c.id === 'AC-2')).toBe(true);
      expect(controls.some(c => c.id === 'SC-7')).toBe(true);
    });

    it('should return controls for fedramp-moderate framework', () => {
      const controls = service.getControlsForFramework('fedramp-moderate');

      expect(controls.length).toBeGreaterThan(0);
      expect(controls.some(c => c.id === 'AC-2')).toBe(true);
      expect(controls.some(c => c.id === 'SC-28')).toBe(true);
    });

    it('should return controls for fedramp-high framework', () => {
      const controls = service.getControlsForFramework('fedramp-high');

      expect(controls.length).toBeGreaterThan(0);
      expect(controls.some(c => c.id === 'AC-2')).toBe(true);
      expect(controls.some(c => c.id === 'SC-28')).toBe(true);
    });
  });
});
