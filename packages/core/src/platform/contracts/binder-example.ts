/**
 * Binder Strategy System Example
 * Demonstrates how to use the enhanced binder strategy system
 */

import { BinderIntegration } from './binder-integration';
import { EnhancedBindingContext, CapabilityData } from './enhanced-binding-context';
import { Component } from './component';

/**
 * Example usage of the binder strategy system
 */
export class BinderExample {

  /**
   * Example: Complete service manifest with component bindings
   */
  static createExampleServiceManifest(): any {
    return {
      service: 'my-ecommerce-service',
      owner: 'platform-team',
      complianceFramework: 'fedramp-moderate',
      environments: {
        dev: {
          components: [
            {
              name: 'api-gateway',
              type: 'lambda-api',
              config: {
                runtime: 'nodejs18.x',
                handler: 'index.handler'
              },
              binds: [
                {
                  to: 'user-database',
                  capability: 'db:postgres',
                  access: 'readwrite',
                  env: {
                    host: 'DB_HOST',
                    port: 'DB_PORT',
                    database: 'DB_NAME',
                    secretArn: 'DB_SECRET_ARN'
                  }
                },
                {
                  to: 'user-cache',
                  capability: 'cache:redis',
                  access: 'readwrite',
                  env: {
                    host: 'CACHE_HOST',
                    port: 'CACHE_PORT',
                    authToken: 'CACHE_AUTH_TOKEN'
                  }
                },
                {
                  to: 'user-storage',
                  capability: 'storage:s3',
                  access: 'readwrite',
                  env: {
                    bucketName: 'STORAGE_BUCKET_NAME',
                    bucketArn: 'STORAGE_BUCKET_ARN'
                  }
                },
                {
                  to: 'order-queue',
                  capability: 'queue:sqs',
                  access: 'write',
                  env: {
                    queueUrl: 'ORDER_QUEUE_URL',
                    queueArn: 'ORDER_QUEUE_ARN'
                  },
                  options: {
                    deadLetterQueue: {
                      maxReceiveCount: 3,
                      queueArn: 'arn:aws:sqs:us-east-1:123456789012:order-dlq'
                    }
                  }
                }
              ]
            },
            {
              name: 'user-database',
              type: 'rds-postgres',
              config: {
                instanceType: 'db.t3.micro',
                allocatedStorage: 20,
                masterUsername: 'admin',
                databaseName: 'users'
              }
            },
            {
              name: 'user-cache',
              type: 'elasticache-redis',
              config: {
                nodeType: 'cache.t3.micro',
                numCacheNodes: 1,
                authToken: 'generated-secret'
              }
            },
            {
              name: 'user-storage',
              type: 's3-bucket',
              config: {
                bucketName: 'my-ecommerce-user-storage',
                versioned: true,
                encryption: {
                  algorithm: 'AES256'
                }
              }
            },
            {
              name: 'order-queue',
              type: 'sqs-queue',
              config: {
                queueName: 'order-processing-queue',
                visibilityTimeout: 30,
                messageRetentionPeriod: 1209600
              }
            }
          ]
        }
      }
    };
  }

  /**
   * Example: Process bindings for a service
   */
  static async processServiceBindings(): Promise<void> {
    console.log('🚀 Starting binder strategy example...\n');

    // Create binder integration
    const binderIntegration = new BinderIntegration();

    // Example service manifest
    const serviceManifest = this.createExampleServiceManifest();
    const environment = 'dev';
    const complianceFramework = 'fedramp-moderate';

    // Mock components (in real implementation, these would be created from the manifest)
    const components = this.createMockComponents(serviceManifest);

    try {
      // Validate bindings for compliance
      console.log('📋 Validating bindings for compliance...');
      const validation = binderIntegration.validateBindingsCompliance(components, complianceFramework);

      if (!validation.compliant) {
        console.error('❌ Compliance validation failed:');
        validation.violations.forEach(violation => console.error(`  - ${violation}`));
        return;
      }
      console.log('✅ All bindings are compliant\n');

      // Process component bindings
      console.log('🔗 Processing component bindings...');
      const bindingResults = await binderIntegration.processComponentBindings(
        components,
        environment,
        complianceFramework
      );

      // Apply binding results
      console.log('\n📝 Applying binding results...');
      binderIntegration.applyBindingResults(components, bindingResults);

      // Display statistics
      console.log('\n📊 Binding Statistics:');
      const stats = binderIntegration.getBindingStatistics(bindingResults);
      console.log(`  Total bindings: ${stats.totalBindings}`);
      console.log(`  Compliance violations: ${stats.complianceViolations}`);
      console.log(`  By framework: ${JSON.stringify(stats.byComplianceFramework, null, 2)}`);

      console.log('\n✅ Binder strategy example completed successfully!');

    } catch (error) {
      console.error('❌ Error processing bindings:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Example: Create mock components from service manifest
   */
  private static createMockComponents(serviceManifest: any): Component[] {
    // This is a simplified mock - in real implementation, components would be created properly
    const components: any[] = [];

    serviceManifest.environments.dev.components.forEach((compSpec: any) => {
      const component = {
        spec: compSpec,
        getType: () => compSpec.type,
        getName: () => compSpec.name,
        getCapabilities: () => this.getMockCapabilities(compSpec.type, compSpec.name)
      };
      components.push(component);
    });

    return components;
  }

  /**
   * Example: Get mock capabilities for component types
   */
  private static getMockCapabilities(componentType: string, componentName: string): Record<string, any> {
    switch (componentType) {
      case 'rds-postgres':
        return {
          'db:postgres': {
            endpoints: {
              host: `${componentName}.cluster-xyz.us-east-1.rds.amazonaws.com`,
              port: 5432
            },
            resources: {
              arn: `arn:aws:rds:us-east-1:123456789012:cluster:${componentName}`,
              name: 'users'
            },
            securityGroups: [`sg-${componentName}-database`],
            secrets: {
              secretArn: `arn:aws:secretsmanager:us-east-1:123456789012:secret:${componentName}-credentials`
            }
          }
        };

      case 'elasticache-redis':
        return {
          'cache:redis': {
            endpoints: {
              host: `${componentName}.cache.amazonaws.com`,
              port: 6379
            },
            resources: {
              arn: `arn:aws:elasticache:us-east-1:123456789012:cluster:${componentName}`
            },
            securityGroups: [`sg-${componentName}-cache`],
            secrets: {
              authToken: `arn:aws:secretsmanager:us-east-1:123456789012:secret:${componentName}-auth-token`
            },
            auth: { enabled: true }
          }
        };

      case 's3-bucket':
        return {
          'storage:s3': {
            resources: {
              name: `${componentName}-bucket`,
              arn: `arn:aws:s3:::${componentName}-bucket`
            },
            region: 'us-east-1',
            encryption: {
              algorithm: 'AES256'
            }
          }
        };

      case 'sqs-queue':
        return {
          'queue:sqs': {
            resources: {
              url: `https://sqs.us-east-1.amazonaws.com/123456789012/${componentName}`,
              arn: `arn:aws:sqs:us-east-1:123456789012:${componentName}`
            },
            region: 'us-east-1',
            deadLetterQueue: {
              url: `https://sqs.us-east-1.amazonaws.com/123456789012/${componentName}-dlq`,
              arn: `arn:aws:sqs:us-east-1:123456789012:${componentName}-dlq`
            }
          }
        };

      default:
        return {};
    }
  }

  /**
   * Example: Demonstrate specific binding scenarios
   */
  static demonstrateSpecificBindings(): void {
    console.log('🔍 Demonstrating specific binding scenarios...\n');

    // Database binding example
    console.log('📊 Database Binding Example:');
    console.log('  - Lambda function binding to RDS PostgreSQL');
    console.log('  - IAM policies for database access');
    console.log('  - Environment variables for connection');
    console.log('  - Security group rules for network access');
    console.log('  - FedRAMP compliance enforcement\n');

    // Storage binding example
    console.log('💾 Storage Binding Example:');
    console.log('  - Lambda function binding to S3 bucket');
    console.log('  - Least-privilege S3 access policies');
    console.log('  - Environment variables for bucket details');
    console.log('  - KMS encryption key access');
    console.log('  - HTTPS-only transport enforcement\n');

    // Cache binding example
    console.log('⚡ Cache Binding Example:');
    console.log('  - Lambda function binding to ElastiCache Redis');
    console.log('  - Network security group rules');
    console.log('  - Environment variables for Redis connection');
    console.log('  - AUTH token access via Secrets Manager');
    console.log('  - VPC endpoint requirements for FedRAMP\n');

    // Queue binding example
    console.log('📨 Queue Binding Example:');
    console.log('  - Lambda function binding to SQS queue');
    console.log('  - Message processing permissions');
    console.log('  - Dead letter queue configuration');
    console.log('  - Environment variables for queue details');
    console.log('  - CloudWatch monitoring access\n');
  }
}

// Example usage
if (require.main === module) {
  BinderExample.demonstrateSpecificBindings();
  BinderExample.processServiceBindings().catch(console.error);
}
