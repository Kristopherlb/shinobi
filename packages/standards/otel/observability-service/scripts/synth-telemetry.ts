import * as cdk from 'aws-cdk-lib';
import { BaseComponent, ComponentContext, ComponentSpec } from '@shinobi/core';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
import { ObservabilityService } from '../src/observability.service.js';
import type { ComponentCapabilities } from '@shinobi/core/platform/contracts/component-interfaces.js';

type TelemetryComponentProps = {
  context: ComponentContext;
  spec: ComponentSpec;
};

class MockTelemetryComponent extends BaseComponent {
  constructor(scope: cdk.Stack, id: string, props: TelemetryComponentProps) {
    super(scope, id, props.context, props.spec);
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

const app = new cdk.App();
const stack = new cdk.Stack(app, 'ObservabilityTelemetryDemo');

const componentContext: ComponentContext = {
  serviceName: 'demo-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: 'commercial',
  region: 'us-east-1',
  account: '123456789012',
  scope: stack
} as ComponentContext;

const componentSpec: ComponentSpec = {
  name: 'demo-component',
  type: 'mock-component',
  config: {}
};

const component = new MockTelemetryComponent(stack, 'DemoComponent', {
  context: componentContext,
  spec: componentSpec
});
component.synth();

const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

const serviceContext: PlatformServiceContext = {
  serviceName: 'demo-service',
  environment: 'dev',
  complianceFramework: 'commercial',
  region: 'us-east-1',
  serviceRegistry: {
    observability: { enabled: true }
  },
  logger
};

const observabilityService = new ObservabilityService(serviceContext);
observabilityService.apply(component);

app.synth();
