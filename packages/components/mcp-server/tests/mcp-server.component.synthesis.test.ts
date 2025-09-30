/**
 * MCP Server component synthesis tests following the platform testing standard.
 */

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { McpServerComponent } from '../mcp-server.component';
import { McpServerConfig } from '../mcp-server.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createContext = (
  stack: Stack,
  compliance: ComponentContext['complianceFramework'] = 'commercial',
  environment = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework: compliance,
  region: 'us-east-1',
  account: '123456789012',
  accountId: '123456789012',
  scope: stack,
  tags: {
    'service-name': 'test-service',
    owner: 'test-team',
    environment,
    'compliance-framework': compliance
  }
});

const createSpec = (config: Partial<McpServerConfig> = {}): ComponentSpec => ({
  name: 'mcp',
  type: 'mcp-server',
  config
});

describe('McpServerComponent synthesis', () => {
  it('synthesizes commercial defaults', () => {
    const app = new App();
    const stack = new Stack(app, 'DefaultStack');
    const context = createContext(stack, 'commercial');
    const spec = createSpec();

    const component = new McpServerComponent(stack, spec.name, context, spec);
    component.synth();
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::ECR::Repository', Match.objectLike({
      RepositoryName: 'platform/mcp-server'
    }));

    template.hasResourceProperties('AWS::ECS::TaskDefinition', Match.objectLike({
      Cpu: '512',
      Memory: '1024'
    }));

    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: 30
    }));

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', Match.objectLike({
      Scheme: 'internal'
    }));
  });

  it('disables load balancer when configured', () => {
    const app = new App();
    const stack = new Stack(app, 'NoAlbStack');
    const context = createContext(stack, 'commercial');
    const spec = createSpec({
      loadBalancer: {
        enabled: false
      }
    });

    const component = new McpServerComponent(stack, spec.name, context, spec);
    component.synth();
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 0);
    template.hasResourceProperties('AWS::ECS::Service', Match.objectLike({
      DesiredCount: 2
    }));
  });

  it('honours monitoring thresholds from configuration', () => {
    const app = new App();
    const stack = new Stack(app, 'AlarmsStack');
    const context = createContext(stack, 'commercial');
    const spec = createSpec({
      monitoring: {
        enabled: true,
        detailedMetrics: true,
        alarms: {
          cpuUtilization: 60,
          memoryUtilization: 65,
          responseTime: 1
        }
      }
    });

    const component = new McpServerComponent(stack, spec.name, context, spec);
    component.synth();
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
      Threshold: 60,
      AlarmDescription: 'MCP server CPU utilization is high'
    }));

    template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
      Threshold: 65,
      AlarmDescription: 'MCP server memory utilization is high'
    }));

    template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
      Threshold: 1,
      AlarmDescription: 'MCP server API response time is high'
    }));
  });
});
