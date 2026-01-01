/**
 * CloudFormation Template Test Fixtures
 * 
 * Provides factory functions for creating test CloudFormation templates.
 */

export interface CloudFormationTemplate {
  AWSTemplateFormatVersion?: string;
  Description?: string;
  Resources?: Record<string, any>;
  Outputs?: Record<string, any>;
  Parameters?: Record<string, any>;
}

/**
 * Creates a minimal valid CloudFormation template
 */
export function createBasicTemplate(): CloudFormationTemplate {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Test template',
    Resources: {},
    Outputs: {}
  };
}

/**
 * Creates a template with specified resources
 */
export function createTemplateWithResources(resources: Record<string, any>): CloudFormationTemplate {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Test template with resources',
    Resources: resources,
    Outputs: {}
  };
}

/**
 * Creates a template with specified outputs
 */
export function createTemplateWithOutputs(outputs: Record<string, any>): CloudFormationTemplate {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Test template with outputs',
    Resources: {},
    Outputs: outputs
  };
}

/**
 * Creates templates designed for diff testing scenarios
 */
export function createTemplateForDiff(): {
  current: CloudFormationTemplate;
  desired: CloudFormationTemplate;
} {
  const current: CloudFormationTemplate = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Current template',
    Resources: {
      ExistingBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: 'existing-bucket'
        }
      },
      ExistingFunction: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          Runtime: 'nodejs18.x',
          Handler: 'index.handler'
        }
      }
    },
    Outputs: {
      BucketName: {
        Value: { Ref: 'ExistingBucket' }
      }
    }
  };

  const desired: CloudFormationTemplate = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Desired template',
    Resources: {
      ExistingBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: 'existing-bucket',
          VersioningConfiguration: {
            Status: 'Enabled'
          }
        }
      },
      ExistingFunction: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          Runtime: 'nodejs20.x', // Changed
          Handler: 'index.handler'
        }
      },
      NewLambda: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          Runtime: 'nodejs20.x',
          Handler: 'index.handler'
        }
      }
    },
    Outputs: {
      BucketName: {
        Value: { Ref: 'ExistingBucket' }
      },
      NewOutput: {
        Value: 'new-value'
      }
    }
  };

  return { current, desired };
}



