/**
 * API Gateway HTTP Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 * 
 * Tests the actual CDK resource synthesis and compliance-specific hardening logic
 * for the Modern HTTP API Gateway component.
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { ApiGatewayHttpComponent } from '../api-gateway-http.component';
import { ApiGatewayHttpConfig } from '../api-gateway-http.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

// Test Metadata as per Platform Testing Standard v1.0 Section 11
const TEST_METADATA = {
  component: 'api-gateway-http',
  level: 'unit',
  type: 'synthesis',
  framework: 'jest',
  deterministic: true,
  fixtures: ['mockComponentContext', 'mockComponentSpec', 'deterministicClock'],
  compliance_refs: ['std://platform-configuration', 'std://platform-tagging', 'std://service-injector-pattern'],
  ai_generated: true,
  human_reviewed_by: "platform-engineering-team"
};

// Deterministic test fixtures
const DETERMINISTIC_TIMESTAMP = new Date('2025-01-08T12:00:00.000Z');

// Mock component context factory
const createMockContext = (
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework: complianceFramework as 'commercial' | 'fedramp-moderate' | 'fedramp-high',
  region: 'us-east-1',
  accountId: '123456789012',
  account: '123456789012',
  scope: {} as any, // Mock CDK scope
  tags: {
    'service-name': 'test-service',
    'owner': 'test-team',
    'environment': environment,
    'compliance-framework': complianceFramework
  }
});

// Mock component spec factory
const createMockSpec = (config: Partial<ApiGatewayHttpConfig> = {}): ComponentSpec => ({
  name: 'test-api',
  type: 'api-gateway-http',
  config
});

// Helper to create component and template
const synthesizeComponent = (
  context: ComponentContext,
  spec: ComponentSpec
): { component: ApiGatewayHttpComponent; template: Template } => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  const component = new ApiGatewayHttpComponent(stack, 'TestHttpApi', context, spec);
  component.synth();

  const template = Template.fromStack(stack);
  return { component, template };
};

describe('ApiGatewayHttpComponent__Synthesis__ResourceCompliance', () => {

  // Freeze time for deterministic tests
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(DETERMINISTIC_TIMESTAMP);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Default Happy Path Synthesis', () => {

    it('Synthesis__CommercialDefaults__CreatesHttpApiResources', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();

      const { component, template } = synthesizeComponent(context, spec);

      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        Name: 'test-service-test-api',
        ProtocolType: 'HTTP',
        Description: 'HTTP API for test-api'
      });

      template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
        ApiId: { Ref: Match.anyValue() },
        StageName: 'dev',
        AutoDeploy: true
      });

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/platform/http-api/test-service/test-api',
        RetentionInDays: 90
      });
    });

    it('Tagging__AllCoreResources__IncludePlatformTags', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();

      const { component, template } = synthesizeComponent(context, spec);

      // Verify standard tags on HTTP API
      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        Tags: Match.objectLike({
          'service-name': 'test-service',
          'component-type': 'api-gateway-http'
        })
      });

      // Verify standard tags on Stage
      template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
        Tags: Match.objectLike({
          'service-name': 'test-service',
          'environment': 'dev'
        })
      });
    });

  });

  describe('Manifest Driven Hardening', () => {

    it('Synthesis__FedRampModerateManifest__AppliesOverrides', () => {
      const context = createMockContext('fedramp-moderate', 'stage');
      const spec = createMockSpec({
        cors: {
          allowOrigins: ['https://secure.example.com'],
          allowMethods: ['GET'],
          allowHeaders: ['Content-Type'],
          allowCredentials: false
        },
        accessLogging: {
          enabled: true,
          retentionInDays: 400,
          logGroupName: '/custom/logs'
        },
        apiSettings: {
          disableExecuteApiEndpoint: true
        },
        defaultStage: {
          stageName: 'secure-stage',
          autoDeploy: false
        },
        security: {
          enableWaf: false
        }
      });

      const { template } = synthesizeComponent(context, spec);

      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        DisableExecuteApiEndpoint: true,
        CorsConfiguration: {
          AllowOrigins: ['https://secure.example.com'],
          AllowMethods: ['GET'],
          AllowHeaders: ['Content-Type'],
          AllowCredentials: false
        }
      });

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/custom/logs',
        RetentionInDays: 400
      });

      template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
        StageName: 'secure-stage',
        AutoDeploy: false
      });
    });

    it('Synthesis__FedRampHighDefaults__ApplyRetentionAndStages', () => {
      const context = createMockContext('fedramp-high', 'prod');
      const spec = createMockSpec({
        apiSettings: {
          disableExecuteApiEndpoint: false
        },
        accessLogging: {
          enabled: true,
          retentionInDays: 731
        },
        security: {
          enableWaf: false
        }
      });

      const { template } = synthesizeComponent(context, spec);

      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        DisableExecuteApiEndpoint: false
      });

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 731
      });

      template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
        StageName: 'prod'
      });
    });

  });

  describe('Custom Domain Configuration', () => {

    it('CustomDomain__ExistingCertificate__CreatesDomainMapping', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        customDomain: {
          domainName: 'api.example.com',
          certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
          endpointType: 'REGIONAL',
          securityPolicy: 'TLS_1_2',
          hostedZoneId: 'Z2ABCDEFG12345',
          hostedZoneName: 'example.com'
        }
      });

      const { template } = synthesizeComponent(context, spec);

      // Verify custom domain creation
      template.hasResourceProperties('AWS::ApiGatewayV2::DomainName', {
        DomainName: 'api.example.com',
        DomainNameConfigurations: [{
          CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
          EndpointType: 'REGIONAL',
          SecurityPolicy: 'TLS_1_2'
        }]
      });

      // Verify API mapping
      template.hasResourceProperties('AWS::ApiGatewayV2::ApiMapping', {
        DomainName: Match.anyValue(),
        ApiId: { Ref: Match.anyValue() },
        Stage: 'dev'
      });
    });

    it('CustomDomain__AutoGeneratedCertificate__CreatesValidation', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        customDomain: {
          domainName: 'api.example.com',
          autoGenerateCertificate: true,
          hostedZoneId: 'Z2ABCDEFG12345',
          hostedZoneName: 'example.com'
        }
      });

      const { template } = synthesizeComponent(context, spec);

      const certificateResources = template.findResources('AWS::CloudFormation::CustomResource');
      const requestor = Object.values(certificateResources).find(resource =>
        resource.Properties?.DomainName === 'api.example.com'
      );
      expect(requestor).toBeDefined();

      template.hasResourceProperties('AWS::ApiGatewayV2::DomainName', {
        DomainName: 'api.example.com',
        DomainNameConfigurations: [{
          SecurityPolicy: 'TLS_1_2'
        }]
      });
    });

    it('Security__WafEnabledWithArn__AssociatesAcl', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        security: {
          enableWaf: true,
          webAclArn: 'arn:aws:wafv2:us-east-1:123456789012:regional/webacl/test/abcd1234'
        }
      });

      const { template } = synthesizeComponent(context, spec);

      const associations = template.findResources('AWS::WAFv2::WebACLAssociation');
      const association = Object.values(associations)[0];
      expect(association).toBeDefined();
      expect(JSON.stringify(association.Properties?.ResourceArn)).toContain(`/stages/${context.environment}`);
      expect(association.Properties?.WebACLArn).toBe('arn:aws:wafv2:us-east-1:123456789012:regional/webacl/test/abcd1234');
    });

    it('CustomDomain__GeneratedCertificate__CreatesDnsRecord', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        customDomain: {
          domainName: 'api.example.com',
          autoGenerateCertificate: true,
          hostedZoneId: 'Z123456789012',
          endpointType: 'REGIONAL',
          securityPolicy: 'TLS_1_2'
        }
      });

      const { template } = synthesizeComponent(context, spec);

      // Verify certificate creation
      const certificateResources = template.findResources('AWS::CloudFormation::CustomResource');
      const requestor = Object.values(certificateResources).find(resource =>
        resource.Properties?.DomainName === 'api.example.com'
      );
      expect(requestor).toBeDefined();

      // Verify Route 53 record creation
      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: Match.stringLikeRegexp('^api\\.example\\.com\\.?$'),
        Type: 'A'
      });
    });

    it('Security__WafEnabledWithoutArn__SkipsAssociationAndLogs', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        security: {
          enableWaf: true
        }
      });

      const logSpy = jest.spyOn(ApiGatewayHttpComponent.prototype as any, 'logComponentEvent');
      const { template } = synthesizeComponent(context, spec);

      expect(logSpy).toHaveBeenCalledWith(
        'waf_configuration_missing',
        expect.any(String),
        expect.objectContaining({ component: 'test-api' })
      );
      expect(template.findResources('AWS::WAFv2::WebACLAssociation')).toEqual({});

      logSpy.mockRestore();
    });

  });

  describe('Access Logging Configuration', () => {

    it('AccessLogging__DisabledInManifest__OmitsStageLogs', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        accessLogging: {
          enabled: false
        }
      });

      const { component, template } = synthesizeComponent(context, spec);

      expect(component['config'].accessLogging?.enabled).toBe(false);

      template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
        StageName: context.environment,
        AccessLogSettings: Match.absent()
      });
    });

    it('AccessLogging__CustomRetention__ConfiguresLogGroup', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        accessLogging: {
          enabled: true,
          logGroupName: '/custom/api/logs',
          retentionInDays: 180,
          format: '$requestId $requestTime $status'
        }
      });

      const { component, template } = synthesizeComponent(context, spec);

      // Verify custom log group configuration
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/custom/api/logs',
        RetentionInDays: 180
      });
    });

  });

  describe('Monitoring and Observability', () => {

    it('Observability__TracingEnabled__RetainsConfigFlag', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          tracingEnabled: true
        }
      });

      const { component, template } = synthesizeComponent(context, spec);

      // HTTP APIs do not support X-Ray stage tracing; ensure we do not attempt to configure it
      const stages = template.findResources('AWS::ApiGatewayV2::Stage');
      const stage = Object.values(stages)[0];
      expect(stage.Properties?.TracingConfig).toBeUndefined();
      expect(component['config'].monitoring?.tracingEnabled).toBe(true);
    });

    it('Monitoring__ManifestOverrides__CreatesAlarms', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          alarms: {
            errorRate4xx: 15.0,
            errorRate5xx: 2.0,
            highLatency: 8000
          }
        }
      });

      const { template } = synthesizeComponent(context, spec);

      // Verify custom alarm thresholds
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-api-4xx-error-rate',
        Threshold: 15.0,
        MetricName: '4XXError'
      });

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-api-5xx-error-rate',
        Threshold: 2.0,
        MetricName: '5XXError'
      });

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-api-latency',
        Threshold: 8000,
        MetricName: 'Latency'
      });
    });

    it('Monitoring__LowThroughputThreshold__CreatesCountAlarm', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          alarms: {
            lowThroughput: 3
          }
        }
      });

      const { template } = synthesizeComponent(context, spec);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-service-test-api-low-throughput',
        MetricName: 'Count',
        ComparisonOperator: 'LessThanThreshold'
      });
    });

    it('Security__ApiKeyEnabledWithoutSupport__EmitsPendingEvent', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        security: {
          enableApiKey: true
        }
      });

      const logSpy = jest.spyOn(ApiGatewayHttpComponent.prototype as any, 'logComponentEvent');
      synthesizeComponent(context, spec);

      expect(logSpy).toHaveBeenCalledWith(
        'api_key_enforcement_pending',
        expect.any(String),
        expect.objectContaining({ component: spec.name })
      );

      logSpy.mockRestore();
    });

    it('Observability__CustomSettings__LogsConfigurationEvent', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        observability: {
          tracingEnabled: true,
          metricsEnabled: true,
          logsEnabled: true,
          otlpEndpoint: 'https://collector.example.com'
        }
      });

      const logSpy = jest.spyOn(ApiGatewayHttpComponent.prototype as any, 'logComponentEvent');
      synthesizeComponent(context, spec);

      expect(logSpy).toHaveBeenCalledWith(
        'observability_configured',
        expect.any(String),
        expect.objectContaining({ otlpEndpoint: 'https://collector.example.com' })
      );

      logSpy.mockRestore();
    });

  });

  describe('Component Capabilities and Constructs', () => {

    it('should register correct capabilities after synthesis', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();

      const { component } = synthesizeComponent(context, spec);

      const capabilities = component.getCapabilities();

      // Verify HTTP API capability
      const httpCap = capabilities['api:http'];
      expect(httpCap).toBeDefined();
      expect(httpCap.resources).toEqual(
        expect.objectContaining({
          arn: expect.stringContaining(':apigateway:'),
          apiId: expect.any(String),
          stage: 'dev'
        })
      );
      expect(httpCap.endpoints).toEqual(
        expect.objectContaining({
          invokeUrl: expect.any(String),
          executeApiArn: expect.stringContaining(':execute-api:')
        })
      );
      expect(httpCap.cors).toEqual({ enabled: false, origins: [] });
    });

    it('should register construct handles for patches.ts access', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();

      const { component } = synthesizeComponent(context, spec);

      // Verify main constructs are registered
      expect(component.getConstruct('main')).toBeDefined();
      expect(component.getConstruct('httpApi')).toBeDefined();
      expect(component.getConstruct('stage')).toBeDefined();
      expect(component.getConstruct('logGroup')).toBeDefined();
    });

    it('should register custom domain constructs when configured', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        customDomain: {
          domainName: 'api.example.com',
          certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id'
        }
      });

      const { component } = synthesizeComponent(context, spec);

      // Verify custom domain constructs are registered
      expect(component.getConstruct('customDomain')).toBeDefined();

      const capabilities = component.getCapabilities();
      expect(capabilities['api:http'].customDomain).toEqual(
        expect.objectContaining({
          domainName: expect.any(String)
        })
      );
    });

  });

  describe('Error Handling and Edge Cases', () => {

    it('should handle missing configuration gracefully', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({}); // Empty config

      expect(() => {
        synthesizeComponent(context, spec);
      }).not.toThrow();
    });

    it('should validate component type', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();

      const { component } = synthesizeComponent(context, spec);

      expect(component.getType()).toBe('api-gateway-http');
    });

    it('should handle WebSocket protocol configuration', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        protocolType: 'WEBSOCKET'
      });

      const { component } = synthesizeComponent(context, spec);

      const capabilities = component.getCapabilities();
      expect(capabilities['api:http']).toBeDefined();
      expect(capabilities['api:websocket']).toBeUndefined();
    });

  });

});
