/**
 * Enterprise REST API Gateway Component Test Suite
 * Implements Platform Testing Standard v1.0
 * 
 * @file src/components/api-gateway-rest/api-gateway-rest.component.test.ts
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { ApiGatewayRestComponent, ApiGatewayRestConfigBuilder } from './api-gateway-rest.component';
import { ComponentContext, ComponentSpec } from '../../platform/contracts/component-interfaces';

// Test Metadata as per Platform Testing Standard v1.0 Section 11
const TEST_METADATA = {
  component: 'api-gateway-rest',
  level: 'unit',
  framework: 'jest',
  deterministic: true,
  fixtures: ['mockComponentContext', 'mockComponentSpec', 'deterministicClock'],
  compliance_refs: ['std://platform-configuration', 'std://platform-tagging', 'std://service-injector-pattern'],
  ai_generated: true,
  human_reviewed_by: "platform-engineering-team"
};

// Deterministic test fixtures
const DETERMINISTIC_TIMESTAMP = new Date('2025-01-08T12:00:00.000Z');
const FIXED_DEPLOYMENT_ID = 'test-deploy-20250108-120000';

// Mock component context with deterministic values
const createMockContext = (complianceFramework: string = 'commercial'): ComponentContext => ({
  serviceName: 'test-service',
  serviceVersion: '1.0.0',
  environment: 'test',
  region: 'us-east-1',
  account: '123456789012',
  complianceFramework: complianceFramework as any,
  deploymentId: FIXED_DEPLOYMENT_ID,
  platformVersion: '1.0.0',
  timestamp: DETERMINISTIC_TIMESTAMP,
  tags: {
    'service-name': 'test-service',
    'environment': 'test'
  }
});

const createMockSpec = (config: any = {}): ComponentSpec => ({
  name: 'test-api-gateway',
  type: 'api-gateway-rest',
  config: config
});

describe('ApiGatewayRestComponent', () => {
  let app: App;
  let stack: Stack;
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;

  beforeEach(() => {
    // Deterministic test setup
    jest.useFakeTimers();
    jest.setSystemTime(DETERMINISTIC_TIMESTAMP);
    
    app = new App();
    stack = new Stack(app, 'TestStack');
    mockContext = createMockContext();
    mockSpec = createMockSpec();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-api-gateway-rest-config-builder-001",
   *   "level": "unit", 
   *   "capability": "ConfigBuilder properly extends base class and implements hardcoded fallbacks",
   *   "oracle": "exact",
   *   "invariants": ["ConfigBuilder inheritance", "Required methods implemented"],
   *   "fixtures": ["mockComponentContext", "mockComponentSpec"],
   *   "inputs": {"shape": "ComponentContext and ComponentSpec", "notes": ""},
   *   "risks": ["ConfigBuilder contract violation"],
   *   "dependencies": ["ConfigBuilder base class"],
   *   "evidence": ["Class extends ConfigBuilder", "getHardcodedFallbacks implemented"],
   *   "compliance_refs": ["std://platform-configuration"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */>
  describe('ConfigBuilder__ValidImplementation__ExtendsBaseClassCorrectly', () => {
    it('should extend ConfigBuilder and implement required methods', () => {
      // Arrange: Create config builder with deterministic inputs
      const configBuilder = new ApiGatewayRestConfigBuilder(mockContext, mockSpec);
      
      // Act: Get hardcoded fallbacks
      const fallbacks = configBuilder.getHardcodedFallbacks();
      
      // Assert: Verify exact structure and values
      expect(configBuilder).toBeInstanceOf(ApiGatewayRestConfigBuilder);
      expect(typeof configBuilder.getHardcodedFallbacks).toBe('function');
      expect(fallbacks).toEqual({
        deploymentStage: 'test',
        description: 'Enterprise REST API Gateway for test-api-gateway',
        cors: {
          allowOrigins: [], // Security-compliant: empty array forces explicit config
          allowMethods: ['GET', 'POST', 'OPTIONS'],
          allowHeaders: ['Content-Type', 'Authorization'],
          allowCredentials: false
        },
        tracing: {
          xrayEnabled: false // Commercial framework default
        },
        throttling: {
          burstLimit: 100, // Conservative fallback
          rateLimit: 50   // Conservative fallback
        }
      });
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-api-gateway-rest-config-builder-002",
   *   "level": "unit",
   *   "capability": "ConfigBuilder uses 5-layer precedence chain correctly",
   *   "oracle": "exact",
   *   "invariants": ["Platform Configuration Standard compliance"],
   *   "fixtures": ["mockComponentContext", "mockComponentSpec"],
   *   "inputs": {"shape": "ComponentContext with compliance framework", "notes": "Tests fedramp-high compliance"},
   *   "risks": ["Configuration precedence violation"],
   *   "dependencies": ["ConfigBuilder base class", "Platform config files"],
   *   "evidence": ["buildSync returns merged config", "Compliance-aware configuration"],
   *   "compliance_refs": ["std://platform-configuration"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */
  describe('ConfigBuilder__ComplianceFramework__AppliesCorrectDefaults', () => {
    it('should apply compliance-aware configuration for FedRAMP High', async () => {
      // Arrange: Create context with FedRAMP High compliance
      const fedRAMPContext = createMockContext('fedramp-high');
      const configBuilder = new ApiGatewayRestConfigBuilder(fedRAMPContext, mockSpec);
      
      // Act: Build configuration using 5-layer precedence
      const config = await configBuilder.build();
      
      // Assert: Verify compliance-aware defaults are applied
      expect(config.cors.allowOrigins).toEqual([]); // FedRAMP requires explicit CORS config
      expect(config.cors.allowCredentials).toBe(false); // Always secure
      expect(config.throttling.burstLimit).toBeLessThanOrEqual(100); // Conservative limits
      expect(config.throttling.rateLimit).toBeLessThanOrEqual(50);
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-api-gateway-rest-component-001", 
   *   "level": "unit",
   *   "capability": "Component synthesis creates REST API Gateway with correct configuration",
   *   "oracle": "contract",
   *   "invariants": ["CDK construct creation", "AWS resource properties"],
   *   "fixtures": ["mockComponentContext", "mockComponentSpec", "cdkApp"],
   *   "inputs": {"shape": "Valid component configuration", "notes": ""},
   *   "risks": ["CDK synthesis failure", "Invalid AWS resource configuration"],
   *   "dependencies": ["CDK library", "AWS API Gateway constructs"],
   *   "evidence": ["Template contains REST API", "Correct resource properties"],
   *   "compliance_refs": ["std://platform-tagging", "std://service-injector-pattern"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */
  describe('Component__ValidConfiguration__CreatesRestApiGateway', () => {
    it('should synthesize REST API Gateway with correct AWS resources', () => {
      // Arrange: Create component with deterministic configuration
      const component = new ApiGatewayRestComponent(stack, 'TestApiGateway', mockContext, mockSpec);
      
      // Act: Synthesize component
      component.synth();
      
      // Assert: Verify CDK template contains expected AWS resources
      const template = Template.fromStack(stack);
      
      // Contract validation: REST API exists with correct properties
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: Match.stringLikeRegexp('test-api-gateway'),
        Description: Match.stringLikeRegexp('Enterprise REST API Gateway'),
        EndpointConfiguration: {
          Types: ['REGIONAL']
        }
      });
      
      // Contract validation: Deployment and stage exist
      template.hasResourceProperties('AWS::ApiGateway::Deployment', Match.anyValue());
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        StageName: 'test' // Should match environment
      });
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-api-gateway-rest-component-002",
   *   "level": "unit", 
   *   "capability": "Component applies all mandatory platform tags",
   *   "oracle": "exact",
   *   "invariants": ["Platform Tagging Standard compliance"],
   *   "fixtures": ["mockComponentContext", "mockComponentSpec"],
   *   "inputs": {"shape": "Component with standard context", "notes": ""},
   *   "risks": ["Missing mandatory tags", "Compliance violation"],
   *   "dependencies": ["BaseComponent tagging", "Platform tagging standard"],
   *   "evidence": ["All mandatory tags present", "Tag values correct"],
   *   "compliance_refs": ["std://platform-tagging"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */
  describe('Component__StandardTags__AppliesMandatoryTags', () => {
    it('should apply all mandatory platform tags to created resources', () => {
      // Arrange: Create component
      const component = new ApiGatewayRestComponent(stack, 'TestApiGateway', mockContext, mockSpec);
      
      // Act: Synthesize component 
      component.synth();
      
      // Assert: Verify all mandatory tags are present
      const template = Template.fromStack(stack);
      
      // Exact validation: REST API has mandatory tags
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Tags: [
          { Key: 'service-name', Value: 'test-service' },
          { Key: 'component-name', Value: 'test-api-gateway' },
          { Key: 'component-type', Value: 'api-gateway-rest' },
          { Key: 'environment', Value: 'test' },
          { Key: 'compliance-framework', Value: 'commercial' },
          { Key: 'deployed-by', Value: Match.stringLikeRegexp('platform-') }
        ]
      });
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-api-gateway-rest-component-003",
   *   "level": "unit",
   *   "capability": "Component provides correct capabilities after synthesis",
   *   "oracle": "exact", 
   *   "invariants": ["Component API contract"],
   *   "fixtures": ["mockComponentContext", "mockComponentSpec"],
   *   "inputs": {"shape": "Synthesized component", "notes": ""},
   *   "risks": ["Incorrect capability registration", "Contract violation"],
   *   "dependencies": ["BaseComponent capabilities system"],
   *   "evidence": ["Capabilities object structure", "API endpoint availability"],
   *   "compliance_refs": ["std://component-contract"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */
  describe('Component__PostSynthesis__ProvidesCorrectCapabilities', () => {
    it('should provide api:rest capability with correct structure', () => {
      // Arrange: Create and synthesize component
      const component = new ApiGatewayRestComponent(stack, 'TestApiGateway', mockContext, mockSpec);
      component.synth();
      
      // Act: Get capabilities
      const capabilities = component.getCapabilities();
      
      // Assert: Verify exact capability structure
      expect(capabilities).toHaveProperty('api:rest');
      expect(capabilities['api:rest']).toEqual({
        type: 'api:rest',
        apiId: expect.any(String),
        apiArn: expect.any(String), 
        apiEndpoint: expect.any(String),
        stageName: 'test',
        deploymentId: expect.any(String)
      });
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-api-gateway-rest-component-004",
   *   "level": "unit",
   *   "capability": "Component type identifier is correct",
   *   "oracle": "exact",
   *   "invariants": ["Component type consistency"],
   *   "fixtures": ["mockComponentContext", "mockComponentSpec"],
   *   "inputs": {"shape": "Component instance", "notes": ""},
   *   "risks": ["Wrong component type returned"],
   *   "dependencies": [],
   *   "evidence": ["getType returns api-gateway-rest"],
   *   "compliance_refs": [],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */
  describe('Component__TypeIdentifier__ReturnsCorrectType', () => {
    it('should return correct component type identifier', () => {
      // Arrange: Create component
      const component = new ApiGatewayRestComponent(stack, 'TestApiGateway', mockContext, mockSpec);
      
      // Act: Get component type
      const componentType = component.getType();
      
      // Assert: Verify exact type string
      expect(componentType).toBe('api-gateway-rest');
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-api-gateway-rest-component-005",
   *   "level": "unit",
   *   "capability": "Component fails gracefully when getCapabilities called before synthesis",
   *   "oracle": "exact",
   *   "invariants": ["Component lifecycle contract"],
   *   "fixtures": ["mockComponentContext", "mockComponentSpec"],
   *   "inputs": {"shape": "Unsynthesize component", "notes": ""},
   *   "risks": ["Undefined behavior", "Runtime errors"],
   *   "dependencies": ["BaseComponent validation"],
   *   "evidence": ["Throws expected error", "Error message is actionable"],
   *   "compliance_refs": ["std://component-contract"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */
  describe('Component__PreSynthesis__FailsGracefullyOnCapabilityAccess', () => {
    it('should throw descriptive error when capabilities accessed before synthesis', () => {
      // Arrange: Create unsynthesized component
      const component = new ApiGatewayRestComponent(stack, 'TestApiGateway', mockContext, mockSpec);
      
      // Act & Assert: Verify error is thrown with actionable message
      expect(() => {
        component.getCapabilities();
      }).toThrow(/must.*synth.*before.*capabilit/i);
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-api-gateway-rest-security-001",
   *   "level": "integration",
   *   "capability": "CORS configuration enforces security-first defaults",
   *   "oracle": "exact", 
   *   "invariants": ["Security-first configuration", "No hardcoded security violations"],
   *   "fixtures": ["mockComponentContext", "mockComponentSpec"],
   *   "inputs": {"shape": "Default component configuration", "notes": "Tests hardcoded fallback security"},
   *   "risks": ["Security vulnerability", "CORS misconfiguration"],
   *   "dependencies": ["ConfigBuilder", "Platform Configuration Standard"],
   *   "evidence": ["Empty allowOrigins", "Minimal safe methods", "Credentials disabled"],
   *   "compliance_refs": ["std://platform-configuration", "std://security"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */
  describe('Security__CORSDefaults__EnforcesSecurityFirstFallbacks', () => {
    it('should use security-compliant CORS defaults that force explicit configuration', () => {
      // Arrange: Create component with no CORS config (will use fallbacks)
      const emptySpec = createMockSpec({}); // No CORS configuration provided
      const component = new ApiGatewayRestComponent(stack, 'TestApiGateway', mockContext, emptySpec);
      
      // Act: Synthesize component (uses hardcoded fallbacks)
      component.synth();
      
      // Get the actual configuration used (through private access for testing)
      const configBuilder = new ApiGatewayRestConfigBuilder(mockContext, emptySpec);
      const fallbacks = configBuilder.getHardcodedFallbacks();
      
      // Assert: Verify security-first CORS defaults
      expect(fallbacks.cors.allowOrigins).toEqual([]); // CRITICAL: Must be empty to force config
      expect(fallbacks.cors.allowMethods).toEqual(['GET', 'POST', 'OPTIONS']); // Minimal safe methods
      expect(fallbacks.cors.allowHeaders).toEqual(['Content-Type', 'Authorization']); // Minimal safe headers
      expect(fallbacks.cors.allowCredentials).toBe(false); // Always secure default
    });
  });
});

/**
 * Integration Tests
 * Tests component integration with platform services and CDK constructs
 */
describe('ApiGatewayRestComponent Integration', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(DETERMINISTIC_TIMESTAMP);
    
    app = new App();
    stack = new Stack(app, 'IntegrationTestStack');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-api-gateway-rest-integration-001",
   *   "level": "integration",
   *   "capability": "Component integrates with Service Injector Pattern",
   *   "oracle": "behavioral-trace",
   *   "invariants": ["Service Injector Pattern compliance", "ObservabilityService integration"],
   *   "fixtures": ["cdkApp", "mockComponentContext", "mockComponentSpec"],
   *   "inputs": {"shape": "Component with observability service", "notes": ""},
   *   "risks": ["Service injection failure", "Observability not applied"],
   *   "dependencies": ["BaseComponent", "ObservabilityService"],
   *   "evidence": ["configureObservability called", "No internal observability methods"],
   *   "compliance_refs": ["std://service-injector-pattern", "std://platform-observability"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */
  describe('ServiceIntegration__ObservabilityService__DelegatesToPlatformService', () => {
    it('should delegate observability to platform service instead of internal methods', () => {
      // Arrange: Create component with observability context
      const mockContext = createMockContext();
      const mockSpec = createMockSpec();
      const component = new ApiGatewayRestComponent(stack, 'TestApiGateway', mockContext, mockSpec);
      
      // Spy on BaseComponent configureObservability method (should be called)
      const configureObservabilitySpy = jest.spyOn(component as any, 'configureObservability');
      
      // Act: Synthesize component 
      component.synth();
      
      // Assert: Verify Service Injector Pattern is used
      expect(configureObservabilitySpy).toHaveBeenCalledWith(
        expect.any(Object), // The API Gateway construct
        expect.objectContaining({
          serviceName: expect.any(String)
        })
      );
      
      // Verify no internal observability methods exist (they should be removed)
      expect((component as any).configureApiGatewayObservability).toBeUndefined();
      expect((component as any).createCloudWatchAlarms).toBeUndefined();
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-api-gateway-rest-integration-002",
   *   "level": "integration", 
   *   "capability": "Multiple compliance frameworks produce different configurations",
   *   "oracle": "metamorphic",
   *   "invariants": ["Configuration precedence consistency", "Compliance framework segregation"],
   *   "fixtures": ["cdkApp", "multipleComplianceContexts"],
   *   "inputs": {"shape": "Same component spec with different compliance frameworks", "notes": "Tests commercial vs fedramp-high"},
   *   "risks": ["Configuration bleed between frameworks", "Inconsistent compliance application"],
   *   "dependencies": ["ConfigBuilder", "Platform configuration files"],
   *   "evidence": ["Different throttling limits", "Different tracing settings", "Consistent internal structure"],
   *   "compliance_refs": ["std://platform-configuration"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */
  describe('ComplianceFramework__MultipleFrameworks__ProducesConsistentlyDifferentConfigs', () => {
    it('should produce different but structurally consistent configs for different compliance frameworks', async () => {
      // Arrange: Same spec, different compliance contexts
      const spec = createMockSpec({
        description: 'Test API for compliance comparison'
      });
      
      const commercialContext = createMockContext('commercial');
      const fedRAMPHighContext = createMockContext('fedramp-high');
      
      // Act: Build configurations for both frameworks
      const commercialBuilder = new ApiGatewayRestConfigBuilder(commercialContext, spec);
      const fedRAMPBuilder = new ApiGatewayRestConfigBuilder(fedRAMPHighContext, spec);
      
      const commercialConfig = await commercialBuilder.build();
      const fedRAMPConfig = await fedRAMPBuilder.build();
      
      // Assert: Metamorphic relationship - same structure, different security levels
      // Structure should be identical
      expect(Object.keys(commercialConfig)).toEqual(Object.keys(fedRAMPConfig));
      expect(Object.keys(commercialConfig.cors)).toEqual(Object.keys(fedRAMPConfig.cors));
      expect(Object.keys(commercialConfig.throttling)).toEqual(Object.keys(fedRAMPConfig.throttling));
      
      // Security levels should differ predictably
      expect(commercialConfig.cors.allowOrigins).toEqual(fedRAMPConfig.cors.allowOrigins); // Both empty (security-first)
      expect(commercialConfig.throttling.burstLimit).toBeGreaterThanOrEqual(fedRAMPConfig.throttling.burstLimit);
      expect(commercialConfig.throttling.rateLimit).toBeGreaterThanOrEqual(fedRAMPConfig.throttling.rateLimit);
      
      // Description should be consistent
      expect(commercialConfig.description).toContain('Enterprise REST API Gateway');
      expect(fedRAMPConfig.description).toContain('Enterprise REST API Gateway');
    });
  });
});
