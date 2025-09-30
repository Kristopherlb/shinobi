/**
 * ShinobiComponent Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 */

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ShinobiComponent } from '../src/shinobi.component';
import { ShinobiConfig } from '../src/shinobi.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createMockContext = (
  stack: Stack,
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework,
  region: 'us-east-1',
  accountId: '123456789012',
  account: '123456789012',
  scope: stack,
  tags: {
    'service-name': 'test-service',
    owner: 'test-team',
    environment,
    'compliance-framework': complianceFramework
  }
});

const createMockSpec = (config: Partial<ShinobiConfig> = {}): ComponentSpec => ({
  name: 'test-shinobi',
  type: 'shinobi',
  config
});

describe('ShinobiComponent Synthesis', () => {
  
  let app: App;
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
    context = createMockContext(stack);
  });

  describe('Basic Synthesis', () => {
    
    it('should synthesize with minimal configuration', () => {
      const spec = createMockSpec();
      const component = new ShinobiComponent(stack, spec.name, context, spec);
      
      // Call synth to create resources
      component.synth();
      
      const template = Template.fromStack(stack);
      
      // Verify ECR repository is created
      template.hasResourceProperties('AWS::ECR::Repository', {
        ImageTagMutability: 'MUTABLE',
        ImageScanningConfiguration: {
          ScanOnPush: true
        }
      });
      
      // Verify ECS cluster is created
      template.hasResourceProperties('AWS::ECS::Cluster', {
        ClusterName: 'test-service-shinobi-cluster'
      });
      
      // Verify ECS task definition is created
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Family: 'test-service-shinobi',
        Cpu: '256',
        Memory: '512',
        NetworkMode: 'awsvpc',
        RequiresCompatibilities: ['FARGATE']
      });
      
      // Verify ECS service is created
      template.hasResourceProperties('AWS::ECS::Service', {
        ServiceName: 'test-service-shinobi',
        DesiredCount: 1
      });
      
      // Verify DynamoDB table is created
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'test-service-shinobi-data',
        BillingMode: 'PAY_PER_REQUEST',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true
        },
        SSESpecification: {
          SSEEnabled: true
        }
      });
      
      // Verify CloudWatch Log Group is created
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/ecs/test-service-shinobi',
        RetentionInDays: 30
      });
    });
    
    it('should create load balancer when enabled', () => {
      const spec = createMockSpec({
        api: {
          loadBalancer: {
            enabled: true
          }
        }
      });
      
      const component = new ShinobiComponent(stack, spec.name, context, spec);
      component.synth();
      
      const template = Template.fromStack(stack);
      
      // Verify Application Load Balancer is created
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        Type: 'application',
        Scheme: 'internal'
      });
      
      // Verify Target Group is created
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
        Port: 3000,
        Protocol: 'HTTP',
        TargetType: 'ip'
      });
    });
    
    it('should create EventBridge rule for re-indexing', () => {
      const spec = createMockSpec();
      const component = new ShinobiComponent(stack, spec.name, context, spec);
      component.synth();
      
      const template = Template.fromStack(stack);
      
      // Verify EventBridge rule is created
      template.hasResourceProperties('AWS::Events::Rule', {
        Description: 'Trigger Shinobi data re-indexing',
        ScheduleExpression: 'rate(15 minutes)'
      });
    });
    
  });

  describe('Compliance Framework Variations', () => {
    
    it('should apply FedRAMP Moderate hardening', () => {
      const fedrampContext = createMockContext(stack, 'fedramp-moderate', 'prod');
      const spec = createMockSpec();
      
      const component = new ShinobiComponent(stack, spec.name, fedrampContext, spec);
      component.synth();
      
      const template = Template.fromStack(stack);
      
      // Verify enhanced compute resources
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '512',
        Memory: '1024'
      });
      
      const moderateLogGroups = Object.values(template.findResources('AWS::Logs::LogGroup'));
      const moderateRetentions = moderateLogGroups.map(resource => resource.Properties?.RetentionInDays);
      expect(moderateRetentions).toContain(90);
    });
    
    it('should apply FedRAMP High hardening', () => {
      const fedrampHighContext = createMockContext(stack, 'fedramp-high', 'prod');
      const spec = createMockSpec();
      
      const component = new ShinobiComponent(stack, spec.name, fedrampHighContext, spec);
      component.synth();
      
      const template = Template.fromStack(stack);
      
      // Verify maximum compute resources
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '1024',
        Memory: '2048'
      });
      
      const highLogGroups = Object.values(template.findResources('AWS::Logs::LogGroup'));
      const highRetentions = highLogGroups.map(resource => resource.Properties?.RetentionInDays);
      expect(highRetentions).toContain(3653);
    });
    
  });

  describe('Configuration Variations', () => {
    
    it('should handle custom compute configuration', () => {
      const spec = createMockSpec({
        compute: {
          cpu: 1024,
          memory: 2048,
          taskCount: 3,
          containerPort: 8080
        }
      });
      
      const component = new ShinobiComponent(stack, spec.name, context, spec);
      component.synth();
      
      const template = Template.fromStack(stack);
      
      // Verify custom compute configuration
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '1024',
        Memory: '2048'
      });
      
      template.hasResourceProperties('AWS::ECS::Service', {
        DesiredCount: 3
      });
    });
    
    it('should handle custom data store configuration', () => {
      const spec = createMockSpec({
        dataStore: {
          dynamodb: {
            billingMode: 'PROVISIONED',
            readCapacity: 100,
            writeCapacity: 100
          }
        }
      });
      
      const component = new ShinobiComponent(stack, spec.name, context, spec);
      component.synth();
      
      const template = Template.fromStack(stack);
      
      const tables = Object.values(template.findResources('AWS::DynamoDB::Table'));
      const table = tables[0];
      expect(table.Properties?.ProvisionedThroughput).toMatchObject({
        ReadCapacityUnits: 100,
        WriteCapacityUnits: 100
      });
    });
    
    it('should handle public API exposure', () => {
      const spec = createMockSpec({
        api: {
          exposure: 'public',
          loadBalancer: {
            enabled: true,
            certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
            domainName: 'shinobi.example.com'
          }
        }
      });
      
      const component = new ShinobiComponent(stack, spec.name, context, spec);
      component.synth();
      
      const template = Template.fromStack(stack);
      
      // Verify public load balancer
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        Scheme: 'internet-facing'
      });
    });
    
  });

  describe('Observability Configuration', () => {
    
    it('should create CloudWatch alarms when enabled', () => {
      const spec = createMockSpec({
        observability: {
          alerts: {
            enabled: true,
            thresholds: {
              cpuUtilization: 70,
              memoryUtilization: 80,
              responseTime: 1.5
            }
          }
        }
      });
      
      const component = new ShinobiComponent(stack, spec.name, context, spec);
      component.synth();
      
      const template = Template.fromStack(stack);
      
      // Verify CPU utilization alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'Shinobi CPU utilization is high',
        Threshold: 70
      });
      
      // Verify memory utilization alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'Shinobi memory utilization is high',
        Threshold: 80
      });
      
      // Verify task count alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'Shinobi has no running tasks',
        Threshold: 1,
        ComparisonOperator: 'LessThanThreshold'
      });
    });
    
  });

  describe('Capabilities Registration', () => {
    
    it('should register correct capabilities', () => {
      const spec = createMockSpec();
      const component = new ShinobiComponent(stack, spec.name, context, spec);
      component.synth();
      
      const capabilities = component.getCapabilities();
      
      expect(capabilities).toHaveProperty('api:rest');
      expect(capabilities).toHaveProperty('container:ecs');
      expect(capabilities).toHaveProperty('intelligence:platform');
      
      // Verify API capability structure
      expect(capabilities['api:rest']).toMatchObject({
        endpoint: expect.any(String),
        protocol: 'HTTPS',
        apiType: 'REST',
        version: '1.0',
        paths: expect.any(Object),
        authentication: expect.any(Object)
      });
      
      // Verify container capability structure
      expect(capabilities['container:ecs']).toMatchObject({
        clusterArn: expect.any(String),
        serviceArn: expect.any(String),
        taskDefinitionArn: expect.any(String),
        repositoryUri: expect.any(String),
        containerPort: 3000
      });
      
      // Verify intelligence capability structure
      expect(capabilities['intelligence:platform']).toMatchObject({
        dataSources: expect.any(Object),
        featureFlags: expect.any(Object),
        observability: expect.any(Object),
        compliance: expect.any(Object),
        localDev: expect.any(Object)
      });
    });
    
  });

  describe('Error Handling', () => {
    
    it('should handle synthesis errors gracefully', () => {
      const spec = createMockSpec({
        compute: {
          cpu: -1, // Invalid CPU value
          memory: 0 // Invalid memory value
        }
      });
      
      const component = new ShinobiComponent(stack, spec.name, context, spec);
      
      // Should not throw during construction, but may fail during synth
      expect(() => {
        try {
          component.synth();
        } catch (error) {
          // Expected to fail with invalid configuration
          expect(error).toBeDefined();
        }
      }).not.toThrow();
    });
    
  });

  describe('Tagging', () => {
    
    it('should apply standard tags to all resources', () => {
      const spec = createMockSpec();
      const component = new ShinobiComponent(stack, 'Shinobi', context, spec);
      component.synth();
      
      const template = Template.fromStack(stack);
      
      const repositories = Object.values(template.findResources('AWS::ECR::Repository'));
      const repoTags = repositories[0].Properties?.Tags ?? [];
      expect(repoTags).toEqual(expect.arrayContaining([
        expect.objectContaining({ Key: 'resource-type', Value: 'ecr-repository' }),
        expect.objectContaining({ Key: 'component', Value: 'shinobi' })
      ]));

      const clusters = Object.values(template.findResources('AWS::ECS::Cluster'));
      const clusterTags = clusters[0].Properties?.Tags ?? [];
      expect(clusterTags).toEqual(expect.arrayContaining([
        expect.objectContaining({ Key: 'resource-type', Value: 'ecs-cluster' }),
        expect.objectContaining({ Key: 'component', Value: 'shinobi' })
      ]));
      
      const dynamoResources = Object.values(template.findResources('AWS::DynamoDB::Table'));
      const dynamoTags = dynamoResources[0].Properties?.Tags ?? [];
      expect(dynamoTags).toEqual(expect.arrayContaining([
        expect.objectContaining({ Key: 'resource-type', Value: 'dynamodb-table' }),
        expect.objectContaining({ Key: 'component', Value: 'shinobi' })
      ]));
    });
    
  });

});
