import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { ResolverEngine } from '../../../packages/core-engine/src/resolver-engine';
import { Logger } from '../../../packages/core-engine/src/logger';

describe('Component Synthesis Integration Tests', () => {
  let resolverEngine: ResolverEngine;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger();
    resolverEngine = new ResolverEngine({ logger: mockLogger });
  });

  describe('Multi-Component Service Synthesis', () => {
    test('should synthesize complete web application with database', async () => {
      const manifest = {
        service: 'web-app-integration',
        owner: 'platform-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'web-api',
            type: 'lambda-api',
            config: {
              functionName: 'WebAPIFunction',
              code: {
                handler: 'src/api.handler',
                runtime: 'nodejs18.x',
                zipFile: './dist/api.zip'
              },
              memorySize: 512,
              timeout: 30,
              environment: {
                variables: {
                  DB_HOST: '${app-database.endpoint.address}',
                  DB_PORT: '${app-database.endpoint.port}',
                  DB_NAME: '${app-database.databaseName}'
                }
              }
            },
            binds: [
              {
                to: 'app-database',
                capability: 'database:postgres',
                access: 'read-write'
              },
              {
                to: 'app-bucket',
                capability: 'storage:s3',
                access: 'read-write'
              }
            ]
          },
          {
            name: 'app-database',
            type: 'rds-postgres',
            config: {
              dbInstanceIdentifier: 'web-app-db',
              dbName: 'webappdb',
              engine: 'postgres',
              engineVersion: '15.4',
              instanceClass: 'db.t3.micro',
              allocatedStorage: 20,
              masterUsername: 'dbadmin',
              manageMasterUserPassword: true
            }
          },
          {
            name: 'app-bucket',
            type: 's3-bucket',
            config: {
              bucketName: 'web-app-storage-bucket'
            }
          }
        ]
      };

      // Act: Synthesize the complete service
      const result = await resolverEngine.synthesize(manifest);
      
      // Assert: Verify synthesis completed successfully
      expect(result).toBeDefined();
      expect(result.bindings).toHaveLength(2);
      
      // Extract CloudFormation template
      const cfnTemplate = result.app.synth().getStackByName('web-app-integration-stack').template;
      const template = Template.fromJSON(cfnTemplate);

      // Verify Lambda function exists
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'WebAPIFunction'
      });

      // Verify RDS instance exists
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        DBInstanceIdentifier: 'web-app-db',
        Engine: 'postgres'
      });

      // Verify S3 bucket exists
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'web-app-storage-bucket'
      });

      // Verify Lambda has database access permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: expect.arrayContaining(['secretsmanager:GetSecretValue'])
            })
          ])
        }
      });

      // Verify Lambda has S3 access permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: expect.arrayContaining(['s3:GetObject', 's3:PutObject'])
            })
          ])
        }
      });
    });

    test('should properly resolve cross-component references', async () => {
      const manifest = {
        service: 'reference-test',
        owner: 'platform-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'processing-queue',
            type: 'sqs-queue',
            config: {
              queueName: 'data-processing-queue'
            }
          },
          {
            name: 'processor',
            type: 'lambda-worker',
            config: {
              functionName: 'DataProcessor',
              code: {
                handler: 'src/processor.handler',
                runtime: 'python3.11',
                zipFile: './dist/processor.zip'
              },
              environment: {
                variables: {
                  QUEUE_URL: '${processing-queue.queueUrl}'
                }
              },
              eventSourceMappings: [
                {
                  eventSourceArn: '${processing-queue.queueArn}',
                  batchSize: 10
                }
              ]
            },
            binds: [
              {
                to: 'processing-queue',
                capability: 'queue:sqs',
                access: 'consume'
              }
            ]
          }
        ]
      };

      const result = await resolverEngine.synthesize(manifest);
      
      const cfnTemplate = result.app.synth().getStackByName('reference-test-stack').template;
      const template = Template.fromJSON(cfnTemplate);

      // Verify SQS queue exists
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'data-processing-queue'
      });

      // Verify Lambda function exists
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'DataProcessor'
      });

      // Verify event source mapping is created with proper queue reference
      template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        EventSourceArn: { 'Fn::GetAtt': [expect.any(String), 'Arn'] },
        BatchSize: 10
      });

      // Verify Lambda has queue access permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: expect.arrayContaining([
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes'
              ])
            })
          ])
        }
      });
    });

    test('should apply consistent compliance hardening across all components', async () => {
      const manifest = {
        service: 'fedramp-service',
        owner: 'security-team',
        complianceFramework: 'fedramp-high',
        components: [
          {
            name: 'secure-api',
            type: 'lambda-api',
            config: {
              functionName: 'SecureAPI',
              code: {
                handler: 'src/api.handler',
                runtime: 'nodejs18.x',
                zipFile: './dist/api.zip'
              }
            }
          },
          {
            name: 'secure-database',
            type: 'rds-postgres',
            config: {
              dbInstanceIdentifier: 'secure-db',
              dbName: 'secureapp',
              engine: 'postgres',
              engineVersion: '15.4',
              instanceClass: 'db.r5.large',
              allocatedStorage: 100,
              masterUsername: 'securedbadmin'
            }
          },
          {
            name: 'secure-storage',
            type: 's3-bucket',
            config: {
              bucketName: 'secure-app-storage'
            }
          }
        ]
      };

      const result = await resolverEngine.synthesize(manifest);
      
      const cfnTemplate = result.app.synth().getStackByName('fedramp-service-stack').template;
      const template = Template.fromJSON(cfnTemplate);

      // Verify Lambda has enhanced security (VPC, X-Ray, KMS)
      template.hasResourceProperties('AWS::Lambda::Function', {
        TracingConfig: { Mode: 'Active' },
        KmsKeyArn: expect.stringContaining('arn:aws:kms:'),
        VpcConfig: expect.objectContaining({
          SubnetIds: expect.any(Array)
        })
      });

      // Verify RDS has enhanced security (Multi-AZ, encryption, monitoring)
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        MultiAZ: true,
        StorageEncrypted: true,
        MonitoringInterval: 15,
        DeletionProtection: true,
        BackupRetentionPeriod: 35
      });

      // Verify S3 has enhanced security (KMS encryption, access controls)
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms'
              }
            }
          ]
        }
      });

      // Verify customer-managed KMS keys are created
      const kmsKeys = template.findResources('AWS::KMS::Key');
      expect(Object.keys(kmsKeys).length).toBeGreaterThan(0);
    });
  });

  describe('Component Binding Validation', () => {
    test('should create proper IAM policies for component bindings', async () => {
      const manifest = {
        service: 'binding-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              functionName: 'TestAPI',
              code: {
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                zipFile: './dist/api.zip'
              }
            },
            binds: [
              { to: 'data-table', capability: 'database:dynamodb', access: 'read-write' },
              { to: 'file-storage', capability: 'storage:s3', access: 'read' },
              { to: 'task-queue', capability: 'queue:sqs', access: 'send' }
            ]
          },
          {
            name: 'data-table',
            type: 'dynamodb-table',
            config: {
              tableName: 'AppDataTable',
              partitionKey: { name: 'id', type: 'S' }
            }
          },
          {
            name: 'file-storage',
            type: 's3-bucket',
            config: {
              bucketName: 'app-file-storage'
            }
          },
          {
            name: 'task-queue',
            type: 'sqs-queue',
            config: {
              queueName: 'app-task-queue'
            }
          }
        ]
      };

      const result = await resolverEngine.synthesize(manifest);
      
      const cfnTemplate = result.app.synth().getStackByName('binding-test-stack').template;
      const template = Template.fromJSON(cfnTemplate);

      // Verify Lambda execution role exists
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      });

      // Verify DynamoDB access policy exists
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: expect.arrayContaining([
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
              ])
            })
          ])
        }
      });

      // Verify S3 read-only access policy exists
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: expect.arrayContaining(['s3:GetObject'])
            })
          ])
        }
      });

      // Verify SQS send access policy exists
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: expect.arrayContaining(['sqs:SendMessage'])
            })
          ])
        }
      });
    });

    test('should handle invalid binding configurations gracefully', async () => {
      const manifest = {
        service: 'invalid-binding-test',
        owner: 'dev-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              functionName: 'TestAPI',
              code: {
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                zipFile: './dist/api.zip'
              }
            },
            binds: [
              {
                to: 'nonexistent-component',
                capability: 'database:postgres',
                access: 'read'
              }
            ]
          }
        ]
      };

      await expect(resolverEngine.synthesize(manifest)).rejects.toThrow(
        expect.stringContaining('nonexistent-component')
      );
    });
  });

  describe('Template Structure Validation', () => {
    test('should generate well-formed CloudFormation templates', async () => {
      const manifest = {
        service: 'structure-test',
        owner: 'platform-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'test-lambda',
            type: 'lambda-api',
            config: {
              functionName: 'StructureTestFunction',
              code: {
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                zipFile: './dist/lambda.zip'
              }
            }
          }
        ]
      };

      const result = await resolverEngine.synthesize(manifest);
      const cfnTemplate = result.app.synth().getStackByName('structure-test-stack').template;

      // Validate basic CloudFormation structure
      expect(cfnTemplate).toHaveProperty('AWSTemplateFormatVersion', '2010-09-09');
      expect(cfnTemplate).toHaveProperty('Resources');
      expect(cfnTemplate).toHaveProperty('Outputs');

      // Validate all resources have required properties
      Object.entries(cfnTemplate.Resources).forEach(([logicalId, resource]: [string, any]) => {
        expect(resource).toHaveProperty('Type');
        expect(resource).toHaveProperty('Properties');
        expect(typeof resource.Type).toBe('string');
        expect(typeof resource.Properties).toBe('object');
        expect(resource.Type).toMatch(/^AWS::[A-Za-z0-9]+::[A-Za-z0-9]+$/);
      });

      // Validate outputs structure
      if (cfnTemplate.Outputs) {
        Object.entries(cfnTemplate.Outputs).forEach(([outputName, output]: [string, any]) => {
          expect(output).toHaveProperty('Value');
          expect(typeof output.Value).toBeDefined();
        });
      }
    });

    test('should maintain consistent resource naming conventions', async () => {
      const manifest = {
        service: 'naming-test',
        owner: 'platform-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'test-api',
            type: 'lambda-api',
            config: {
              functionName: 'NamingTestAPI',
              code: {
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                zipFile: './dist/api.zip'
              }
            }
          },
          {
            name: 'test-database',
            type: 'rds-postgres',
            config: {
              dbInstanceIdentifier: 'naming-test-db',
              dbName: 'testapp',
              engine: 'postgres',
              engineVersion: '15.4',
              instanceClass: 'db.t3.micro',
              allocatedStorage: 20,
              masterUsername: 'dbadmin'
            }
          }
        ]
      };

      const result = await resolverEngine.synthesize(manifest);
      const cfnTemplate = result.app.synth().getStackByName('naming-test-stack').template;

      // Verify consistent naming patterns
      const resourceNames = Object.keys(cfnTemplate.Resources);
      
      // Lambda-related resources should start with component name
      const lambdaResources = resourceNames.filter(name => 
        name.includes('TestApi') || name.includes('testapi')
      );
      expect(lambdaResources.length).toBeGreaterThan(0);

      // Database-related resources should start with component name
      const dbResources = resourceNames.filter(name => 
        name.includes('TestDatabase') || name.includes('testdatabase')
      );
      expect(dbResources.length).toBeGreaterThan(0);

      // All resource names should follow consistent casing
      resourceNames.forEach(name => {
        expect(name).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      });
    });
  });

  describe('Performance and Scale Testing', () => {
    test('should handle large service manifests efficiently', async () => {
      const components = [];
      
      // Generate a large service with multiple components
      for (let i = 0; i < 20; i++) {
        components.push({
          name: `lambda-${i}`,
          type: 'lambda-api',
          config: {
            functionName: `TestFunction${i}`,
            code: {
              handler: 'index.handler',
              runtime: 'nodejs18.x',
              zipFile: `./dist/lambda${i}.zip`
            }
          }
        } as ComponentSpec);
      }

      const manifest = {
        service: 'large-service-test',
        owner: 'platform-team',
        complianceFramework: 'commercial',
        components
      };

      const startTime = Date.now();
      const result = await resolverEngine.synthesize(manifest);
      const duration = Date.now() - startTime;

      // Verify synthesis completes in reasonable time (< 30 seconds)
      expect(duration).toBeLessThan(30000);

      // Verify all components were synthesized
      const cfnTemplate = result.app.synth().getStackByName('large-service-test-stack').template;
      const template = Template.fromJSON(cfnTemplate);

      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      expect(Object.keys(lambdaFunctions)).toHaveLength(20);
    }, 45000); // Extended timeout for performance test
  });
});