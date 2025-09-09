/**
 * API Gateway HTTP Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 * 
 * Tests the actual CDK resource synthesis and compliance-specific hardening logic
 * for the Modern HTTP API Gateway component.
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { ApiGatewayHttpComponent } from './api-gateway-http.component';
import { ApiGatewayHttpConfig } from './api-gateway-http.builder';
import { ComponentContext, ComponentSpec } from '../../platform/contracts/component-interfaces';

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
  complianceFramework,
  region: 'us-east-1',
  account: '123456789012',
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
  
  const component = new ApiGatewayHttpComponent(stack, spec, context);
  component.synth();
  
  const template = Template.fromStack(stack);
  return { component, template };
};

describe('ApiGatewayHttpComponent Synthesis', () => {
  
  // Freeze time for deterministic tests
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(DETERMINISTIC_TIMESTAMP);
  });
  
  afterAll(() => {
    jest.useRealTimers();
  });
  
  describe('Default Happy Path Synthesis', () => {
    
    it('should synthesize basic HTTP API with commercial compliance', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify HTTP API creation
      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        Name: 'test-api-api',
        ProtocolType: 'HTTP',
        Description: 'HTTP API for test-api',
        CorsConfiguration: {
          AllowCredentials: true,
          AllowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
          AllowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          MaxAge: 86400
        }
      });
      
      // Verify Stage creation
      template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
        ApiId: { Ref: Match.anyValue() },
        StageName: 'dev',
        AutoDeploy: true
      });
      
      // Verify access logging is enabled for commercial compliance
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/apigateway/test-api-http-api',
        RetentionInDays: 30
      });
      
      // Verify IAM role for API Gateway logging
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'apigateway.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        },
        ManagedPolicyArns: [
          { 'Fn::Join': ['', ['arn:', { Ref: 'AWS::Partition' }, ':iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs']] }
        ]
      });
    });
    
    it('should apply standard platform tags', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify standard tags on HTTP API
      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        Tags: {
          'service-name': 'test-service',
          'owner': 'test-team',
          'environment': 'dev',
          'compliance-framework': 'commercial',
          'component-type': 'api-gateway-http',
          'api-type': 'http',
          'protocol': 'http'
        }
      });
      
      // Verify standard tags on Stage
      template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
        Tags: {
          'service-name': 'test-service',
          'owner': 'test-team',
          'environment': 'dev',
          'compliance-framework': 'commercial'
        }
      });
    });
    
  });
  
  describe('FedRAMP Moderate Compliance Hardening', () => {
    
    it('should apply FedRAMP Moderate security hardening', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec({
        cors: {
          allowOrigins: ['https://secure.example.com'] // Explicit origins required
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify stricter CORS configuration
      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        CorsConfiguration: {
          AllowOrigins: ['https://secure.example.com'], // No wildcards
          AllowCredentials: true, // Required for FedRAMP
          AllowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
          AllowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          MaxAge: 86400
        },
        DisableExecuteApiEndpoint: true // Security requirement
      });
      
      // Verify extended log retention for audit trail
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 90 // FedRAMP Moderate requirement
      });
      
      // Verify X-Ray tracing is enabled
      template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
        TracingConfig: {
          TracingEnabled: true
        }
      });
      
      // Verify stricter throttling limits
      template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
        ThrottleSettings: {
          RateLimit: 500,
          BurstLimit: 1000
        }
      });
    });
    
    it('should create CloudWatch alarms for FedRAMP monitoring', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec({
        cors: {
          allowOrigins: ['https://secure.example.com']
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify 4xx error alarm with stricter threshold
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-api-api-4xx-errors',
        AlarmDescription: '4xx error rate is too high',
        MetricName: '4XXError',
        Namespace: 'AWS/ApiGateway',
        Threshold: 2.0, // Stricter than commercial (5.0)
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2
      });
      
      // Verify 5xx error alarm with stricter threshold
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-api-api-5xx-errors',
        AlarmDescription: '5xx error rate is too high',
        MetricName: '5XXError',
        Namespace: 'AWS/ApiGateway',
        Threshold: 0.5, // Stricter than commercial (1.0)
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2
      });
      
      // Verify high latency alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-api-api-high-latency',
        AlarmDescription: 'API latency is too high',
        MetricName: 'IntegrationLatency',
        Namespace: 'AWS/ApiGateway',
        Threshold: 3000, // Stricter latency requirement
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 3
      });
    });
    
  });
  
  describe('FedRAMP High Compliance Hardening', () => {
    
    it('should apply FedRAMP High security hardening', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec({
        cors: {
          allowOrigins: ['https://topsecret.gov.example.com']
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify maximum log retention for audit trail
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 365 // FedRAMP High requirement
      });
      
      // Verify execute API endpoint is disabled
      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        DisableExecuteApiEndpoint: true
      });
      
      // Same monitoring requirements as FedRAMP Moderate
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-api-api-4xx-errors',
        Threshold: 2.0
      });
      
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-api-api-5xx-errors',
        Threshold: 0.5
      });
    });
    
  });
  
  describe('Custom Domain Configuration', () => {
    
    it('should create custom domain with existing certificate', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        customDomain: {
          domainName: 'api.example.com',
          certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
          endpointType: 'REGIONAL',
          securityPolicy: 'TLS_1_2'
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
        DomainName: 'api.example.com',
        ApiId: { Ref: Match.anyValue() },
        Stage: 'dev'
      });
    });
    
    it('should create custom domain with auto-generated certificate', () => {
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
      template.hasResourceProperties('AWS::CertificateManager::Certificate', {
        DomainName: 'api.example.com',
        ValidationMethod: 'DNS'
      });
      
      // Verify Route 53 record creation
      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: 'api.example.com',
        Type: 'A'
      });
    });
    
  });
  
  describe('Access Logging Configuration', () => {
    
    it('should disable access logging when configured', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        accessLogging: {
          enabled: false
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify no log group is created
      template.resourceCountIs('AWS::Logs::LogGroup', 0);
      
      // Verify no IAM role for logging
      template.resourceCountIs('AWS::IAM::Role', 0);
    });
    
    it('should configure custom log format and retention', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        accessLogging: {
          enabled: true,
          logGroupName: '/custom/api/logs',
          retentionInDays: 180,
          format: '$requestId $requestTime $status'
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify custom log group configuration
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/custom/api/logs',
        RetentionInDays: 180
      });
    });
    
  });
  
  describe('Monitoring and Observability', () => {
    
    it('should enable X-Ray tracing when configured', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          tracingEnabled: true
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify X-Ray tracing configuration
      template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
        TracingConfig: {
          TracingEnabled: true
        }
      });
    });
    
    it('should create custom CloudWatch alarms', () => {
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
        AlarmName: 'test-api-api-4xx-errors',
        Threshold: 15.0
      });
      
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-api-api-5xx-errors',
        Threshold: 2.0
      });
      
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'test-api-api-high-latency',
        Threshold: 8000
      });
    });
    
  });
  
  describe('Component Capabilities and Constructs', () => {
    
    it('should register correct capabilities after synthesis', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      const capabilities = component.getCapabilities();
      
      // Verify HTTP API capability
      expect(capabilities['api:http']).toBeDefined();
      expect(capabilities['api:http'].apiId).toBeDefined();
      expect(capabilities['api:http'].apiEndpoint).toBeDefined();
      expect(capabilities['api:http'].stageName).toBe('dev');
      
      // Verify monitoring capability
      expect(capabilities['monitoring:api']).toBeDefined();
      expect(capabilities['monitoring:api'].detailedMetrics).toBe(true);
      expect(capabilities['monitoring:api'].tracingEnabled).toBe(true);
      
      // Verify logging capability
      expect(capabilities['logging:access']).toBeDefined();
      expect(capabilities['logging:access'].logGroupName).toBe('/aws/apigateway/test-api-http-api');
    });
    
    it('should register construct handles for patches.ts access', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      // Verify main constructs are registered
      expect(component.getConstruct('main')).toBeDefined();
      expect(component.getConstruct('api')).toBeDefined();
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
      
      // Verify custom domain capability
      const capabilities = component.getCapabilities();
      expect(capabilities['api:custom-domain']).toBeDefined();
      expect(capabilities['api:custom-domain'].domainName).toBe('api.example.com');
      expect(capabilities['api:custom-domain'].domainEndpoint).toBe('https://api.example.com');
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
      expect(capabilities['api:websocket']).toBeDefined();
    });
    
  });
  
});
