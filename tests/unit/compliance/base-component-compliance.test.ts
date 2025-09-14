import { BaseComponent } from '../../../src/platform/contracts/components/base-component';
import { ComponentContext } from '../../../src/platform/contracts/components/component-context';
import { ComplianceFramework } from '../../../src/platform/contracts/bindings';

// Mock the services
jest.mock('../../../src/platform/services/compliance-control-mapping', () => ({
  ComplianceControlMappingService: jest.fn().mockImplementation(() => ({
    getControlMapping: jest.fn().mockReturnValue({
      componentType: 's3-bucket',
      controls: ['AC-2', 'SC-7'],
      dataClassification: 'confidential',
      requiredTags: ['Service', 'Component', 'Environment', 'Owner', 'DataClassification', 'ComplianceFramework'],
      complianceRules: []
    }),
    getNISTControl: jest.fn().mockImplementation((controlId) => {
      if (controlId === 'AC-2') {
        return {
          id: 'AC-2',
          title: 'Account Management',
          description: 'Test control',
          category: 'AC',
          severity: 'moderate',
          implementation_guidance: [],
          assessment_procedures: []
        };
      }
      return undefined;
    }),
    validateCompliance: jest.fn().mockReturnValue({
      valid: true,
      errors: [],
      warnings: []
    })
  }))
}));

jest.mock('../../../src/platform/services/tagging-enforcement', () => ({
  TaggingEnforcementService: jest.fn().mockImplementation(() => ({
    applyComplianceTags: jest.fn().mockImplementation((type, id, config) => {
      const baseTags: any = {
        Service: config.service,
        Component: id,
        ComponentType: type,
        Environment: config.environment,
        Owner: config.owner,
        ComplianceFramework: config.complianceFramework,
        ManagedBy: 'Shinobi'
      };

      if (config.dataClassification) {
        baseTags.DataClassification = config.dataClassification;
      }

      if (config.complianceFramework === 'fedramp-moderate' || config.complianceFramework === 'fedramp-high') {
        baseTags.FedRAMPCompliant = 'true';
        if (config.sspId) {
          baseTags.SSPId = config.sspId;
        }
      }

      return baseTags;
    }),
    isDataClassificationRequired: jest.fn().mockImplementation((type) => type === 's3-bucket'),
    validateDataClassification: jest.fn().mockImplementation((value) => {
      if (value === 'invalid-classification') {
        return false;
      }
      return true;
    }),
    getValidDataClassifications: jest.fn().mockReturnValue(['public', 'internal', 'confidential', 'pii'])
  }))
}));

jest.mock('../../../src/platform/services/compliance-plan-generator', () => ({
  CompliancePlanGenerator: jest.fn().mockImplementation(() => ({
    generateCompliancePlan: jest.fn().mockResolvedValue({
      componentId: 'test-id',
      componentType: 's3-bucket',
      framework: 'commercial',
      controls: [],
      dataClassification: 'confidential',
      requiredTags: {},
      complianceRules: [],
      generatedAt: '2023-01-01T00:00:00.000Z',
      expiresAt: '2024-01-01T00:00:00.000Z'
    })
  }))
}));

// Create a concrete implementation for testing
class TestComponent extends BaseComponent {
  getName(): string {
    return 'test-component';
  }

  getId(): string {
    return 'test-id';
  }

  getType(): string {
    return 's3-bucket';
  }

  getCapabilityData() {
    return {
      type: 'storage:s3' as const,
      resources: {
        arn: 'arn:aws:s3:::test-bucket',
        name: 'test-bucket',
        region: 'us-east-1'
      },
      encryption: {
        enabled: true
      },
      versioning: {
        enabled: true
      }
    };
  }

  synth(): void {
    // Mock implementation
  }
}

describe('BaseComponent Compliance Features', () => {
  let component: TestComponent;
  let context: ComponentContext;

  beforeEach(() => {
    context = {
      serviceName: 'test-service',
      environment: 'dev',
      complianceFramework: 'commercial' as ComplianceFramework,
      region: 'us-east-1',
      accountId: '123456789012',
      owner: 'test-owner',
      tags: {}
    };

    component = new TestComponent({
      service: 'test-service',
      environment: 'dev',
      owner: 'test-owner',
      labels: {
        dataClassification: 'confidential'
      }
    }, context);
  });

  describe('getTags', () => {
    it('should return compliance-enforced tags', () => {
      const tags = component.getTags();

      expect(tags.Service).toBe('test-service');
      expect(tags.Component).toBe('test-id');
      expect(tags.ComponentType).toBe('s3-bucket');
      expect(tags.Environment).toBe('dev');
      expect(tags.Owner).toBe('test-owner');
      expect(tags.ComplianceFramework).toBe('commercial');
      expect(tags.ManagedBy).toBe('Shinobi');
    });

    it('should include data classification in tags', () => {
      const tags = component.getTags();

      expect(tags.DataClassification).toBe('confidential');
    });

    it('should include FedRAMP tags for FedRAMP frameworks', () => {
      const fedrampContext = {
        ...context,
        complianceFramework: 'fedramp-moderate' as ComplianceFramework
      };

      const fedrampComponent = new TestComponent({
        service: 'test-service',
        environment: 'prod',
        owner: 'test-owner',
        sspId: 'SSP-123'
      }, fedrampContext);

      const tags = fedrampComponent.getTags();

      expect(tags.ComplianceFramework).toBe('fedramp-moderate');
      expect(tags.FedRAMPCompliant).toBe('true');
      expect(tags.SSPId).toBe('SSP-123');
    });
  });

  describe('generateCompliancePlan', () => {
    it('should generate compliance plan', async () => {
      const plan = await component.generateCompliancePlan('./test-output');

      expect(plan).toBeDefined();
      expect(plan.componentId).toBe('test-id');
      expect(plan.componentType).toBe('s3-bucket');
      expect(plan.framework).toBe('commercial');
    });

    it('should cache compliance plan', async () => {
      const plan1 = await component.getCompliancePlan();
      const plan2 = await component.getCompliancePlan();

      expect(plan1).toBe(plan2);
    });
  });

  describe('validateCompliance', () => {
    it('should validate component compliance', () => {
      const result = component.validateCompliance();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });
  });

  describe('isDataClassificationRequired', () => {
    it('should return true for data store components', () => {
      expect(component.isDataClassificationRequired()).toBe(true);
    });

    it('should return false for non-data store components', () => {
      const lambdaComponent = new TestComponent({
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner'
      }, context);

      // Mock the getType method to return lambda-api
      jest.spyOn(lambdaComponent, 'getType').mockReturnValue('lambda-api');

      expect(lambdaComponent.isDataClassificationRequired()).toBe(false);
    });
  });

  describe('validateDataClassification', () => {
    it('should validate correct data classification', () => {
      const result = component.validateDataClassification();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject missing data classification for data stores', () => {
      const componentWithoutClassification = new TestComponent({
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner'
        // Missing dataClassification
      }, context);

      const result = componentWithoutClassification.validateDataClassification();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Data classification is required');
    });

    it('should reject invalid data classification', () => {
      const componentWithInvalidClassification = new TestComponent({
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        labels: {
          dataClassification: 'invalid-classification'
        }
      }, context);

      const result = componentWithInvalidClassification.validateDataClassification();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid data classification');
    });

    it('should pass validation for non-data store components', () => {
      const lambdaComponent = new TestComponent({
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner'
      }, context);

      // Mock the getType method to return lambda-api
      jest.spyOn(lambdaComponent, 'getType').mockReturnValue('lambda-api');

      const result = lambdaComponent.validateDataClassification();

      expect(result.valid).toBe(true);
    });
  });

  describe('getComplianceControls', () => {
    it('should return compliance controls for component', () => {
      const controls = component.getComplianceControls();

      expect(Array.isArray(controls)).toBe(true);
      expect(controls.length).toBeGreaterThan(0);
    });
  });

  describe('getNISTControlDetails', () => {
    it('should return NIST control details', () => {
      const controlDetails = component.getNISTControlDetails('AC-2');

      expect(controlDetails).toBeDefined();
      expect(controlDetails?.id).toBe('AC-2');
    });

    it('should return undefined for unknown control', () => {
      const controlDetails = component.getNISTControlDetails('UNKNOWN-999');

      expect(controlDetails).toBeUndefined();
    });
  });

  describe('validateConfigWithCompliance', () => {
    it('should pass validation for compliant component', () => {
      expect(() => {
        component.validateConfigWithCompliance();
      }).not.toThrow();
    });

    it('should throw error for missing data classification', () => {
      const componentWithoutClassification = new TestComponent({
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner'
        // Missing dataClassification
      }, context);

      expect(() => {
        componentWithoutClassification.validateConfigWithCompliance();
      }).toThrow('Data classification is required');
    });

    it('should throw error for invalid data classification', () => {
      const componentWithInvalidClassification = new TestComponent({
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner',
        labels: {
          dataClassification: 'invalid-classification'
        }
      }, context);

      expect(() => {
        componentWithInvalidClassification.validateConfigWithCompliance();
      }).toThrow('Invalid data classification');
    });
  });

  describe('synthWithCompliance', () => {
    it('should run synthesis with compliance validation', async () => {
      const synthSpy = jest.spyOn(component, 'synth');
      const validateSpy = jest.spyOn(component, 'validateConfigWithCompliance');
      const generatePlanSpy = jest.spyOn(component, 'generateCompliancePlan');

      await component.synthWithCompliance();

      expect(validateSpy).toHaveBeenCalled();
      expect(generatePlanSpy).toHaveBeenCalled();
      expect(synthSpy).toHaveBeenCalled();
    });

    it('should throw error if compliance validation fails', async () => {
      const componentWithoutClassification = new TestComponent({
        service: 'test-service',
        environment: 'dev',
        owner: 'test-owner'
        // Missing dataClassification
      }, context);

      await expect(componentWithoutClassification.synthWithCompliance()).rejects.toThrow();
    });
  });
});
