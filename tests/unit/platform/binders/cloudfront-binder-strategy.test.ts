/**
 * CloudFront Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-cloudfront-binder-001",
 *   "level": "unit",
 *   "capability": "CloudFront binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "CloudFront component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["CloudFrontBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CloudFrontBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/cdn/cloudfront-binder-strategy';
import { BindingContext } from '../../../../packages/core/src/platform/binders/binding-context';
import { ComponentBinding } from '../../../../packages/core/src/platform/binders/component-binding';
import { ComplianceFramework } from '../../../../packages/core/src/platform/compliance/compliance-framework';

// Deterministic setup
let originalDateNow: () => number;
let mockDateNow: jest.SpiedFunction<typeof Date.now>;

beforeEach(() => {
  // Freeze clock for determinism
  originalDateNow = Date.now;
  const fixedTime = 1640995200000; // 2022-01-01T00:00:00Z
  mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(fixedTime);

  // Seed RNG for deterministic behavior
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  // Restore original functions
  mockDateNow.mockRestore();
  jest.restoreAllMocks();
});

describe('CloudFrontBinderStrategy', () => {
  let strategy: CloudFrontBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new CloudFrontBinderStrategy();

    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      distributionId: 'E1234567890ABC',
      distributionArn: 'arn:aws:cloudfront::123456789012:distribution/E1234567890ABC',
      domainName: 'd1234567890abc.cloudfront.net',
      status: 'Deployed',
      enabled: true,
      priceClass: 'PriceClass_100',
      webAclId: 'arn:aws:wafv2:us-east-1:123456789012:global/webacl/test-webacl/12345678-1234-1234-1234-123456789012',
      originDomainName: 'test-bucket.s3.amazonaws.com',
      originPath: '/',
      originId: 'S3-test-bucket',
      viewerProtocolPolicy: 'redirect-to-https',
      allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      cachedMethods: ['GET', 'HEAD'],
      compress: true,
      defaultTTL: 86400,
      maxTTL: 31536000,
      minTTL: 0,
      sslCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert',
      customDomain: 'test.example.com',
      cachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
      originRequestPolicyId: '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf',
      responseHeadersPolicyId: '5cc3b908-e619-4b99-88e5-2cf7f45965bd'
    };

    mockBinding = {
      capability: 'cloudfront:distribution',
      access: ['read', 'write']
    };

    mockContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      complianceFramework: ComplianceFramework.COMMERCIAL
    };
  });

  describe('Constructor__ValidSetup__InitializesCorrectly', () => {
    test('should initialize with correct supported capabilities', () => {
      expect(strategy.supportedCapabilities).toEqual([
        'cloudfront:distribution',
        'cloudfront:origin',
        'cloudfront:cache-behavior'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for CloudFront binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null, mockContext))
        .rejects.toThrow('Binding is required for CloudFront binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null))
        .rejects.toThrow('Context is required for CloudFront binding');
    });
  });

  describe('Bind__MissingCapability__ThrowsError', () => {
    test('should throw error when capability is missing', async () => {
      const invalidBinding = { ...mockBinding, capability: undefined };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding capability is required');
    });
  });

  describe('Bind__MissingAccess__ThrowsError', () => {
    test('should throw error when access is missing', async () => {
      const invalidBinding = { ...mockBinding, access: undefined };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding access is required');
    });
  });

  describe('Bind__InvalidCapability__ThrowsError', () => {
    test('should throw error for unsupported capability', async () => {
      const invalidBinding = { ...mockBinding, capability: 'invalid:capability' };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Unsupported CloudFront capability: invalid:capability');
    });
  });

  describe('Bind__CloudFrontDistributionCapability__ConfiguresDistributionAccess', () => {
    test('should configure read access for distribution', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'cloudfront:GetDistribution',
          'cloudfront:ListDistributions'
        ],
        Resource: mockTargetComponent.distributionArn
      });
    });

    test('should configure write access for distribution', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'cloudfront:CreateDistribution',
          'cloudfront:UpdateDistribution',
          'cloudfront:DeleteDistribution'
        ],
        Resource: mockTargetComponent.distributionArn
      });
    });

    test('should inject distribution environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_DISTRIBUTION_ID', mockTargetComponent.distributionId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_DISTRIBUTION_ARN', mockTargetComponent.distributionArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_DOMAIN_NAME', mockTargetComponent.domainName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_STATUS', mockTargetComponent.status);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_ENABLED', mockTargetComponent.enabled.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_PRICE_CLASS', mockTargetComponent.priceClass);
    });
  });

  describe('Bind__CloudFrontOriginCapability__ConfiguresOriginAccess', () => {
    test('should configure read access for origin', async () => {
      const originBinding = { ...mockBinding, capability: 'cloudfront:origin', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, originBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'cloudfront:GetDistribution',
          'cloudfront:ListDistributions'
        ],
        Resource: mockTargetComponent.distributionArn
      });
    });

    test('should configure write access for origin', async () => {
      const originBinding = { ...mockBinding, capability: 'cloudfront:origin', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, originBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'cloudfront:CreateDistribution',
          'cloudfront:UpdateDistribution'
        ],
        Resource: mockTargetComponent.distributionArn
      });
    });

    test('should inject origin environment variables', async () => {
      const originBinding = { ...mockBinding, capability: 'cloudfront:origin' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, originBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_ORIGIN_DOMAIN', mockTargetComponent.originDomainName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_ORIGIN_PATH', mockTargetComponent.originPath);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_ORIGIN_ID', mockTargetComponent.originId);
    });
  });

  describe('Bind__CloudFrontCacheBehaviorCapability__ConfiguresCacheBehaviorAccess', () => {
    test('should configure read access for cache behavior', async () => {
      const cacheBinding = { ...mockBinding, capability: 'cloudfront:cache-behavior', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, cacheBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'cloudfront:GetDistribution',
          'cloudfront:ListDistributions'
        ],
        Resource: mockTargetComponent.distributionArn
      });
    });

    test('should configure write access for cache behavior', async () => {
      const cacheBinding = { ...mockBinding, capability: 'cloudfront:cache-behavior', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, cacheBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'cloudfront:CreateDistribution',
          'cloudfront:UpdateDistribution'
        ],
        Resource: mockTargetComponent.distributionArn
      });
    });

    test('should inject cache behavior environment variables', async () => {
      const cacheBinding = { ...mockBinding, capability: 'cloudfront:cache-behavior' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, cacheBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_VIEWER_PROTOCOL_POLICY', mockTargetComponent.viewerProtocolPolicy);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_ALLOWED_METHODS', mockTargetComponent.allowedMethods.join(','));
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_CACHED_METHODS', mockTargetComponent.cachedMethods.join(','));
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_COMPRESS', mockTargetComponent.compress.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_DEFAULT_TTL', mockTargetComponent.defaultTTL.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_MAX_TTL', mockTargetComponent.maxTTL.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CLOUDFRONT_MIN_TTL', mockTargetComponent.minTTL.toString());
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for CloudFront binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for CloudFront binding: invalid. Valid types: read, write, admin, invalidate');
    });
  });
});
