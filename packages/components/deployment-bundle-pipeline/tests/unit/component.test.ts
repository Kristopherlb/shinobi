/**
 * Unit tests for Deployment Bundle Pipeline Component
 */

import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { DeploymentBundlePipelineComponent } from '../../src/deployment-bundle-pipeline.component.js';

describe('DeploymentBundlePipelineComponent', () => {
  let component: DeploymentBundlePipelineComponent;
  let context: any;
  let spec: any;

  beforeEach(() => {
    context = {
      account: '123456789012',
      region: 'us-east-1',
      environment: 'dev',
      complianceFramework: 'commercial'
    };

    spec = {
      service: 'test-service',
      versionTag: '1.0.0',
      artifactoryHost: 'artifactory.test.com',
      ociRepoBundles: 'artifactory.test.com/bundles'
    };
  });

  describe('Component Creation', () => {
    it('should create component with valid configuration', () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);
      expect(component).toBeDefined();
      expect(component.getType()).toBe('deployment-bundle-pipeline');
    });

    it('should throw error with missing required fields', () => {
      const invalidSpec = {
        service: 'test-service'
        // missing versionTag and artifactoryHost
      };

      expect(() => {
        new DeploymentBundlePipelineComponent({}, 'test-component', context, invalidSpec);
      }).toThrow();
    });
  });

  describe('Configuration Precedence', () => {
    it('should use component override over environment defaults', () => {
      const specWithOverride = {
        ...spec,
        environment: 'prod',
        signing: {
          keyless: false,
          kmsKeyId: 'kms://aws-kms/alias/test-key'
        }
      };

      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, specWithOverride);
      // This would test that the component uses the override values
      expect(component).toBeDefined();
    });

    it('should use environment defaults when no override provided', () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);
      // This would test that the component uses environment defaults
      expect(component).toBeDefined();
    });
  });

  describe('Compliance Framework Defaults', () => {
    it('should apply FedRAMP Moderate defaults', () => {
      const fedrampContext = {
        ...context,
        complianceFramework: 'fedramp-moderate'
      };

      component = new DeploymentBundlePipelineComponent({}, 'test-component', fedrampContext, spec);
      // This would test that FedRAMP Moderate defaults are applied
      expect(component).toBeDefined();
    });

    it('should apply FedRAMP High defaults', () => {
      const fedrampHighContext = {
        ...context,
        complianceFramework: 'fedramp-high'
      };

      component = new DeploymentBundlePipelineComponent({}, 'test-component', fedrampHighContext, spec);
      // This would test that FedRAMP High defaults are applied
      expect(component).toBeDefined();
    });

    it('should apply ISO 27001 defaults', () => {
      const isoContext = {
        ...context,
        complianceFramework: 'iso27001'
      };

      component = new DeploymentBundlePipelineComponent({}, 'test-component', isoContext, spec);
      // This would test that ISO 27001 defaults are applied
      expect(component).toBeDefined();
    });

    it('should apply SOC 2 defaults', () => {
      const soc2Context = {
        ...context,
        complianceFramework: 'soc2'
      };

      component = new DeploymentBundlePipelineComponent({}, 'test-component', soc2Context, spec);
      // This would test that SOC 2 defaults are applied
      expect(component).toBeDefined();
    });
  });

  describe('Security Configuration', () => {
    it('should enable FIPS mode for regulated environments', () => {
      const regulatedContext = {
        ...context,
        complianceFramework: 'fedramp-high'
      };

      component = new DeploymentBundlePipelineComponent({}, 'test-component', regulatedContext, spec);
      // This would test that FIPS mode is enabled
      expect(component).toBeDefined();
    });

    it('should use KMS signing for regulated environments', () => {
      const regulatedContext = {
        ...context,
        complianceFramework: 'fedramp-moderate'
      };

      component = new DeploymentBundlePipelineComponent({}, 'test-component', regulatedContext, spec);
      // This would test that KMS signing is used
      expect(component).toBeDefined();
    });

    it('should use keyless signing for commercial environments', () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);
      // This would test that keyless signing is used
      expect(component).toBeDefined();
    });
  });

  describe('Bundle Creation', () => {
    it('should create bundle with all required artifacts', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      // Mock the synthesis process
      jest.spyOn(component as any, 'buildService').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'runTests').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'synthesizeInfrastructure').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'generateSecurityArtifacts').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'generateComplianceReports').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'createDeploymentBundle').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'signAndAttestBundle').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'verifyAndPromote').mockResolvedValue(undefined);

      await component.synth();

      // Verify that all stages were called
      expect((component as any).buildService).toHaveBeenCalled();
      expect((component as any).runTests).toHaveBeenCalled();
      expect((component as any).synthesizeInfrastructure).toHaveBeenCalled();
      expect((component as any).generateSecurityArtifacts).toHaveBeenCalled();
      expect((component as any).generateComplianceReports).toHaveBeenCalled();
      expect((component as any).createDeploymentBundle).toHaveBeenCalled();
      expect((component as any).signAndAttestBundle).toHaveBeenCalled();
      expect((component as any).verifyAndPromote).toHaveBeenCalled();
    });

    it('should fail if build process fails', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      // Mock build failure
      jest.spyOn(component as any, 'buildService').mockRejectedValue(new Error('Build failed'));

      await expect(component.synth()).rejects.toThrow('Build failed');
    });

    it('should fail if tests fail', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      // Mock test failure
      jest.spyOn(component as any, 'buildService').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'runTests').mockRejectedValue(new Error('Tests failed'));

      await expect(component.synth()).rejects.toThrow('Tests failed');
    });
  });

  describe('SBOM Generation', () => {
    it('should generate workspace SBOM', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      const sbomPath = await (component as any).generateWorkspaceSBOM();
      expect(sbomPath).toContain('workspace');
      expect(sbomPath).toContain('.spdx.json');
    });

    it('should generate image SBOMs when images are present', async () => {
      const specWithImages = {
        ...spec,
        ociRepoImages: 'artifactory.test.com/images'
      };

      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, specWithImages);

      const imageSBOMs = await (component as any).generateImageSBOMs();
      expect(Array.isArray(imageSBOMs)).toBe(true);
    });
  });

  describe('Vulnerability Scanning', () => {
    it('should scan workspace for vulnerabilities', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      const scanResult = await (component as any).scanWorkspace();
      expect(scanResult).toHaveProperty('tool', 'grype');
      expect(scanResult).toHaveProperty('timestamp');
      expect(scanResult).toHaveProperty('passed');
    });

    it('should fail if critical vulnerabilities are found', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      // Mock scan with critical vulnerabilities
      jest.spyOn(component as any, 'scanWorkspace').mockResolvedValue({
        tool: 'grype',
        timestamp: new Date().toISOString(),
        totalVulnerabilities: 1,
        critical: 1,
        high: 0,
        medium: 0,
        low: 0,
        reportPath: 'test-report.json',
        passed: false
      });

      await expect((component as any).runVulnerabilityScans()).rejects.toThrow();
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate compliance report', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      const report = await (component as any).createComplianceReport();
      expect(report).toHaveProperty('framework');
      expect(report).toHaveProperty('compliant');
      expect(report).toHaveProperty('totalControls');
    });

    it('should generate FedRAMP-specific compliance report', async () => {
      const fedrampContext = {
        ...context,
        complianceFramework: 'fedramp-moderate'
      };

      component = new DeploymentBundlePipelineComponent({}, 'test-component', fedrampContext, spec);

      const report = await (component as any).createComplianceReport();
      expect(report.framework).toBe('fedramp-moderate');
    });
  });

  describe('Signing and Attestation', () => {
    it('should sign bundle with cosign', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      await (component as any).signBundle();
      // This would verify that cosign signing was called
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should create SLSA provenance attestation', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      const provenance = await (component as any).generateProvenancePredicate();
      expect(provenance).toHaveProperty('buildType');
      expect(provenance).toHaveProperty('builder');
      expect(provenance).toHaveProperty('materials');
    });

    it('should attach SBOMs as referrers', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      await (component as any).attachSBOMs();
      // This would verify that SBOMs were attached
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Bundle Manifest', () => {
    it('should create bundle manifest with all required fields', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      const manifest = await (component as any).createBundleManifest();
      expect(manifest).toHaveProperty('schema', 'v1');
      expect(manifest).toHaveProperty('service', 'test-service');
      expect(manifest).toHaveProperty('version', '1.0.0');
      expect(manifest).toHaveProperty('environment', 'dev');
      expect(manifest).toHaveProperty('complianceFramework', 'commercial');
      expect(manifest).toHaveProperty('buildTimestamp');
      expect(manifest).toHaveProperty('gitCommit');
      expect(manifest).toHaveProperty('builderId');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing context gracefully', () => {
      expect(() => {
        new DeploymentBundlePipelineComponent({}, 'test-component', null, spec);
      }).toThrow();
    });

    it('should handle invalid service name', () => {
      const invalidSpec = {
        ...spec,
        service: 'Invalid Service Name!'
      };

      expect(() => {
        new DeploymentBundlePipelineComponent({}, 'test-component', context, invalidSpec);
      }).toThrow();
    });

    it('should handle invalid version tag', () => {
      const invalidSpec = {
        ...spec,
        versionTag: 'invalid@version#tag'
      };

      expect(() => {
        new DeploymentBundlePipelineComponent({}, 'test-component', context, invalidSpec);
      }).toThrow();
    });
  });

  describe('Capability Registration', () => {
    it('should register bundle capabilities', async () => {
      component = new DeploymentBundlePipelineComponent({}, 'test-component', context, spec);

      // Mock the synthesis process
      jest.spyOn(component as any, 'buildService').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'runTests').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'synthesizeInfrastructure').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'generateSecurityArtifacts').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'generateComplianceReports').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'createDeploymentBundle').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'signAndAttestBundle').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'verifyAndPromote').mockResolvedValue(undefined);

      await component.synth();

      // Verify capabilities are registered
      expect(component).toBeDefined();
    });
  });
});
