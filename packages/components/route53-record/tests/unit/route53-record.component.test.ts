/**
 * Unit tests for Route53RecordComponent
 * 
 * Tests component synthesis, construct creation, and capability exposure.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { createTestApp, createMockedServices } from '../../../../core/src/platform/contracts/__tests__/test-helpers.js';
import { Route53RecordComponent } from '../../src/route53-record.component';
import { ComponentContext, ComponentSpec } from '../../../@shinobi/core/component-interfaces.js';

describe('Route53RecordComponent', () => {
  let app: App;
  let stack: Stack;
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;
  let mockedServices: ReturnType<typeof createMockedServices>;

  beforeEach(() => {
    app = createTestApp();
    stack = new Stack(app, 'Route53TestStack');
    mockedServices = createMockedServices();
    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012'
    };

    mockSpec = {
      name: 'test-dns-record',
      type: 'route53-record',
      config: {
        record: {
          recordName: 'api.example.com',
          recordType: 'A',
          zoneName: 'example.com.',
          hostedZoneId: 'Z1234567890', // Required for tests to avoid fromLookup
          target: '192.168.1.100'
        }
      }
    };
  });

  // Helper function to create and synthesize component
  const createAndSynthComponent = (spec: ComponentSpec = mockSpec): Route53RecordComponent => {
    const component = new Route53RecordComponent(stack, 'TestDnsRecord', mockContext, spec, mockedServices);
    component.synth();
    return component;
  };

  describe('Component Synthesis', () => {
    it('should create A record with basic configuration', () => {
      createAndSynthComponent();
      
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: 'api.example.com.',
        Type: 'A',
        ResourceRecords: ['192.168.1.100'],
        TTL: '300'
      });
    });

    it('should create A record with custom TTL and comment', () => {
      mockSpec.config = {
        record: {
          recordName: 'api.example.com',
          recordType: 'A',
          zoneName: 'example.com.',
          hostedZoneId: 'Z1234567890',
          target: '192.168.1.100',
          ttl: 600,
          comment: 'API endpoint record'
        }
      };

      createAndSynthComponent();
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: 'api.example.com.',
        Type: 'A',
        ResourceRecords: ['192.168.1.100'],
        TTL: '600',
        Comment: 'API endpoint record'
      });
    });

    it('should create AAAA record', () => {
      mockSpec.config = {
        record: {
          recordName: 'api.example.com',
          recordType: 'AAAA',
          zoneName: 'example.com.',
          hostedZoneId: 'Z1234567890',
          target: '2001:db8::1'
        }
      };

      createAndSynthComponent();
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: 'api.example.com.',
        Type: 'AAAA',
        ResourceRecords: ['2001:db8::1']
      });
    });

    it('should create CNAME record', () => {
      mockSpec.config = {
        record: {
          recordName: 'www.example.com',
          recordType: 'CNAME',
          zoneName: 'example.com.',
          hostedZoneId: 'Z1234567890',
          target: 'example.com'
        }
      };

      createAndSynthComponent();
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: 'www.example.com.',
        Type: 'CNAME',
        ResourceRecords: ['example.com']
      });
    });

    it('should create MX record', () => {
      mockSpec.config = {
        record: {
          recordName: 'example.com',
          recordType: 'MX',
          zoneName: 'example.com.',
          hostedZoneId: 'Z1234567890',
          target: ['10 mail1.example.com', '20 mail2.example.com']
        }
      };

      createAndSynthComponent();
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: 'example.com.',
        Type: 'MX',
        ResourceRecords: ['10 mail1.example.com', '20 mail2.example.com']
      });
    });

    it('should create TXT record', () => {
      mockSpec.config = {
        record: {
          recordName: '_verification.example.com',
          recordType: 'TXT',
          zoneName: 'example.com.',
          hostedZoneId: 'Z1234567890',
          target: ['"v=spf1 include:_spf.google.com ~all"']
        }
      };

      createAndSynthComponent();
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: '_verification.example.com.',
        Type: 'TXT',
        ResourceRecords: ['"\\"v=spf1 include:_spf.google.com ~all\\""']
      });
    });

    it('should create NS record', () => {
      mockSpec.config = {
        record: {
          recordName: 'subdomain.example.com',
          recordType: 'NS',
          zoneName: 'example.com.',
          hostedZoneId: 'Z1234567890',
          target: ['ns1.example.com', 'ns2.example.com']
        }
      };

      createAndSynthComponent();
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: 'subdomain.example.com.',
        Type: 'NS',
        ResourceRecords: ['ns1.example.com', 'ns2.example.com']
      });
    });

    it('should create SRV record', () => {
      mockSpec.config = {
        record: {
          recordName: '_sip._tcp.example.com',
          recordType: 'SRV',
          zoneName: 'example.com.',
          hostedZoneId: 'Z1234567890',
          target: ['10 5 5060 sip.example.com']
        }
      };

      createAndSynthComponent();
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: '_sip._tcp.example.com.',
        Type: 'SRV',
        ResourceRecords: ['10 5 5060 sip.example.com']
      });
    });
  });

  describe('Multiple Target Values', () => {
    it('should create A record with multiple IP addresses', () => {
      mockSpec.config = {
        record: {
          recordName: 'api.example.com',
          recordType: 'A',
          zoneName: 'example.com.',
          hostedZoneId: 'Z1234567890',
          target: ['192.168.1.1', '192.168.1.2', '192.168.1.3']
        }
      };

      createAndSynthComponent();
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: 'api.example.com.',
        Type: 'A',
        ResourceRecords: ['192.168.1.1', '192.168.1.2', '192.168.1.3']
      });
    });
  });

  // Reference resolution is now handled by the platform's ResolverEngine
  // No component-level reference resolution testing needed

  describe('Component Interface', () => {
    it('should expose record construct via getConstruct', () => {
      const component = createAndSynthComponent();
      const record = component.getConstruct('record');

      expect(record).toBeDefined();
      // RecordSet construct doesn't expose recordName directly - verify via capabilities instead
      const capabilities = component.getCapabilities();
      expect(capabilities['dns:record'].recordName).toBe('api.example.com');
    });

    it('should expose main construct via getConstruct', () => {
      const component = createAndSynthComponent();
      const record = component.getConstruct('main');

      expect(record).toBeDefined();
      // RecordSet construct doesn't expose recordName directly - verify via capabilities instead
      const capabilities = component.getCapabilities();
      expect(capabilities['dns:record'].recordName).toBe('api.example.com');
    });

    it('should throw error for unknown construct handle', () => {
      const component = createAndSynthComponent();
      
      expect(() => component.getConstruct('unknown')).toThrow('Unknown construct handle: unknown');
    });

    it('should expose dns:record capability', () => {
      const component = createAndSynthComponent();
      const capabilities = component.getCapabilities();

      expect(capabilities['dns:record']).toBeDefined();
      expect(capabilities['dns:record'].recordName).toBe('api.example.com');
      expect(capabilities['dns:record'].recordType).toBe('A');
      expect(capabilities['dns:record'].zoneName).toBe('example.com.');
      expect(capabilities['dns:record'].target).toBe('192.168.1.100');
      expect(capabilities['dns:record'].ttl).toBe(300);
    });

    it('should expose component outputs', () => {
      const component = createAndSynthComponent();
      const outputs = component.getOutputs();

      expect(outputs.recordName).toBe('api.example.com');
      expect(outputs.recordType).toBe('A');
      expect(outputs.zoneName).toBe('example.com.');
      expect(outputs.target).toBe('192.168.1.100');
      expect(outputs.ttl).toBe(300);
    });
  });

  describe('Component Type and Synthesis', () => {
    it('should return correct component type', () => {
      const component = createAndSynthComponent();
      
      expect(component.getType()).toBe('route53-record');
    });

    it('should complete synthesis without errors', () => {
      const component = new Route53RecordComponent(stack, 'TestDnsRecord', mockContext, mockSpec);
      
      expect(() => component.synth()).not.toThrow();
    });
  });

  // Error handling: Validation happens in ConfigBuilder.buildSync(), not in component constructor
  // Component constructor only throws if synthesis fails, which is tested in synthesis tests

  // Hosted zone creation is no longer supported - zones must be created separately
  // This enforces proper separation of concerns
});
