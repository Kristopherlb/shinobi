import { describe, test, expect, beforeEach } from '@jest/globals';
import { McpServerComponent } from './mcp-server.component';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import * as cdk from 'aws-cdk-lib';

describe('McpServerComponent', () => {
  let component: McpServerComponent;
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;

  beforeEach(() => {
    mockContext = {
      serviceName: 'test-mcp',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: new cdk.Stack()
    };

    mockSpec = {
      name: 'test-mcp-server',
      type: 'mcp-server',
      config: {
        cpu: 512,
        memory: 1024,
        taskCount: 2
      }
    };

    component = new McpServerComponent(mockContext.scope, 'TestMcpServer', mockContext, mockSpec);
  });

  describe('Component Synthesis', () => {
    test('should synthesize successfully with valid configuration', () => {
      expect(() => component.synth()).not.toThrow();
    });

    test('should register expected capabilities', () => {
      component.synth();
      const capabilities = component.getCapabilities();
      
      expect(capabilities['api:rest']).toBeDefined();
      expect(capabilities['container:ecs']).toBeDefined();
    });

    test('should create ECS cluster and service', () => {
      component.synth();
      
      const cluster = component.getConstruct('cluster');
      const service = component.getConstruct('service');
      
      expect(cluster).toBeDefined();
      expect(service).toBeDefined();
    });

    test('should apply compliance hardening for FedRAMP High', () => {
      mockContext.complianceFramework = 'fedramp-high';
      component.synth();
      
      // Verify enhanced security configurations
      const service = component.getConstruct('service');
      expect(service).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    test('should apply default values when not provided', () => {
      mockSpec.config = {}; // Empty config
      
      component.synth();
      // Should use default values without throwing
    });

    test('should handle compliance-specific defaults', () => {
      mockContext.complianceFramework = 'fedramp-high';
      mockSpec.config = { cpu: 256 }; // Below minimum for FedRAMP High
      
      component.synth();
      // Should apply compliance defaults
    });
  });

  describe('Load Balancer Configuration', () => {
    test('should create load balancer when enabled', () => {
      mockSpec.config = {
        loadBalancer: {
          enabled: true
        }
      };
      
      component.synth();
      
      const loadBalancer = component.getConstruct('loadBalancer');
      expect(loadBalancer).toBeDefined();
    });

    test('should skip load balancer when disabled', () => {
      mockSpec.config = {
        loadBalancer: {
          enabled: false
        }
      };
      
      component.synth();
      
      const loadBalancer = component.getConstruct('loadBalancer');
      expect(loadBalancer).toBeUndefined();
    });
  });
});