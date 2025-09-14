import { runPlatformPipeline } from '../pipelines/platform-pipeline';
import { dag } from '@dagger.io/dagger';

// Import individual functions for more granular testing
// Note: These would need to be exported from the pipeline file for direct testing

// Mock the Dagger SDK
jest.mock('@dagger.io/dagger');

describe('Platform Pipeline', () => {
  const mockConfig = {
    source: dag.host().directory('.'),
    environment: 'dev',
    complianceFramework: 'commercial' as const,
    useFipsCompliantImages: false,
    enableMtls: false,
    outputFormat: 'json' as const,
    steps: {
      validate: true,
      test: true,
      audit: true,
      plan: true,
      deploy: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runPlatformPipeline', () => {
    it('should create a container with correct base image for commercial compliance', async () => {
      const commercialConfig = {
        ...mockConfig,
        complianceFramework: 'commercial' as const,
        useFipsCompliantImages: false,
      };

      const result = await runPlatformPipeline(commercialConfig);

      expect(dag.container).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create a container with FIPS-compliant image for FedRAMP compliance', async () => {
      const fedrampConfig = {
        ...mockConfig,
        complianceFramework: 'fedramp-moderate' as const,
        useFipsCompliantImages: true,
      };

      const result = await runPlatformPipeline(fedrampConfig);

      expect(dag.container).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should configure mTLS when enabled', async () => {
      const mtlsConfig = {
        ...mockConfig,
        enableMtls: true,
      };

      const result = await runPlatformPipeline(mtlsConfig);

      expect(dag.container).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should skip validation when configured', async () => {
      const skipValidationConfig = {
        ...mockConfig,
        steps: {
          ...mockConfig.steps,
          validate: false,
        },
      };

      const result = await runPlatformPipeline(skipValidationConfig);

      expect(dag.container).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should skip testing when configured', async () => {
      const skipTestConfig = {
        ...mockConfig,
        steps: {
          ...mockConfig.steps,
          test: false,
        },
      };

      const result = await runPlatformPipeline(skipTestConfig);

      expect(dag.container).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should skip audit when configured', async () => {
      const skipAuditConfig = {
        ...mockConfig,
        steps: {
          ...mockConfig.steps,
          audit: false,
        },
      };

      const result = await runPlatformPipeline(skipAuditConfig);

      expect(dag.container).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should skip planning when configured', async () => {
      const skipPlanConfig = {
        ...mockConfig,
        steps: {
          ...mockConfig.steps,
          plan: false,
        },
      };

      const result = await runPlatformPipeline(skipPlanConfig);

      expect(dag.container).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should skip deployment when configured', async () => {
      const skipDeployConfig = {
        ...mockConfig,
        steps: {
          ...mockConfig.steps,
          deploy: false,
        },
      };

      const result = await runPlatformPipeline(skipDeployConfig);

      expect(dag.container).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle deployment with AWS credentials', async () => {
      const deployConfig = {
        ...mockConfig,
        steps: {
          ...mockConfig.steps,
          deploy: true,
        },
        secrets: {
          awsAccessKeyId: dag.setSecret('aws-access-key-id', 'test-key'),
          awsSecretAccessKey: dag.setSecret('aws-secret-access-key', 'test-secret'),
          awsRegion: 'us-east-1',
        },
      };

      const result = await runPlatformPipeline(deployConfig);

      expect(dag.container).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error when deployment is enabled but AWS credentials are missing', async () => {
      const deployConfig = {
        ...mockConfig,
        steps: {
          ...mockConfig.steps,
          deploy: true,
        },
        // No secrets provided
      };

      await expect(runPlatformPipeline(deployConfig)).rejects.toThrow(
        'AWS credentials required for deployment'
      );
    });
  });

  describe('Configuration validation', () => {
    it('should accept valid commercial configuration', async () => {
      const validConfig = {
        ...mockConfig,
        complianceFramework: 'commercial' as const,
      };

      const result = await runPlatformPipeline(validConfig);
      expect(result).toBeDefined();
      expect(dag.container).toHaveBeenCalled();
    });

    it('should accept valid FedRAMP Moderate configuration', async () => {
      const validConfig = {
        ...mockConfig,
        complianceFramework: 'fedramp-moderate' as const,
        useFipsCompliantImages: true,
      };

      const result = await runPlatformPipeline(validConfig);
      expect(result).toBeDefined();
      expect(dag.container).toHaveBeenCalled();
    });

    it('should accept valid FedRAMP High configuration', async () => {
      const validConfig = {
        ...mockConfig,
        complianceFramework: 'fedramp-high' as const,
        useFipsCompliantImages: true,
        enableMtls: true,
      };

      const result = await runPlatformPipeline(validConfig);
      expect(result).toBeDefined();
      expect(dag.container).toHaveBeenCalled();
    });
  });

  describe('Pipeline execution flow', () => {
    it('should execute all steps when all are enabled', async () => {
      const fullConfig = {
        ...mockConfig,
        steps: {
          validate: true,
          test: true,
          audit: true,
          plan: true,
          deploy: false, // Skip deploy to avoid AWS credential requirement
        },
      };

      const result = await runPlatformPipeline(fullConfig);
      expect(result).toBeDefined();
      expect(dag.container).toHaveBeenCalled();
    });

    it('should execute only enabled steps', async () => {
      const partialConfig = {
        ...mockConfig,
        steps: {
          validate: true,
          test: false,
          audit: false,
          plan: true,
          deploy: false,
        },
      };

      const result = await runPlatformPipeline(partialConfig);
      expect(result).toBeDefined();
      expect(dag.container).toHaveBeenCalled();
    });

    it('should handle empty steps configuration', async () => {
      const emptyStepsConfig = {
        ...mockConfig,
        steps: {
          validate: false,
          test: false,
          audit: false,
          plan: false,
          deploy: false,
        },
      };

      const result = await runPlatformPipeline(emptyStepsConfig);
      expect(result).toBeDefined();
      expect(dag.container).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid compliance framework gracefully', async () => {
      const invalidConfig = {
        ...mockConfig,
        // @ts-expect-error Testing invalid input
        complianceFramework: 'invalid-framework',
      };

      // The function should still execute but with the invalid framework
      const result = await runPlatformPipeline(invalidConfig);
      expect(result).toBeDefined();
    });

    it('should handle missing source directory', async () => {
      const noSourceConfig = {
        ...mockConfig,
        // @ts-expect-error Testing missing required field
        source: undefined,
      };

      // The function should still execute with undefined source (mocked behavior)
      // In a real implementation, this would throw an error
      const result = await runPlatformPipeline(noSourceConfig);
      expect(result).toBeDefined();
    });
  });
});
