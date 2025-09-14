/**
 * Unit tests for BackstagePortalComponent
 */

import { BackstagePortalComponent } from '../../src/backstage-portal.component';
import { BackstagePortalConfig } from '../../src/backstage-portal.builder';

describe('BackstagePortalComponent', () => {
  let component: BackstagePortalComponent;
  let context: any;
  let spec: any;

  beforeEach(() => {
    context = {
      serviceName: 'test-backstage-portal',
      account: '123456789012',
      region: 'us-east-1',
      environment: 'dev',
      complianceFramework: 'commercial'
    };

    spec = {
      portal: {
        name: 'Test Portal',
        organization: 'Test Organization',
        description: 'Test portal description',
        baseUrl: 'https://backstage.test.com'
      },
      database: {
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
        backupRetentionDays: 7,
        multiAz: false,
        deletionProtection: true
      },
      backend: {
        desiredCount: 2,
        cpu: 512,
        memory: 1024,
        healthCheckPath: '/health',
        healthCheckInterval: 30
      },
      frontend: {
        desiredCount: 2,
        cpu: 256,
        memory: 512,
        healthCheckPath: '/',
        healthCheckInterval: 30
      },
      auth: {
        provider: 'github',
        github: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          organization: 'test-org'
        }
      },
      catalog: {
        providers: [{
          type: 'github',
          id: 'test-provider',
          org: 'test-org',
          catalogPath: '/catalog-info.yaml'
        }]
      }
    };

    component = new BackstagePortalComponent({}, 'test-component', context, spec);
  });

  describe('Constructor', () => {
    it('should initialize with correct component type', () => {
      expect(component.getType()).toBe('backstage-portal');
    });

    it('should initialize with provided context and spec', () => {
      expect(component['context']).toEqual(context);
      expect(component['spec']).toEqual(spec);
    });

    it('should build configuration using config builder', () => {
      expect(component['config']).toBeDefined();
      expect(component['config'].portal.name).toBe('Test Portal');
      expect(component['config'].portal.organization).toBe('Test Organization');
    });
  });

  describe('getType', () => {
    it('should return correct component type', () => {
      expect(component.getType()).toBe('backstage-portal');
    });
  });

  describe('synth', () => {
    beforeEach(() => {
      // Mock the synthesis methods to avoid actual CDK synthesis
      jest.spyOn(component as any, '_createKmsKeyIfNeeded').mockReturnValue({
        keyId: 'mock-kms-key',
        keyArn: 'arn:aws:kms:us-east-1:123456789012:key/mock-kms-key'
      });
      jest.spyOn(component as any, '_createVpcIfNeeded').mockReturnValue({
        vpcId: 'mock-vpc-id',
        vpcArn: 'arn:aws:ec2:us-east-1:123456789012:vpc/mock-vpc-id'
      });
      jest.spyOn(component as any, '_createLogGroups').mockImplementation();
      jest.spyOn(component as any, '_createBackstageServices').mockImplementation();
      jest.spyOn(component as any, '_createMonitoring').mockImplementation();
      jest.spyOn(component as any, '_applyStandardTags').mockImplementation();
      jest.spyOn(component as any, '_registerConstruct').mockImplementation();
      jest.spyOn(component as any, '_registerCapability').mockImplementation();
    });

    it('should synthesize infrastructure successfully', () => {
      expect(() => component.synth()).not.toThrow();
    });

    it('should create ECR repository', () => {
      component.synth();
      expect(component['ecrRepository']).toBeDefined();
    });

    it('should create ECS cluster', () => {
      component.synth();
      expect(component['cluster']).toBeDefined();
    });

    it('should create Application Load Balancer', () => {
      component.synth();
      expect(component['loadBalancer']).toBeDefined();
    });

    it('should create log groups', () => {
      component.synth();
      expect(component['_createLogGroups').toHaveBeenCalled();
    });

    it('should create Backstage services', () => {
      component.synth();
      expect(component['_createBackstageServices').toHaveBeenCalled();
    });

    it('should create monitoring', () => {
      component.synth();
      expect(component['_createMonitoring').toHaveBeenCalled();
    });

    it('should apply standard tags', () => {
      component.synth();
      expect(component['_applyStandardTags').toHaveBeenCalledTimes(3); // ECR, Cluster, ALB
    });

    it('should register constructs', () => {
      component.synth();
      expect(component['_registerConstruct').toHaveBeenCalledWith('main', component['cluster']);
      expect(component['_registerConstruct').toHaveBeenCalledWith('ecr', component['ecrRepository']);
      expect(component['_registerConstruct').toHaveBeenCalledWith('alb', component['loadBalancer']);
    });

    it('should register capabilities', () => {
      component.synth();
      expect(component['_registerCapability']).toHaveBeenCalledWith('portal:url', expect.any(String));
      expect(component['_registerCapability']).toHaveBeenCalledWith('ecr:repository', expect.any(String));
      expect(component['_registerCapability']).toHaveBeenCalledWith('cluster:name', expect.any(String));
    });
  });

  describe('Configuration Integration', () => {
    it('should use configuration from builder', () => {
      expect(component['config']).toBeDefined();
      expect(component['config'].portal.name).toBe('Test Portal');
      expect(component['config'].database.instanceClass).toBe('db.t3.micro');
      expect(component['config'].backend.desiredCount).toBe(2);
      expect(component['config'].frontend.desiredCount).toBe(2);
    });

    it('should handle missing configuration gracefully', () => {
      const minimalSpec = {
        portal: {
          name: 'Minimal Portal',
          organization: 'Minimal Org'
        }
      };
      
      const minimalComponent = new BackstagePortalComponent({}, 'minimal-component', context, minimalSpec);
      expect(minimalComponent['config']).toBeDefined();
      expect(minimalComponent['config'].portal.name).toBe('Minimal Portal');
    });
  });

  describe('Error Handling', () => {
    it('should handle synthesis errors gracefully', () => {
      // Mock a method to throw an error
      jest.spyOn(component as any, '_createKmsKeyIfNeeded').mockImplementation(() => {
        throw new Error('KMS key creation failed');
      });

      expect(() => component.synth()).toThrow('KMS key creation failed');
    });
  });
});
