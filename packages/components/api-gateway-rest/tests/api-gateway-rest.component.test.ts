import { jest } from '@jest/globals';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';

import { ApiGatewayRestComponent } from '../src/api-gateway-rest.component.ts';
import { ApiGatewayRestConfigBuilder } from '../src/api-gateway-rest.builder.ts';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

const baseContext = (overrides: Partial<Mutable<ComponentContext>> = {}): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'test',
  complianceFramework: 'commercial',
  scope: new App(),
  region: 'us-east-1',
  accountId: '123456789012',
  ...overrides,
});

const baseSpec = (config: Record<string, unknown> = {}): ComponentSpec => ({
  name: 'api-gateway-rest-test',
  type: 'api-gateway-rest',
  config,
});

const freezeTime = () => {
  const fixedDate = new Date('2025-01-01T00:00:00.000Z');
  jest.useFakeTimers();
  jest.setSystemTime(fixedDate);
};

describe('ApiGatewayRestConfigBuilder', () => {
  beforeEach(() => freezeTime());
  afterEach(() => jest.useRealTimers());

  it('merges platform defaults for commercial framework', () => {
    // Test Metadata: {"id":"TP-api-gateway-rest-config-001","level":"unit","capability":"Config builder merges platform defaults","oracle":"exact","invariants":["Disable execute endpoint honours manifest","Throttling matches commercial baseline"],"fixtures":["baseContext","baseSpec"],"inputs":{"shape":"ComponentSpec without overrides","notes":"Uses commercial framework"},"risks":["Mismatched throttling defaults"],"dependencies":["config/commercial.yml"],"evidence":["disableExecuteApiEndpoint=false","throttling matches commercial"],"compliance_refs":["std://platform-configuration"],"ai_generated":false,"human_reviewed_by":""}
    const context = baseContext();
    const spec = baseSpec();
    const builder = new ApiGatewayRestConfigBuilder(context, spec);

    const config = builder.build();

    expect(config.disableExecuteApiEndpoint).toBe(false);
    expect(config.throttling).toMatchObject({ rateLimit: 1000, burstLimit: 2000 });
    expect(config.logging).toMatchObject({ retentionInDays: 90, executionLoggingLevel: 'INFO' });
    expect(config.monitoring?.thresholds).toMatchObject({ errorRate5xxPercent: 1 });
  });

  it('applies fedramp-high platform policy defaults', () => {
    // Test Metadata: {"id":"TP-api-gateway-rest-config-002","level":"unit","capability":"Config builder enforces FedRAMP High defaults","oracle":"exact","invariants":["Execute endpoint disabled","FedRAMP throttling applied"],"fixtures":["baseContext","baseSpec"],"inputs":{"shape":"ComponentSpec without overrides","notes":"FedRAMP High compliance framework"},"risks":["Weak compliance guardrails"],"dependencies":["config/fedramp-high.yml"],"evidence":["DisableExecuteApiEndpoint=true","burstLimit=50"],"compliance_refs":["std://platform-configuration","std://platform-logging"],"ai_generated":false,"human_reviewed_by":""}
    const context = baseContext({ complianceFramework: 'fedramp-high' });
    const spec = baseSpec();
    const builder = new ApiGatewayRestConfigBuilder(context, spec);

    const config = builder.build();

    expect(config.disableExecuteApiEndpoint).toBe(true);
    expect(config.throttling).toMatchObject({ rateLimit: 100, burstLimit: 50 });
    expect(config.logging).toMatchObject({ retentionInDays: 2555, executionLoggingLevel: 'ERROR' });
    expect(config.tracing?.xrayEnabled ?? true).toBe(true);
  });
});

describe('ApiGatewayRestComponent', () => {
  beforeEach(() => freezeTime());
  afterEach(() => jest.useRealTimers());

  it('synthesizes REST API with logging, throttling, and capability contract', () => {
    // Test Metadata: {"id":"TP-api-gateway-rest-component-001","level":"unit","capability":"Synthesis configures REST API","oracle":"contract","invariants":["Access logging enabled","Capability matches api:rest contract"],"fixtures":["Stack","ComponentContext"],"inputs":{"shape":"Commercial context with minimal overrides","notes":"Validates defaults"},"risks":["Missing access logs","Invalid capability shape"],"dependencies":["aws-cdk-lib"],"evidence":["AccessLogSetting present","Capability includes apiId"],"compliance_refs":["std://platform-logging","std://platform-capability"],"ai_generated":false,"human_reviewed_by":""}
    const app = new App();
    const stack = new Stack(app, 'ApiGatewayRestStack');
    const context = baseContext({ scope: stack, complianceFramework: 'commercial' });
    const spec = baseSpec({ description: 'Commercial API' });

    const component = new ApiGatewayRestComponent(stack, spec.name, context, spec);
    component.synth();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: Match.stringLikeRegexp('test-service-api-gateway-rest-test'),
      EndpointConfiguration: { Types: ['REGIONAL'] },
    });

    template.hasResourceProperties('AWS::ApiGateway::Stage', {
      AccessLogSetting: Match.objectLike({}),
      MethodSettings: Match.arrayWith([
        Match.objectLike({
          LoggingLevel: 'INFO',
        }),
      ]),
    });

    const capabilities = component.getCapabilities();
    expect(capabilities['api:rest']).toMatchObject({
      apiId: expect.any(String),
      endpointUrl: expect.stringContaining('https://'),
      stageName: 'test',
    });
  });

  it('enforces FedRAMP High execute-api disablement', () => {
    // Test Metadata: {"id":"TP-api-gateway-rest-component-002","level":"unit","capability":"FedRAMP high disables execute endpoint","oracle":"exact","invariants":["DisableExecuteApiEndpoint set"],"fixtures":["Stack","ComponentContext"],"inputs":{"shape":"FedRAMP High context","notes":"No overrides provided"},"risks":["Unrestricted public endpoint"],"dependencies":["config/fedramp-high.yml"],"evidence":["DisableExecuteApiEndpoint=true"],"compliance_refs":["std://platform-configuration"],"ai_generated":false,"human_reviewed_by":""}
    const app = new App();
    const stack = new Stack(app, 'ApiGatewayRestFedrampStack');
    const context = baseContext({
      scope: stack,
      complianceFramework: 'fedramp-high',
      environment: 'prod',
    });
    const spec = baseSpec();

    const component = new ApiGatewayRestComponent(stack, spec.name, context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      DisableExecuteApiEndpoint: true,
    });
  });

  it('applies FedRAMP High logging and throttling hardening', () => {
    // Test Metadata: {"id":"TP-api-gateway-rest-component-003","level":"unit","capability":"FedRAMP high logging and throttling","oracle":"exact","invariants":["Retention 7 years","Stage enforces FedRAMP throttling"],"fixtures":["Stack","ComponentContext"],"inputs":{"shape":"FedRAMP High context","notes":"No overrides provided"},"risks":["Non-compliant access logging","Incorrect throttling limits"],"dependencies":["config/fedramp-high.yml"],"evidence":["LogGroup RetentionInDays=2555","Stage throttling <= FedRAMP limits"],"compliance_refs":["std://platform-logging","std://platform-configuration"],"ai_generated":false,"human_reviewed_by":""}
    const app = new App();
    const stack = new Stack(app, 'ApiGatewayRestFedrampLoggingStack');
    const context = baseContext({
      scope: stack,
      complianceFramework: 'fedramp-high',
      environment: 'prod',
    });
    const spec = baseSpec();

    const component = new ApiGatewayRestComponent(stack, spec.name, context, spec);
    component.synth();

    const template = Template.fromStack(stack);

    const logGroups = template.findResources('AWS::Logs::LogGroup');
    const retentionValues = Object.values(logGroups).map((resource) => resource.Properties?.RetentionInDays);
    expect(retentionValues.some((value) => typeof value === 'number' && value >= 2555)).toBe(true);

    template.hasResourceProperties('AWS::ApiGateway::Stage', {
      MethodSettings: Match.arrayWith([
        Match.objectLike({
          ThrottlingBurstLimit: 50,
          ThrottlingRateLimit: 100,
          LoggingLevel: 'ERROR',
        }),
      ]),
    });
  });
});
