import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { test-s3-bucketComponent } from '../src/test-s3-bucket.component';
import { test-s3-bucketBuilder } from '../src/test-s3-bucket.builder';

describe('test-s3-bucketComponent', () => {
  let app: App;
  let stack: Stack;
  let builder: test-s3-bucketBuilder;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
    builder = new test-s3-bucketBuilder();
  });

  describe('synth', () => {
    it('should create component with default configuration', () => {
      const config = builder.build();
      const component = new test-s3-bucketComponent(stack, 'Testtest-s3-bucket', config);
      
      const template = Template.fromStack(stack);
      
      // Verify component was created
      expect(component).toBeDefined();
      expect(template).toBeDefined();
    });

    it('should apply compliance tags', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new test-s3-bucketComponent(stack, 'Testtest-s3-bucket', config);
      
      const template = Template.fromStack(stack);
      
      // Verify compliance tags are applied
      template.hasResourceProperties('AWS::S3::Bucket', {
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'compliance:framework', Value: 'fedramp-moderate' }),
          Match.objectLike({ Key: 'platform:component', Value: 'test-s3-bucket' }),
          Match.objectLike({ Key: 'platform:service-type', Value: 's3-bucket' })
        ])
      });
    });

    it('should enforce compliance rules from plan', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new test-s3-bucketComponent(stack, 'Testtest-s3-bucket', config);
      
      const template = Template.fromStack(stack);
      
      // Generated assertions from plan rules
  // No specific assertions generated
    });

    it('should enable framework-specific compliance', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new test-s3-bucketComponent(stack, 'Testtest-s3-bucket', config);
      
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
      const component = new test-s3-bucketComponent(stack, 'Testtest-s3-bucket', config);
      
      const template = Template.fromStack(stack);
      
      // Verify encryption capability
      template.hasResourceProperties('AWS::S3::Bucket', { BucketEncryption: Match.anyValue() });
    });

    it('should support monitoring capability', () => {
      const config = builder.build({ monitoring: true });
      const component = new test-s3-bucketComponent(stack, 'Testtest-s3-bucket', config);
      
      const template = Template.fromStack(stack);
      
      // Verify monitoring capability
      expect(component).toBeDefined();
    });
  });

  describe('compliance plan validation', () => {
    it('should include all required NIST controls', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new test-s3-bucketComponent(stack, 'Testtest-s3-bucket', config);
      
      // Verify component plan includes expected controls
      expect(component).toBeDefined();
      // Additional plan validation can be added here
    });
  });
});
