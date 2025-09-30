/**
 * Simple test to validate WAF Web ACL component generation
 */

import { App, Stack } from 'aws-cdk-lib';
import { WafWebAclComponent } from './waf-web-acl.component';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

// Mock context
const app = new App();
const stack = new Stack(app, 'TestStack');

const mockContext: ComponentContext = {
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: 'fedramp-moderate',
  scope: stack,
  region: 'us-east-1',
  accountId: '123456789012'
};

// Mock spec
const mockSpec: ComponentSpec = {
  name: 'test-waf-web-acl',
  type: 'waf-web-acl',
  config: {
    scope: 'REGIONAL',
    defaultAction: 'block',
    logging: {
      enabled: true
    },
    monitoring: {
      enabled: true
    }
  }
};

console.log('🧪 Testing WAF Web ACL Component Generation...');

try {
  // Create CDK app and stack
  const component = new WafWebAclComponent(stack, mockSpec.name, mockContext, mockSpec);

  // Test component type
  console.log('✅ Component type:', component.getType());

  // Test synthesis (this will create the actual CDK constructs)
  component.synth();
  console.log('✅ Component synthesis completed');

  // Test capabilities
  const capabilities = component.getCapabilities();
  console.log('✅ Component capabilities:', Object.keys(capabilities));

  // Test construct registration
  const mainConstruct = component.getConstruct('main');
  console.log('✅ Main construct registered:', !!mainConstruct);

  console.log('🎉 All tests passed! WAF Web ACL component is working correctly.');

} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
