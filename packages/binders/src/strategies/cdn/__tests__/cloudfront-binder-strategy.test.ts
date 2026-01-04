/**
 * Unit Tests: CloudFront Binder Strategy (Unified)
 * Tests for Amazon CloudFront bindings with compliance enforcement
 */

import { CloudFrontBinderStrategy } from '../cloudfront-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('CloudFrontBinderStrategy', () => {
  describe('CloudFrontBind__ValidDistributionAccess__ReturnsDistributionEnvVars', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-001',
      level: 'unit' as const,
      capability: 'Returns CloudFront distribution environment variables for valid distribution access',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include CLOUDFRONT_DISTRIBUTION_ID, CLOUDFRONT_DISTRIBUTION_ARN, CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME',
        'IAM policies include CloudFront distribution read actions',
        'Origins and cache behavior are exposed as JSON when provided',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with cloudfront:distribution capability and read access',
        notes: 'Basic CloudFront distribution read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__ValidDistributionAccess__ReturnsDistributionEnvVars', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-distribution', {
        'cloudfront:distribution': {
          type: 'cloudfront:distribution',
          distributionArn: 'arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE',
          distributionId: 'EDFDVBD6EXAMPLE',
          domainName: 'd111111abcdef8.cloudfront.net',
          status: 'Deployed',
          enabled: true,
          priceClass: 'PriceClass_100',
          origins: [
            {
              id: 'origin1',
              domainName: 'example-bucket.s3.amazonaws.com',
              originPath: '/assets',
              s3OriginConfig: {
                originAccessIdentity: 'origin-access-identity/cloudfront/E1234567890ABC'
              }
            }
          ],
          defaultCacheBehavior: {
            viewerProtocolPolicy: 'redirect-to-https',
            allowedMethods: ['GET', 'HEAD'],
            cachedMethods: ['GET', 'HEAD', 'OPTIONS'],
            cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:distribution',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Distribution environment variables are set
      expect(result.environmentVariables['CLOUDFRONT_DISTRIBUTION_ID']).toBe('EDFDVBD6EXAMPLE');
      expect(result.environmentVariables['CLOUDFRONT_DISTRIBUTION_ARN']).toBe('arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE');
      expect(result.environmentVariables['CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME']).toBe('d111111abcdef8.cloudfront.net');
      expect(result.environmentVariables['CLOUDFRONT_DISTRIBUTION_STATUS']).toBe('Deployed');
      expect(result.environmentVariables['CLOUDFRONT_DISTRIBUTION_ENABLED']).toBe('true');
      expect(result.environmentVariables['CLOUDFRONT_DISTRIBUTION_PRICE_CLASS']).toBe('PriceClass_100');
      
      // Assert origins and cache behavior are exposed
      expect(result.environmentVariables['CLOUDFRONT_ORIGINS']).toBeDefined();
      expect(result.environmentVariables['CLOUDFRONT_DEFAULT_CACHE_BEHAVIOR']).toBeDefined();
      
      // Assert IAM policies include CloudFront distribution read actions
      const distributionPolicy = result.iamPolicies.find(p => p.description.includes('distribution') && p.description.includes('read'));
      expect(distributionPolicy).toBeDefined();
      expect(distributionPolicy!.statement.actions).toContain('cloudfront:GetDistribution');
      expect(distributionPolicy!.statement.resources).toEqual(['arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE']);
      
      // Assert S3 origin access is granted
      const s3Policy = result.iamPolicies.find(p => p.description.includes('S3 origin'));
      expect(s3Policy).toBeDefined();
      expect(s3Policy!.statement.actions).toContain('s3:GetObject');
      expect(s3Policy!.statement.resources).toEqual(['arn:aws:s3:::example-bucket/*']);
    });
  });

  describe('CloudFrontBind__ValidOriginAccess__ReturnsOriginEnvVars', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-002',
      level: 'unit' as const,
      capability: 'Returns CloudFront origin environment variables for valid origin access',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include CLOUDFRONT_ORIGIN_ID, CLOUDFRONT_ORIGIN_DOMAIN_NAME',
        'IAM policies include CloudFront origin read actions when originRequestPolicyArn is provided',
        'Custom origin and S3 origin configurations are exposed',
        'Custom headers are exposed as JSON when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with cloudfront:origin capability and read access',
        notes: 'Basic CloudFront origin read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__ValidOriginAccess__ReturnsOriginEnvVars', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-origin', {
        'cloudfront:origin': {
          type: 'cloudfront:origin',
          originId: 'origin1',
          domainName: 'example.com',
          originPath: '/api',
          originRequestPolicyArn: 'arn:aws:cloudfront::123456789012:origin-request-policy/12345678-1234-1234-1234-123456789012',
          customOriginConfig: {
            httpPort: 80,
            httpsPort: 443,
            originProtocolPolicy: 'https-only'
          },
          customHeaders: [
            {
              headerName: 'X-Custom-Header',
              headerValue: 'custom-value'
            }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:origin',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Origin environment variables are set
      expect(result.environmentVariables['CLOUDFRONT_ORIGIN_ID']).toBe('origin1');
      expect(result.environmentVariables['CLOUDFRONT_ORIGIN_DOMAIN_NAME']).toBe('example.com');
      expect(result.environmentVariables['CLOUDFRONT_ORIGIN_PATH']).toBe('/api');
      expect(result.environmentVariables['CLOUDFRONT_ORIGIN_HTTP_PORT']).toBe('80');
      expect(result.environmentVariables['CLOUDFRONT_ORIGIN_HTTPS_PORT']).toBe('443');
      expect(result.environmentVariables['CLOUDFRONT_ORIGIN_PROTOCOL_POLICY']).toBe('https-only');
      expect(result.environmentVariables['CLOUDFRONT_ORIGIN_CUSTOM_HEADERS']).toBeDefined();
      
      // Assert IAM policies include CloudFront origin read actions
      const originPolicy = result.iamPolicies.find(p => p.description.includes('origin') && p.description.includes('read'));
      expect(originPolicy).toBeDefined();
      expect(originPolicy!.statement.actions).toContain('cloudfront:GetOriginRequestPolicy');
      expect(originPolicy!.statement.resources).toEqual(['arn:aws:cloudfront::123456789012:origin-request-policy/12345678-1234-1234-1234-123456789012']);
    });
  });

  describe('CloudFrontBind__ValidCachePolicyAccess__ReturnsCachePolicyEnvVars', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-003',
      level: 'unit' as const,
      capability: 'Returns CloudFront cache policy environment variables for valid cache policy access',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include CLOUDFRONT_CACHE_POLICY_ID, CLOUDFRONT_CACHE_POLICY_ARN, CLOUDFRONT_CACHE_POLICY_NAME',
        'IAM policies include CloudFront cache policy read actions',
        'TTL settings and cache key parameters are exposed when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with cloudfront:cache-policy capability and read access',
        notes: 'Basic CloudFront cache policy read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__ValidCachePolicyAccess__ReturnsCachePolicyEnvVars', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-cache-policy', {
        'cloudfront:cache-policy': {
          type: 'cloudfront:cache-policy',
          cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
          cachePolicyArn: 'arn:aws:cloudfront::123456789012:cache-policy/658327ea-f89d-4fab-a63d-7e88639e58f6',
          name: 'Managed-CachingOptimized',
          comment: 'Optimized caching policy',
          defaultTTL: 86400,
          maxTTL: 31536000,
          minTTL: 1,
          parametersInCacheKeyAndForwardedToOrigin: {
            headersConfig: {
              headerBehavior: 'whitelist',
              headers: ['Authorization']
            },
            queryStringsConfig: {
              queryStringBehavior: 'all'
            },
            cookiesConfig: {
              cookieBehavior: 'none'
            }
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:cache-policy',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Cache policy environment variables are set
      expect(result.environmentVariables['CLOUDFRONT_CACHE_POLICY_ID']).toBe('658327ea-f89d-4fab-a63d-7e88639e58f6');
      expect(result.environmentVariables['CLOUDFRONT_CACHE_POLICY_ARN']).toBe('arn:aws:cloudfront::123456789012:cache-policy/658327ea-f89d-4fab-a63d-7e88639e58f6');
      expect(result.environmentVariables['CLOUDFRONT_CACHE_POLICY_NAME']).toBe('Managed-CachingOptimized');
      expect(result.environmentVariables['CLOUDFRONT_CACHE_POLICY_COMMENT']).toBe('Optimized caching policy');
      expect(result.environmentVariables['CLOUDFRONT_CACHE_DEFAULT_TTL']).toBe('86400');
      expect(result.environmentVariables['CLOUDFRONT_CACHE_MAX_TTL']).toBe('31536000');
      expect(result.environmentVariables['CLOUDFRONT_CACHE_MIN_TTL']).toBe('1');
      expect(result.environmentVariables['CLOUDFRONT_CACHE_HEADERS']).toBeDefined();
      expect(result.environmentVariables['CLOUDFRONT_CACHE_QUERY_STRINGS']).toBeDefined();
      expect(result.environmentVariables['CLOUDFRONT_CACHE_COOKIES']).toBeDefined();
      
      // Assert IAM policies include CloudFront cache policy read actions
      const cachePolicy = result.iamPolicies.find(p => p.description.includes('cache policy') && p.description.includes('read'));
      expect(cachePolicy).toBeDefined();
      expect(cachePolicy!.statement.actions).toContain('cloudfront:GetCachePolicy');
      expect(cachePolicy!.statement.resources).toEqual(['arn:aws:cloudfront::123456789012:cache-policy/658327ea-f89d-4fab-a63d-7e88639e58f6']);
    });
  });

  describe('CloudFrontBind__WriteAccess__GrantsInvalidationPermissions', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-004',
      level: 'unit' as const,
      capability: 'Grants invalidation permissions when write access is requested',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include CloudFront invalidation actions for write/readwrite access',
        'Distribution write actions are granted',
        'Invalidation permissions are scoped to distribution ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with cloudfront:distribution capability and write access',
        notes: 'CloudFront distribution binding with write access for cache invalidation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__WriteAccess__GrantsInvalidationPermissions', async () => {
    const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-distribution', {
        'cloudfront:distribution': {
          type: 'cloudfront:distribution',
      distributionArn: 'arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE',
      distributionId: 'EDFDVBD6EXAMPLE',
      domainName: 'd111111abcdef8.cloudfront.net',
      status: 'Deployed',
      enabled: true,
      priceClass: 'PriceClass_100'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:distribution',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Invalidation permissions are granted
      const invalidationPolicy = result.iamPolicies.find(p => p.description.includes('invalidation'));
      expect(invalidationPolicy).toBeDefined();
      expect(invalidationPolicy!.statement.actions).toContain('cloudfront:CreateInvalidation');
      expect(invalidationPolicy!.statement.actions).toContain('cloudfront:GetInvalidation');
      expect(invalidationPolicy!.statement.resources).toEqual(['arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE']);
      
      // Assert distribution write actions are granted
      const distributionPolicy = result.iamPolicies.find(p => p.description.includes('distribution') && p.description.includes('write'));
      expect(distributionPolicy).toBeDefined();
      expect(distributionPolicy!.statement.actions).toContain('cloudfront:UpdateDistribution');
    });
  });

  describe('CloudFrontBind__SecureDistributionAccess__ConfiguresHttpsWafLogging', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-005',
      level: 'unit' as const,
      capability: 'Configures HTTPS, WAF, logging, and geo restrictions when secure distribution access is enabled',
      oracle: 'exact' as const,
      invariants: [
        'HTTPS-only and viewer protocol policy are configured',
        'ACM certificate permissions are granted when SSL certificate is provided',
        'WAF permissions are granted when Web ACL ID is provided',
        'S3 logging permissions are granted when logging is configured',
        'CloudWatch metrics permissions are granted',
        'Geo restriction configuration is exposed'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with cloudfront:distribution capability and requireSecureDistributionAccess option',
        notes: 'CloudFront distribution binding with secure access enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__SecureDistributionAccess__ConfiguresHttpsWafLogging', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-distribution', {
        'cloudfront:distribution': {
          type: 'cloudfront:distribution',
          distributionArn: 'arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE',
          distributionId: 'EDFDVBD6EXAMPLE',
          domainName: 'd111111abcdef8.cloudfront.net',
          status: 'Deployed',
          enabled: true,
          priceClass: 'PriceClass_100',
          viewerCertificate: {
            acmCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc123',
            certificateSource: 'acm',
            sslSupportMethod: 'sni-only',
            minimumProtocolVersion: 'TLSv1.2_2021'
          },
          webACLId: 'arn:aws:wafv2:us-east-1:123456789012:global/webacl/test-waf/12345678-1234-1234-1234-123456789012',
          restrictions: {
            geoRestriction: {
              restrictionType: 'whitelist',
              locations: ['US', 'CA']
            }
          },
          logging: {
            bucket: 'cloudfront-logs-bucket',
            prefix: 'my-distribution/'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:distribution',
        access: 'read',
        options: {
          requireSecureDistributionAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure access environment variables are set
      expect(result.environmentVariables['CLOUDFRONT_HTTPS_ONLY_ENABLED']).toBe('true');
      expect(result.environmentVariables['CLOUDFRONT_VIEWER_PROTOCOL_POLICY']).toBe('redirect-to-https');
      expect(result.environmentVariables['CLOUDFRONT_SSL_CERTIFICATE_ARN']).toBe('arn:aws:acm:us-east-1:123456789012:certificate/abc123');
      expect(result.environmentVariables['CLOUDFRONT_SSL_CERTIFICATE_SOURCE']).toBe('acm');
      expect(result.environmentVariables['CLOUDFRONT_SSL_SUPPORT_METHOD']).toBe('sni-only');
      expect(result.environmentVariables['CLOUDFRONT_MINIMUM_PROTOCOL_VERSION']).toBe('TLSv1.2_2021');
      expect(result.environmentVariables['CLOUDFRONT_WAF_WEB_ACL_ID']).toBe('arn:aws:wafv2:us-east-1:123456789012:global/webacl/test-waf/12345678-1234-1234-1234-123456789012');
      expect(result.environmentVariables['CLOUDFRONT_GEO_RESTRICTION_ENABLED']).toBe('true');
      expect(result.environmentVariables['CLOUDFRONT_GEO_RESTRICTION_TYPE']).toBe('whitelist');
      expect(result.environmentVariables['CLOUDFRONT_GEO_RESTRICTION_LOCATIONS']).toBe('US,CA');
      expect(result.environmentVariables['CLOUDFRONT_ACCESS_LOGGING_ENABLED']).toBe('true');
      expect(result.environmentVariables['CLOUDFRONT_LOG_BUCKET']).toBe('cloudfront-logs-bucket');
      expect(result.environmentVariables['CLOUDFRONT_LOG_PREFIX']).toBe('my-distribution/');
      expect(result.environmentVariables['CLOUDFRONT_REAL_TIME_METRICS_ENABLED']).toBe('true');
      
      // Assert IAM policies include ACM, WAF, S3, and CloudWatch permissions
      const acmPolicy = result.iamPolicies.find(p => p.description.includes('ACM'));
      expect(acmPolicy).toBeDefined();
      expect(acmPolicy!.statement.actions).toContain('acm:DescribeCertificate');
      expect(acmPolicy!.statement.resources).toEqual(['arn:aws:acm:us-east-1:123456789012:certificate/abc123']);
      
      const wafPolicy = result.iamPolicies.find(p => p.description.includes('WAF'));
      expect(wafPolicy).toBeDefined();
      expect(wafPolicy!.statement.actions).toContain('wafv2:GetWebACL');
      
      const s3LoggingPolicy = result.iamPolicies.find(p => p.description.includes('logging'));
      expect(s3LoggingPolicy).toBeDefined();
      expect(s3LoggingPolicy!.statement.actions).toContain('s3:PutObject');
      
      const cloudWatchPolicy = result.iamPolicies.find(p => p.description.includes('CloudWatch'));
      expect(cloudWatchPolicy).toBeDefined();
      expect(cloudWatchPolicy!.statement.actions).toContain('cloudwatch:PutMetricData');
    });
  });

  describe('CloudFrontBind__ValidFunctionAccess__ReturnsFunctionEnvVars', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-006',
      level: 'unit' as const,
      capability: 'Returns CloudFront Function environment variables for valid function access',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include CLOUDFRONT_FUNCTION_NAME, CLOUDFRONT_FUNCTION_ARN, CLOUDFRONT_FUNCTION_RUNTIME, CLOUDFRONT_FUNCTION_STAGE',
        'IAM policies include CloudFront Function read actions',
        'Function code is not exposed as env var for security'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with cloudfront:function capability and read access',
        notes: 'Basic CloudFront Function read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__ValidFunctionAccess__ReturnsFunctionEnvVars', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-function', {
        'cloudfront:function': {
          type: 'cloudfront:function',
          functionName: 'test-function',
          functionArn: 'arn:aws:cloudfront::123456789012:function/test-function',
          runtime: 'cloudfront-js-1.0',
          stage: 'LIVE',
          comment: 'Test CloudFront Function'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:function',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Function environment variables are set
      expect(result.environmentVariables['CLOUDFRONT_FUNCTION_NAME']).toBe('test-function');
      expect(result.environmentVariables['CLOUDFRONT_FUNCTION_ARN']).toBe('arn:aws:cloudfront::123456789012:function/test-function');
      expect(result.environmentVariables['CLOUDFRONT_FUNCTION_RUNTIME']).toBe('cloudfront-js-1.0');
      expect(result.environmentVariables['CLOUDFRONT_FUNCTION_STAGE']).toBe('LIVE');
      expect(result.environmentVariables['CLOUDFRONT_FUNCTION_COMMENT']).toBe('Test CloudFront Function');
      
      // Assert function code is NOT exposed (security)
      expect(result.environmentVariables['CLOUDFRONT_FUNCTION_CODE']).toBeUndefined();
      
      // Assert IAM policies include CloudFront Function read actions
      const functionPolicy = result.iamPolicies.find(p => p.description.includes('Function') && p.description.includes('read'));
      expect(functionPolicy).toBeDefined();
      expect(functionPolicy!.statement.actions).toContain('cloudfront:GetFunction');
      expect(functionPolicy!.statement.resources).toEqual(['arn:aws:cloudfront::123456789012:function/test-function']);
    });
  });

  describe('CloudFrontBind__ValidLambdaEdgeAccess__ReturnsLambdaEdgeEnvVars', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-007',
      level: 'unit' as const,
      capability: 'Returns Lambda@Edge environment variables for valid Lambda@Edge access',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include CLOUDFRONT_LAMBDA_EDGE_FUNCTION_ARN, CLOUDFRONT_LAMBDA_EDGE_EVENT_TYPE',
        'IAM policies include Lambda function permissions (us-east-1)',
        'CloudFront Lambda@Edge invocation permissions are granted for write access',
        'Function qualifier is exposed when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with cloudfront:lambda-edge capability and read access',
        notes: 'Basic Lambda@Edge read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__ValidLambdaEdgeAccess__ReturnsLambdaEdgeEnvVars', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-lambda-edge', {
        'cloudfront:lambda-edge': {
          type: 'cloudfront:lambda-edge',
          lambdaFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-lambda-edge:1',
          eventType: 'viewer-request',
          includeBody: true,
          lambdaFunctionQualifier: '1'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:lambda-edge',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Lambda@Edge environment variables are set
      expect(result.environmentVariables['CLOUDFRONT_LAMBDA_EDGE_FUNCTION_ARN']).toBe('arn:aws:lambda:us-east-1:123456789012:function:test-lambda-edge:1');
      expect(result.environmentVariables['CLOUDFRONT_LAMBDA_EDGE_EVENT_TYPE']).toBe('viewer-request');
      expect(result.environmentVariables['CLOUDFRONT_LAMBDA_EDGE_INCLUDE_BODY']).toBe('true');
      expect(result.environmentVariables['CLOUDFRONT_LAMBDA_EDGE_FUNCTION_QUALIFIER']).toBe('1');
      
      // Assert IAM policies include Lambda function permissions
      const lambdaPolicy = result.iamPolicies.find(p => p.description.includes('Lambda@Edge'));
      expect(lambdaPolicy).toBeDefined();
      expect(lambdaPolicy).toBeDefined();
      expect(lambdaPolicy!.statement.actions).toContain('lambda:GetFunction');
      // Lambda@Edge functions must be in us-east-1
      expect(lambdaPolicy!.statement.resources.some((r: string) => r.includes('us-east-1'))).toBe(true);
      expect(lambdaPolicy!.statement.resources).toContain('arn:aws:lambda:us-east-1:123456789012:function:test-lambda-edge');
      expect(lambdaPolicy!.statement.resources).toContain('arn:aws:lambda:us-east-1:123456789012:function:test-lambda-edge:*');
    });

    test('CloudFrontBind__LambdaEdgeWriteAccess__GrantsInvocationPermissions', async () => {
      const metadata = {
        id: 'TP-binders-cloudfront-008',
        level: 'unit' as const,
        capability: 'Grants Lambda@Edge invocation and function update permissions when write access is requested',
        oracle: 'exact' as const,
        invariants: [
          'IAM policies include Lambda function write actions (UpdateFunctionCode, UpdateFunctionConfiguration, PublishVersion)',
          'CloudFront invocation permissions (EnableReplication) are granted',
          'Lambda function permissions are scoped to us-east-1 region',
          'Resource ARNs are specific to the function'
        ],
        fixtures: ['MockSourceComponent', 'MockTargetComponent'],
        inputs: {
          shape: 'BindingContext with cloudfront:lambda-edge capability and write access',
          notes: 'Lambda@Edge binding with write access for function management and CloudFront association'
        },
        risks: [],
        dependencies: [],
        evidence: [],
        compliance_refs: [],
        ai_generated: true,
        human_reviewed_by: 'Platform Engineering'
      };
      const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-lambda-edge', {
        'cloudfront:lambda-edge': {
          type: 'cloudfront:lambda-edge',
          lambdaFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-lambda-edge',
          eventType: 'origin-request'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:lambda-edge',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Lambda@Edge invocation permissions are granted
      const invocationPolicy = result.iamPolicies.find(p => p.description.includes('invocation'));
      expect(invocationPolicy).toBeDefined();
      expect(invocationPolicy!.statement.actions).toContain('lambda:EnableReplication');
      expect(invocationPolicy!.statement.actions).toContain('lambda:GetFunctionConfiguration');
      
      // Assert Lambda function write actions are granted
      const lambdaPolicy = result.iamPolicies.find(p => p.description.includes('Lambda@Edge') && p.description.includes('write'));
      expect(lambdaPolicy).toBeDefined();
      expect(lambdaPolicy!.statement.actions).toContain('lambda:UpdateFunctionCode');
      expect(lambdaPolicy!.statement.actions).toContain('lambda:UpdateFunctionConfiguration');
      expect(lambdaPolicy!.statement.actions).toContain('lambda:PublishVersion');
      expect(lambdaPolicy!.statement.resources).toContain('arn:aws:lambda:us-east-1:123456789012:function:test-lambda-edge');
      expect(lambdaPolicy!.statement.resources).toContain('arn:aws:lambda:us-east-1:123456789012:function:test-lambda-edge:*');
      
      // Assert CloudFront invocation permissions are granted
      expect(invocationPolicy!.statement.actions).toContain('lambda:EnableReplication');
      expect(invocationPolicy!.statement.resources).toEqual(['arn:aws:lambda:us-east-1:123456789012:function:test-lambda-edge']);
    });
  });

  describe('CloudFrontBind__FunctionWriteAccess__GrantsCreateUpdatePublishPermissions', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-012',
      level: 'unit' as const,
      capability: 'Grants create, update, and publish permissions when CloudFront Function write access is requested',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include CloudFront Function write actions (CreateFunction, UpdateFunction, PublishFunction)',
        'Function write actions are scoped to specific function ARN',
        'TestFunction action is included for write access'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with cloudfront:function capability and write access',
        notes: 'CloudFront Function binding with write access for function management'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__FunctionWriteAccess__GrantsCreateUpdatePublishPermissions', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-function', {
        'cloudfront:function': {
          type: 'cloudfront:function',
          functionName: 'test-function',
          functionArn: 'arn:aws:cloudfront::123456789012:function/test-function',
          runtime: 'cloudfront-js-1.0',
          stage: 'DEVELOPMENT',
          comment: 'Test CloudFront Function'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:function',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Function write actions are granted
      const functionPolicy = result.iamPolicies.find(p => p.description.includes('Function') && p.description.includes('write'));
      expect(functionPolicy).toBeDefined();
      expect(functionPolicy!.statement.actions).toContain('cloudfront:CreateFunction');
      expect(functionPolicy!.statement.actions).toContain('cloudfront:UpdateFunction');
      expect(functionPolicy!.statement.actions).toContain('cloudfront:PublishFunction');
      expect(functionPolicy!.statement.actions).toContain('cloudfront:TestFunction');
      expect(functionPolicy!.statement.actions).toContain('cloudfront:DeleteFunction');
      
      // Assert actions are scoped to specific function ARN
      expect(functionPolicy!.statement.resources).toEqual(['arn:aws:cloudfront::123456789012:function/test-function']);
      
      // Assert read actions are also included
      expect(functionPolicy!.statement.actions).toContain('cloudfront:GetFunction');
      expect(functionPolicy!.statement.actions).toContain('cloudfront:ListFunctions');
      expect(functionPolicy!.statement.actions).toContain('cloudfront:DescribeFunction');
    });
  });

  describe('CloudFrontBind__ValidResponseHeadersPolicyAccess__ReturnsResponseHeadersPolicyEnvVars', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-009',
      level: 'unit' as const,
      capability: 'Returns CloudFront response headers policy environment variables for valid policy access',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include CLOUDFRONT_RESPONSE_HEADERS_POLICY_ID, CLOUDFRONT_RESPONSE_HEADERS_POLICY_ARN',
        'IAM policies include CloudFront response headers policy read actions',
        'Security headers configuration is exposed',
        'CORS configuration is exposed when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with cloudfront:response-headers-policy capability and read access',
        notes: 'Basic CloudFront response headers policy read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__ValidResponseHeadersPolicyAccess__ReturnsResponseHeadersPolicyEnvVars', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-response-headers-policy', {
        'cloudfront:response-headers-policy': {
          type: 'cloudfront:response-headers-policy',
          responseHeadersPolicyId: '12345678-1234-1234-1234-123456789012',
          responseHeadersPolicyArn: 'arn:aws:cloudfront::123456789012:response-headers-policy/12345678-1234-1234-1234-123456789012',
          name: 'SecurityHeadersPolicy',
          comment: 'Security headers policy',
          securityHeadersConfig: {
            strictTransportSecurity: {
              accessControlMaxAgeSec: 31536000,
              includeSubdomains: true,
              preload: true,
              override: true
            },
            contentTypeOptions: {
              override: true
            },
            frameOptions: {
              frameOption: 'DENY',
              override: true
            },
            referrerPolicy: {
              referrerPolicy: 'strict-origin-when-cross-origin',
              override: true
            },
            xssProtection: {
              modeBlock: true,
              protection: true,
              override: true
            }
          },
          corsConfig: {
            accessControlAllowCredentials: true,
            accessControlAllowHeaders: {
              items: ['Content-Type', 'Authorization']
            },
            accessControlAllowMethods: {
              items: ['GET', 'POST']
            },
            accessControlAllowOrigins: {
              items: ['https://example.com']
            },
            accessControlMaxAgeSec: 3600,
            originOverride: true
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:response-headers-policy',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Response headers policy environment variables are set
      expect(result.environmentVariables['CLOUDFRONT_RESPONSE_HEADERS_POLICY_ID']).toBe('12345678-1234-1234-1234-123456789012');
      expect(result.environmentVariables['CLOUDFRONT_RESPONSE_HEADERS_POLICY_ARN']).toBe('arn:aws:cloudfront::123456789012:response-headers-policy/12345678-1234-1234-1234-123456789012');
      expect(result.environmentVariables['CLOUDFRONT_RESPONSE_HEADERS_POLICY_NAME']).toBe('SecurityHeadersPolicy');
      expect(result.environmentVariables['CLOUDFRONT_RESPONSE_HEADERS_POLICY_COMMENT']).toBe('Security headers policy');
      
      // Assert security headers are exposed
      expect(result.environmentVariables['CLOUDFRONT_SECURITY_HSTS_ENABLED']).toBe('true');
      expect(result.environmentVariables['CLOUDFRONT_SECURITY_HSTS_MAX_AGE']).toBe('31536000');
      expect(result.environmentVariables['CLOUDFRONT_SECURITY_HSTS_INCLUDE_SUBDOMAINS']).toBe('true');
      expect(result.environmentVariables['CLOUDFRONT_SECURITY_CONTENT_TYPE_OPTIONS_ENABLED']).toBe('true');
      expect(result.environmentVariables['CLOUDFRONT_SECURITY_FRAME_OPTIONS']).toBe('DENY');
      expect(result.environmentVariables['CLOUDFRONT_SECURITY_REFERRER_POLICY']).toBe('strict-origin-when-cross-origin');
      expect(result.environmentVariables['CLOUDFRONT_SECURITY_XSS_PROTECTION_ENABLED']).toBe('true');
      
      // Assert CORS configuration is exposed
      expect(result.environmentVariables['CLOUDFRONT_CORS_ENABLED']).toBe('true');
      expect(result.environmentVariables['CLOUDFRONT_CORS_ALLOW_CREDENTIALS']).toBe('true');
      expect(result.environmentVariables['CLOUDFRONT_CORS_ALLOW_HEADERS']).toBe('Content-Type,Authorization');
      expect(result.environmentVariables['CLOUDFRONT_CORS_ALLOW_METHODS']).toBe('GET,POST');
      expect(result.environmentVariables['CLOUDFRONT_CORS_ALLOW_ORIGINS']).toBe('https://example.com');
      expect(result.environmentVariables['CLOUDFRONT_CORS_MAX_AGE']).toBe('3600');
      
      // Assert IAM policies include CloudFront response headers policy read actions
      const policy = result.iamPolicies.find(p => p.description.includes('response headers policy') && p.description.includes('read'));
      expect(policy).toBeDefined();
      expect(policy!.statement.actions).toContain('cloudfront:GetResponseHeadersPolicy');
      expect(policy!.statement.resources).toEqual(['arn:aws:cloudfront::123456789012:response-headers-policy/12345678-1234-1234-1234-123456789012']);
    });
  });

  describe('CloudFrontBind__ValidFieldLevelEncryptionAccess__ReturnsFieldLevelEncryptionEnvVars', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-011',
      level: 'unit' as const,
      capability: 'Returns CloudFront field-level encryption environment variables for valid encryption access',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include CLOUDFRONT_FIELD_LEVEL_ENCRYPTION_ID, CLOUDFRONT_FIELD_LEVEL_ENCRYPTION_ARN',
        'IAM policies include CloudFront field-level encryption read actions',
        'Query argument and content type profiles are exposed when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with cloudfront:field-level-encryption capability and read access',
        notes: 'Basic CloudFront field-level encryption read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__ValidFieldLevelEncryptionAccess__ReturnsFieldLevelEncryptionEnvVars', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-field-level-encryption', {
        'cloudfront:field-level-encryption': {
          type: 'cloudfront:field-level-encryption',
          fieldLevelEncryptionId: '12345678-1234-1234-1234-123456789012',
          fieldLevelEncryptionArn: 'arn:aws:cloudfront::123456789012:field-level-encryption/12345678-1234-1234-1234-123456789012',
          comment: 'Field-level encryption for sensitive data',
          queryArgProfileConfig: {
            forwardWhenQueryArgProfileIsUnknown: false,
            queryArgProfiles: {
              items: [
                {
                  profileId: 'profile-1',
                  queryArg: 'creditCard'
                }
              ]
            }
          },
          contentTypeProfileConfig: {
            forwardWhenContentTypeIsUnknown: false,
            contentTypeProfiles: {
              items: [
                {
                  profileId: 'profile-1',
                  contentType: 'application/json'
                }
              ]
            }
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:field-level-encryption',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Field-level encryption environment variables are set
      expect(result.environmentVariables['CLOUDFRONT_FIELD_LEVEL_ENCRYPTION_ID']).toBe('12345678-1234-1234-1234-123456789012');
      expect(result.environmentVariables['CLOUDFRONT_FIELD_LEVEL_ENCRYPTION_ARN']).toBe('arn:aws:cloudfront::123456789012:field-level-encryption/12345678-1234-1234-1234-123456789012');
      expect(result.environmentVariables['CLOUDFRONT_FIELD_LEVEL_ENCRYPTION_COMMENT']).toBe('Field-level encryption for sensitive data');
      
      // Assert query argument profile is exposed
      expect(result.environmentVariables['CLOUDFRONT_FLE_QUERY_ARG_FORWARD_UNKNOWN']).toBe('false');
      expect(result.environmentVariables['CLOUDFRONT_FLE_QUERY_ARG_PROFILES']).toBeDefined();
      
      // Assert content type profile is exposed
      expect(result.environmentVariables['CLOUDFRONT_FLE_CONTENT_TYPE_FORWARD_UNKNOWN']).toBe('false');
      expect(result.environmentVariables['CLOUDFRONT_FLE_CONTENT_TYPE_PROFILES']).toBeDefined();
      
      // Assert IAM policies include CloudFront field-level encryption read actions
      const encryptionPolicy = result.iamPolicies.find(p => p.description.includes('field-level encryption') && p.description.includes('read'));
      expect(encryptionPolicy).toBeDefined();
      expect(encryptionPolicy!.statement.actions).toContain('cloudfront:GetFieldLevelEncryption');
      expect(encryptionPolicy!.statement.resources).toEqual(['arn:aws:cloudfront::123456789012:field-level-encryption/12345678-1234-1234-1234-123456789012']);
    });
  });

  describe('CloudFrontBind__FieldLevelEncryptionWriteAccess__GrantsCreateUpdateDeletePermissions', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-012',
      level: 'unit' as const,
      capability: 'Grants create, update, and delete permissions when field-level encryption write access is requested',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include CloudFront field-level encryption write actions (CreateFieldLevelEncryptionConfig, UpdateFieldLevelEncryptionConfig, DeleteFieldLevelEncryptionConfig)',
        'Field-level encryption write actions are scoped to specific encryption ARN',
        'Read actions are also included for write access'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with cloudfront:field-level-encryption capability and write access',
        notes: 'CloudFront field-level encryption binding with write access for encryption management'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__FieldLevelEncryptionWriteAccess__GrantsCreateUpdateDeletePermissions', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('cloudfront-field-level-encryption', {
        'cloudfront:field-level-encryption': {
          type: 'cloudfront:field-level-encryption',
          fieldLevelEncryptionId: '12345678-1234-1234-1234-123456789012',
          fieldLevelEncryptionArn: 'arn:aws:cloudfront::123456789012:field-level-encryption/12345678-1234-1234-1234-123456789012',
          comment: 'Field-level encryption for sensitive data'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'cloudfront:field-level-encryption',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Field-level encryption write actions are granted
      const encryptionPolicy = result.iamPolicies.find(p => p.description.includes('field-level encryption') && p.description.includes('write'));
      expect(encryptionPolicy).toBeDefined();
      expect(encryptionPolicy!.statement.actions).toContain('cloudfront:CreateFieldLevelEncryptionConfig');
      expect(encryptionPolicy!.statement.actions).toContain('cloudfront:UpdateFieldLevelEncryptionConfig');
      expect(encryptionPolicy!.statement.actions).toContain('cloudfront:DeleteFieldLevelEncryptionConfig');
      
      // Assert actions are scoped to specific encryption ARN
      expect(encryptionPolicy!.statement.resources).toEqual(['arn:aws:cloudfront::123456789012:field-level-encryption/12345678-1234-1234-1234-123456789012']);
      
      // Assert read actions are also included
      expect(encryptionPolicy!.statement.actions).toContain('cloudfront:GetFieldLevelEncryption');
      expect(encryptionPolicy!.statement.actions).toContain('cloudfront:GetFieldLevelEncryptionConfig');
      expect(encryptionPolicy!.statement.actions).toContain('cloudfront:ListFieldLevelEncryptionConfigs');
    });
  });

  describe('CloudFrontBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-010',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default CloudFront distribution actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudFrontBind__Condition__Outcome', example: 'CloudFrontBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default CloudFront actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'CloudFrontDistributionCapabilityData'],
      inputs: {
        shape: 'BindingContext with cloudfront:distribution capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const target = createMockTargetComponent('cloudfront-distribution', {
        'cloudfront:distribution': {
          type: 'cloudfront:distribution',
          distributionArn: 'arn:aws:cloudfront::123456789012:distribution/E1234567890ABC',
          distributionId: 'E1234567890ABC',
          domainName: 'd1234567890abc.cloudfront.net',
          status: 'Deployed',
          enabled: true,
          priceClass: 'PriceClass_All'
        }
      });

      const customActions = ['cloudfront:GetDistribution', 'cloudfront:ListDistributions'];
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'cloudfront:distribution',
        access: 'read',
        actions: customActions
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.iamPolicies.length).toBeGreaterThan(0);
      const policy = result.iamPolicies.find(p => p.description.includes('granular actions'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toEqual(expect.arrayContaining(customActions));
      expect(actions.length).toBe(customActions.length);
    });
  });

  describe('CloudFrontBind__InvalidActionPrefix__ThrowsPrefixMismatchError', () => {
    const metadata = {
      id: 'TP-binders-cloudfront-011',
      level: 'unit' as const,
      capability: 'Throws error when actions array contains actions with wrong service prefix',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudFrontBind__Condition__Outcome', example: 'CloudFrontBind__InvalidActionPrefix__ThrowsPrefixMismatchError' },
      invariants: [
        'Error message indicates service prefix mismatch',
        'Error specifies which actions are mismatched',
        'Binding fails before IAM policy generation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'CloudFrontDistributionCapabilityData'],
      inputs: {
        shape: 'BindingContext with cloudfront:distribution capability and directive.actions containing non-cloudfront actions',
        notes: 'Error case - invalid action prefix for CloudFront binder'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudFrontBind__InvalidActionPrefix__ThrowsPrefixMismatchError', async () => {
      const strategy = new CloudFrontBinderStrategy();
      const target = createMockTargetComponent('cloudfront-distribution', {
        'cloudfront:distribution': {
          type: 'cloudfront:distribution',
          distributionArn: 'arn:aws:cloudfront::123456789012:distribution/E1234567890ABC',
          distributionId: 'E1234567890ABC',
          domainName: 'd1234567890abc.cloudfront.net',
          status: 'Deployed',
          enabled: true,
          priceClass: 'PriceClass_All'
        }
      });

      const invalidActions = ['s3:GetObject']; // Wrong service prefix
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'cloudfront:distribution',
        access: 'read',
        actions: invalidActions
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        "Actions must match service prefix 'cloudfront:'"
      );
    });
  });
});
