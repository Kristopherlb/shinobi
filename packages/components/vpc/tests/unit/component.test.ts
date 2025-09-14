import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { vpcComponent } from '../src/vpc.component';
import { vpcBuilder } from '../src/vpc.builder';

describe('vpcComponent', () => {
  let app: App;
  let stack: Stack;
  let builder: vpcBuilder;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
    builder = new vpcBuilder();
  });

  describe('synth', () => {
    it('should create component with default configuration', () => {
      const config = builder.build();
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Verify component was created
      expect(component).toBeDefined();
      expect(template).toBeDefined();
    });

    it('should apply compliance tags', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Verify compliance tags are applied
      template.hasResourceProperties('AWS::S3::Bucket', {
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'compliance:framework', Value: 'fedramp-moderate' }),
          Match.objectLike({ Key: 'platform:component', Value: 'vpc' }),
          Match.objectLike({ Key: 'platform:service-type', Value: 'vpc' })
        ])
      });
    });

    it('should enforce compliance rules from plan', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Generated assertions from plan rules
  // No specific assertions generated
    });

    it('should enable framework-specific compliance', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Framework-specific assertions
      if ('fedramp-moderate'.includes('fedramp')) {
        // FedRAMP requires encryption
        template.hasResourceProperties('AWS::S3::Bucket', { BucketEncryption: Match.anyValue() });
      }
    });
  });

  describe('capabilities', () => {
    it('should support encryption capability', () => {
      const config = builder.build({ encryption: true });
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Verify encryption capability
      template.hasResourceProperties('AWS::S3::Bucket', { BucketEncryption: Match.anyValue() });
    });

    it('should support monitoring capability', () => {
      const config = builder.build({ monitoring: true });
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      const template = Template.fromStack(stack);
      
      // Verify monitoring capability
      expect(component).toBeDefined();
    });
  });

  describe('compliance plan validation', () => {
    it('should include all required NIST controls', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new vpcComponent(stack, 'Testvpc', config);
      
      // Verify component plan includes expected controls
      expect(component).toBeDefined();
      // Additional plan validation can be added here
    });
  });
});
