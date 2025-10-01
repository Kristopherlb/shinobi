/**
 * Simple test to validate VPC component generation
 */

import { App, Stack } from 'aws-cdk-lib';
import { VpcComponent } from './vpc.component.js';
import { VpcConfig } from './vpc.builder.js';
import { ComponentContext, ComponentSpec } from '../@shinobi/core/component-interfaces.js';

// Mock context
const mockContext: ComponentContext = {
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: 'fedramp-moderate',
  scope: {} as any,
  region: 'us-east-1',
  accountId: '123456789012',
  serviceLabels: {
    'owner': 'test-team',
    'version': '1.0.0'
  }
};

// Mock spec
const mockSpec: ComponentSpec = {
  name: 'test-vpc',
  type: 'vpc',
  config: {
    cidr: '10.0.0.0/16',
    maxAzs: 2,
    natGateways: 1,
    flowLogs: {
      enabled: true,
      retentionInDays: 30,
      removalPolicy: 'destroy'
    }
  }
};

// Test the component
const app = new App();
const stack = new Stack(app, 'TestStack');

try {
  console.log('🚀 Testing VPC Component Generation...');

  // Create VPC component
  const vpcComponent = new VpcComponent(stack, 'TestVpc', mockContext, mockSpec);

  console.log('✅ VPC Component created successfully');
  console.log(`📋 Component Type: ${vpcComponent.getType()}`);

  // Test synthesis
  vpcComponent.synth();
  console.log('✅ VPC Component synthesized successfully');

  // Test capabilities
  const capabilities = vpcComponent.getCapabilities();
  console.log('✅ VPC Capabilities:', Object.keys(capabilities));

  console.log('🎉 All VPC tests passed!');

} catch (error) {
  console.error('❌ VPC test failed:', error);
  process.exit(1);
}
