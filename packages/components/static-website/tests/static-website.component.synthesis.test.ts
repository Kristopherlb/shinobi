/**
 * Unit tests for StaticWebsiteComponent synthesis
 * 
 * Tests CloudFormation resource generation and compliance hardening
 */

import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { StaticWebsiteComponent } from '../static-website.component';
import { ComponentContext, ComponentSpec } from '../../@shinobi/core/component-interfaces';

// Mock context helper
function createMockContext(complianceFramework: string = 'commercial'): ComponentContext {
  return {
    serviceName: 'test-service',
    environment: 'test',
    region: 'us-east-1',
    complianceFramework: complianceFramework as any,
    scope: {} as any
  };
}

describe('StaticWebsiteComponent Synthesis', () => {
  describe('Default Happy Path', () => {
    it('should synthesize basic static website with S3 and CloudFront', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {}
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create S3 bucket
      template.hasResourceProperties('AWS::S3::Bucket', {
        WebsiteConfiguration: {
          IndexDocument: 'index.html',
          ErrorDocument: 'error.html'
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true
        }
      });

      // Should create CloudFront distribution
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Enabled: true,
          DefaultRootObject: 'index.html',
          PriceClass: 'PriceClass_100'
        }
      });

      // Should create Origin Access Identity
      template.hasResourceProperties('AWS::CloudFront::CloudFrontOriginAccessIdentity', {});
    });

    it('should register correct capabilities', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {}
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const capabilities = component.getCapabilities();
      expect(capabilities['hosting:static']).toBeDefined();
      expect(capabilities['hosting:static'].bucketName).toBeDefined();
      expect(capabilities['hosting:static'].websiteUrl).toBeDefined();
      expect(capabilities['hosting:static'].distributionDomainName).toBeDefined();
    });

    it('should register correct construct handles', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {}
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      expect(component.getConstruct('main')).toBeDefined();
      expect(component.getConstruct('bucket')).toBeDefined();
      expect(component.getConstruct('distribution')).toBeDefined();
    });
  });

  describe('Configuration Variations', () => {
    it('should create website with custom domain', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {
          domain: {
            domainName: 'example.com',
            certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
          }
        }
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Aliases: ['example.com'],
          ViewerCertificate: {
            AcmCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
          }
        }
      });
    });

    it('should create website with deployment enabled', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {
          deployment: {
            enabled: true,
            sourcePath: './dist',
            retainOnDelete: true
          }
        }
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create bucket deployment
      template.hasResourceProperties('Custom::CDKBucketDeployment', {
        RetainOnDelete: true
      });

      expect(component.getConstruct('deployment')).toBeDefined();
    });

    it('should disable CloudFront when distribution is disabled', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {
          distribution: {
            enabled: false
          }
        }
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should not create CloudFront distribution
      template.resourceCountIs('AWS::CloudFront::Distribution', 0);
      template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 0);

      expect(component.getConstruct('distribution')).toBeUndefined();
    });
  });

  describe('Compliance Framework Hardening', () => {
    it('should apply fedramp-moderate hardening', () => {
      const stack = new Stack();
      const context = createMockContext('fedramp-moderate');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {}
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should enable versioning for compliance
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled'
        }
      });

      // Should create access log bucket
      template.resourceCountIs('AWS::S3::Bucket', 3); // Main bucket + access logs + distribution logs

      const distributions = template.findResources('AWS::CloudFront::Distribution');
      const distribution = Object.values(distributions)[0];
      expect(distribution).toBeDefined();
      const logging = distribution.Properties?.DistributionConfig?.Logging;
      expect(logging).toBeDefined();
      expect(logging.Prefix).toBe('cloudfront/');
      expect(logging.Bucket).toBeDefined();
    });

    it('should apply fedramp-high hardening', () => {
      const stack = new Stack();
      const context = createMockContext('fedramp-high');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {}
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should enable versioning for compliance
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled'
        }
      });

      // Should create access log bucket
      template.resourceCountIs('AWS::S3::Bucket', 3); // Main bucket + access logs + distribution logs

      const distributions = template.findResources('AWS::CloudFront::Distribution');
      const distribution = Object.values(distributions)[0];
      expect(distribution).toBeDefined();
      const logging = distribution.Properties?.DistributionConfig?.Logging;
      expect(logging).toBeDefined();
      expect(logging.Prefix).toBe('cloudfront/');
      expect(logging.Bucket).toBeDefined();

      const bucketsRetain = template.findResources('AWS::S3::Bucket');
      Object.values(bucketsRetain).forEach(resource => {
        expect(resource.DeletionPolicy).toBe('Retain');
        expect(resource.UpdateReplacePolicy).toBe('Retain');
      });
    });

    it('should apply correct log retention based on compliance framework', () => {
      const stack = new Stack();
      const context = createMockContext('fedramp-high');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {}
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      const buckets = template.findResources('AWS::S3::Bucket');
      const logBucket = Object.values(buckets).find(resource =>
        resource.Properties?.LifecycleConfiguration
      );

      expect(logBucket).toBeDefined();
      const rules = logBucket!.Properties!.LifecycleConfiguration?.Rules;
      expect(rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            Id: 'DeleteOldLogs',
            ExpirationInDays: 3650
          })
        ])
      );
    });
  });

  describe('Security Configuration', () => {
    it('should enforce HTTPS when security.enforceHTTPS is true', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {
          security: {
            enforceHTTPS: true
          }
        }
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            ViewerProtocolPolicy: 'redirect-to-https'
          }
        }
      });
    });

    it('should create encrypted S3 bucket when encryption is enabled', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {
          security: {
            encryption: true
          }
        }
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256'
              }
            }
          ]
        }
      });
    });
  });

  describe('Tagging', () => {
    it('should apply standard tags to all resources', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {}
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      const buckets = template.findResources('AWS::S3::Bucket');
      const websiteBucket = Object.values(buckets).find(resource =>
        resource.Properties?.WebsiteConfiguration
      );

      expect(websiteBucket).toBeDefined();
      expect(websiteBucket!.Properties!.Tags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            Key: 'bucket-type',
            Value: 'website'
          })
        ])
      );
    });

    it('should apply custom tags when provided', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {
          tags: {
            'custom-tag': 'custom-value',
            'environment': 'production'
          }
        }
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      const buckets = template.findResources('AWS::S3::Bucket');
      const websiteBucket = Object.values(buckets).find(resource =>
        resource.Properties?.WebsiteConfiguration
      );

      expect(websiteBucket).toBeDefined();
      expect(websiteBucket!.Properties!.Tags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            Key: 'custom-tag',
            Value: 'custom-value'
          }),
          expect.objectContaining({
            Key: 'environment',
            Value: 'production'
          })
        ])
      );
    });
  });
});
