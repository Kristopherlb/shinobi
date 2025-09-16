import { describe, expect, test, jest } from '@jest/globals';
import { MigrationValidator } from '../../src/migration/migration-validator';

const createValidator = () => new MigrationValidator({
  debug: jest.fn()
} as any);

describe('MigrationValidator resource comparison diffing', () => {
  test('reports type differences before property changes', () => {
    const validator = createValidator();

    const original = {
      Type: 'AWS::S3::Bucket',
      Properties: {
        BucketName: 'legacy-bucket'
      }
    };

    const migrated = {
      Type: 'AWS::SQS::Queue',
      Properties: {
        QueueName: 'new-queue'
      }
    };

    const differences = (validator as any).compareResources(original, migrated) as string[];

    expect(differences[0]).toBe('Type changed: AWS::S3::Bucket -> AWS::SQS::Queue');
    expect(differences).toContain('Properties.BucketName removed');
    expect(differences).toContain('Properties.QueueName added');
  });

  test('examines non-property fields like DependsOn, Condition, metadata, and policies', () => {
    const validator = createValidator();

    const original = {
      Type: 'AWS::Lambda::Function',
      DependsOn: ['AppRole'],
      Condition: 'CreateLambda',
      Metadata: {
        version: 'v1'
      },
      DeletionPolicy: 'Retain',
      Properties: {
        Handler: 'index.handler',
        Role: 'arn:aws:iam::123456789012:role/AppRole'
      }
    };

    const migrated = {
      Type: 'AWS::Lambda::Function',
      DependsOn: ['AppRole', 'LambdaBucket'],
      Condition: 'CreateLambdaUpdated',
      Metadata: {
        version: 'v2'
      },
      DeletionPolicy: 'Delete',
      Properties: {
        Handler: 'index.handler',
        Role: 'arn:aws:iam::123456789012:role/AppRole',
        MemorySize: 512
      }
    };

    const differences = (validator as any).compareResources(original, migrated) as string[];

    expect(differences).toContain('DependsOn entry added: "LambdaBucket"');
    expect(differences).toContain('Condition value changed: "CreateLambda" -> "CreateLambdaUpdated"');
    expect(differences).toContain('Metadata.version value changed: "v1" -> "v2"');
    expect(differences).toContain('DeletionPolicy value changed: "Retain" -> "Delete"');
    expect(differences).toContain('Properties.MemorySize added');
  });

  test('includes full path details for nested property differences', () => {
    const validator = createValidator();

    const original = {
      Type: 'AWS::S3::Bucket',
      Properties: {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              BucketKeyEnabled: false,
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms'
              }
            }
          ]
        }
      }
    };

    const migrated = {
      Type: 'AWS::S3::Bucket',
      Properties: {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              BucketKeyEnabled: true,
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms'
              }
            }
          ]
        }
      }
    };

    const differences = (validator as any).compareResources(original, migrated) as string[];

    expect(differences).toContain(
      'Properties.BucketEncryption.ServerSideEncryptionConfiguration[0].BucketKeyEnabled value changed: false -> true'
    );
  });

  test('treats array reordering as equivalent after stable sorting', () => {
    const validator = createValidator();

    const original = {
      Type: 'AWS::IAM::Role',
      Properties: {
        Policies: [
          {
            PolicyName: 'DataAccess',
            PolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Action: ['s3:GetObject', 's3:PutObject'],
                  Resource: '*'
                }
              ]
            }
          },
          {
            PolicyName: 'QueueAccess',
            PolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Action: ['sqs:SendMessage'],
                  Resource: '*'
                }
              ]
            }
          }
        ]
      }
    };

    const migrated = JSON.parse(JSON.stringify(original));
    migrated.Properties.Policies.reverse();
    migrated.Properties.Policies[1].PolicyDocument.Statement[0].Action = ['s3:PutObject', 's3:GetObject'];

    const differences = (validator as any).compareResources(original, migrated) as string[];
    expect(differences).toEqual([]);
  });

  test('sorts property keys deterministically in diff output', () => {
    const validator = createValidator();

    const original = {
      Type: 'AWS::S3::Bucket',
      Properties: {
        BetaSetting: 'value'
      }
    };

    const migrated = {
      Type: 'AWS::S3::Bucket',
      Properties: {
        AlphaSetting: 'value'
      }
    };

    const differences = (validator as any).compareResources(original, migrated) as string[];

    expect(differences).toEqual([
      'Properties.AlphaSetting added',
      'Properties.BetaSetting removed'
    ]);
  });
});
