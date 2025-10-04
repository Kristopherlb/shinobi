/**
 * ObservabilityService Telemetry Integration Tests
 *
 * Validates that telemetry directives published via component capabilities are
 * materialised into CloudWatch resources by the ObservabilityService.
 */

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ObservabilityService } from './observability.service.js';
import { BaseComponent, ComponentContext, ComponentSpec } from '@shinobi/core';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
import type { ComponentCapabilities } from '@shinobi/core/platform/contracts/component-interfaces.ts';

class MockTelemetryComponent extends BaseComponent {
  constructor(scope: cdk.Stack, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.registerCapability('observability:mock-component', {
      telemetry: {
        metrics: [
          {
            id: 'mock-requests',
            namespace: 'AWS/MockService',
            metricName: 'Requests',
            statistic: 'Sum',
            periodSeconds: 60,
            dimensions: {
              ServiceName: this.context.serviceName
            }
          }
        ],
        alarms: [
          {
            id: 'request-burst',
            metricId: 'mock-requests',
            alarmName: 'demo-burst',
            threshold: 100,
            comparisonOperator: 'gt',
            evaluationPeriods: 2,
            treatMissingData: 'notBreaching',
            alarmDescription: 'Request count burst detected'
          }
        ],
        dashboards: [
          {
            id: 'mock-dashboard',
            name: 'demo-dashboard',
            description: 'Mock service observability dashboard',
            widgets: [
              {
                id: 'mock-requests-widget',
                type: 'metric',
                title: 'Request Volume',
                metrics: [
                  {
                    metricId: 'mock-requests',
                    label: 'Requests',
                    stat: 'Sum'
                  }
                ]
              }
            ]
          }
        ]
      }
    });
  }

  public getCapabilities(): ComponentCapabilities {
    return this.capabilities;
  }

  public getType(): string {
    return 'mock-component';
  }
}

describe('ObservabilityService__TelemetryDirectives__CloudWatchMaterialisation', () => {
  it('Telemetry__MockComponent__CreatesAlarmsAndDashboard', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TelemetryStack');

    const componentContext: ComponentContext = {
      serviceName: 'demo-service',
      owner: 'platform-team',
      environment: 'dev',
      complianceFramework: 'commercial',
      region: 'us-east-1',
      account: '123456789012',
      scope: stack,
      tags: {
        'service-name': 'demo-service'
      }
    } as ComponentContext;

    const componentSpec: ComponentSpec = {
      name: 'demo-component',
      type: 'mock-component',
      config: {}
    };

    const component = new MockTelemetryComponent(stack, 'DemoComponent', componentContext, componentSpec);
    component.synth();

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    const serviceContext: PlatformServiceContext = {
      serviceName: 'demo-service',
      environment: 'dev',
      complianceFramework: 'commercial',
      region: 'us-east-1',
      serviceRegistry: {} as any,
      logger
    };

    const observabilityService = new ObservabilityService(serviceContext);
    observabilityService.apply(component);

    const template = Template.fromStack(stack);

    const alarmResources = template.findResources('AWS::CloudWatch::Alarm');
    const dashboardResources = template.findResources('AWS::CloudWatch::Dashboard');

    expect(Object.keys(alarmResources).length).toBeGreaterThan(0);
    expect(Object.keys(dashboardResources).length).toBeGreaterThan(0);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Telemetry directives applied for component without dedicated handler'),
      expect.objectContaining({ componentType: 'mock-component' })
    );

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'demo-burst',
      AlarmDescription: 'Request count burst detected'
    });

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'demo-dashboard'
    });
  });
});
