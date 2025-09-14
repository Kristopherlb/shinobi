import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { vpcComponent } from '../src/vpc.component';
import { vpcBuilder } from '../src/vpc.builder';

describe('vpcComponent Observability', () => {
  let app: App;
  let stack: Stack;
  let builder: vpcBuilder;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
    builder = new vpcBuilder();
  });

  describe('CloudWatch Alarms', () => {
    it('should create health check alarm', () => {
      const config = builder.build();
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Verify health check alarm is created
      // template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
      // template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      //   AlarmName: 'vpc-health-check',
      //   ComparisonOperator: 'LessThanThreshold',
      //   Threshold: 1,
      //   EvaluationPeriods: 2
      // });
    });

    it('should create performance alarms', () => {
      const config = builder.build({ monitoring: true });
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Verify performance alarms are created
      // Add performance alarm assertions
    });
  });

  describe('Logging', () => {
    it('should enable access logging', () => {
      const config = builder.build({ logging: true });
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Verify access logging is enabled
      // Add logging assertions
    });

    it('should configure log retention based on framework', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Verify log retention is configured correctly
      // Add retention assertions
    });
  });

  describe('Metrics', () => {
    it('should create custom metrics', () => {
      const config = builder.build();
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Verify custom metrics are created
      // Add metrics assertions
    });

    it('should configure metric retention based on framework', () => {
      const config = builder.build({}, 'fedramp-high');
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Verify metric retention is configured correctly
      // Add retention assertions
    });
  });
});
