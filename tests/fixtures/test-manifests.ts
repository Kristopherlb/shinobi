/**
 * Test Fixtures - Reusable manifest configurations for tests
 */

export const TestManifests = {
  // Basic single-component manifests
  basicLambdaApi: {
    service: 'basic-api',
    owner: 'test-team',
    complianceFramework: 'commercial',
    components: [
      {
        name: 'api',
        type: 'lambda-api',
        config: {
          runtime: 'nodejs18.x',
          handler: 'index.handler',
          codePath: './src'
        }
      }
    ]
  },

  basicRdsPostgres: {
    service: 'basic-db',
    owner: 'test-team', 
    complianceFramework: 'commercial',
    components: [
      {
        name: 'database',
        type: 'rds-postgres',
        config: {
          dbName: 'app_db'
        }
      }
    ]
  },

  // Multi-component manifests
  lambdaApiWithDatabase: {
    service: 'api-with-db',
    owner: 'test-team',
    complianceFramework: 'commercial',
    components: [
      {
        name: 'api',
        type: 'lambda-api',
        config: {
          runtime: 'nodejs18.x',
          handler: 'src/api.handler',
          codePath: './src'
        },
        binds: [
          {
            to: 'database',
            capability: 'database:rds',
            access: 'readwrite'
          }
        ]
      },
      {
        name: 'database',
        type: 'rds-postgres',
        config: {
          dbName: 'api_db',
          instanceClass: 'db.t3.micro'
        }
      }
    ]
  },

  workerWithQueue: {
    service: 'worker-queue-app',
    owner: 'test-team',
    complianceFramework: 'commercial',
    components: [
      {
        name: 'worker',
        type: 'lambda-worker',
        config: {
          runtime: 'nodejs18.x',
          handler: 'src/worker.handler',
          codePath: './src'
        },
        binds: [
          {
            to: 'queue',
            capability: 'queue:sqs',
            access: 'read'
          }
        ]
      },
      {
        name: 'queue',
        type: 'sqs-queue',
        config: {
          fifo: false,
          visibilityTimeout: 300
        }
      }
    ]
  },

  // FedRAMP compliance manifests
  fedrampModerate: {
    service: 'fedramp-moderate-app',
    owner: 'security-team',
    complianceFramework: 'fedramp-moderate',
    components: [
      {
        name: 'api',
        type: 'lambda-api',
        config: {
          runtime: 'nodejs18.x',
          handler: 'src/api.handler',
          codePath: './src',
          timeout: 30
        },
        binds: [
          {
            to: 'database',
            capability: 'database:rds',
            access: 'readwrite',
            options: {
              ssl: true,
              iamAuth: true
            }
          }
        ]
      },
      {
        name: 'database',
        type: 'rds-postgres',
        config: {
          dbName: 'secure_db',
          encrypted: true,
          backupRetention: 30,
          multiAz: true
        }
      }
    ]
  },

  fedrampHigh: {
    service: 'fedramp-high-app',
    owner: 'security-team',
    complianceFramework: 'fedramp-high',
    components: [
      {
        name: 'api',
        type: 'lambda-api',
        config: {
          runtime: 'nodejs18.x',
          handler: 'src/api.handler',
          codePath: './src',
          maxConcurrency: 50
        },
        binds: [
          {
            to: 'database',
            capability: 'database:rds',
            access: 'readwrite',
            options: {
              ssl: true,
              iamAuth: true,
              vpcEndpoint: 'vpce-12345'
            }
          }
        ]
      },
      {
        name: 'database',
        type: 'rds-postgres',
        config: {
          dbName: 'classified_db',
          encrypted: true,
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
          backupRetention: 35,
          multiAz: true,
          instanceClass: 'db.r5.large'
        }
      }
    ]
  },

  // Override testing manifests
  withOverrides: {
    service: 'override-test',
    owner: 'test-team',
    complianceFramework: 'commercial',
    components: [
      {
        name: 'api',
        type: 'lambda-api',
        config: {
          runtime: 'nodejs18.x',
          handler: 'index.handler',
          codePath: './src'
        },
        overrides: {
          lambda: {
            memorySize: 1024,
            timeout: 60,
            environment: {
              CUSTOM_VAR: 'override-value'
            }
          }
        }
      },
      {
        name: 'database',
        type: 'rds-postgres',
        config: {
          dbName: 'override_db'
        },
        overrides: {
          database: {
            allocatedStorage: 100,
            backupRetention: 14,
            deletionProtection: true
          }
        }
      }
    ]
  },

  // Patch testing manifests
  withPatch: {
    service: 'patch-test',
    owner: 'test-team',
    complianceFramework: 'commercial',
    patches: [
      {
        name: 'add-elasticache',
        justification: 'Required for session caching to improve performance',
        approvedBy: 'architecture-review-board',
        approvedDate: '2024-01-15'
      }
    ],
    components: [
      {
        name: 'api',
        type: 'lambda-api',
        config: {
          runtime: 'nodejs18.x',
          handler: 'index.handler',
          codePath: './src'
        }
      }
    ]
  },

  // Error case manifests
  invalidManifests: {
    missingRequired: {
      service: 'invalid-missing',
      // Missing owner field
      complianceFramework: 'commercial',
      components: []
    },

    invalidComponentType: {
      service: 'invalid-type',
      owner: 'test-team',
      complianceFramework: 'commercial',
      components: [
        {
          name: 'invalid',
          type: 'nonexistent-type',
          config: {}
        }
      ]
    },

    complianceViolation: {
      service: 'compliance-violation',
      owner: 'test-team',
      complianceFramework: 'fedramp-high',
      components: [
        {
          name: 'insecure-bucket',
          type: 's3-bucket',
          config: {
            bucketName: 'test-bucket',
            encrypted: false, // Violation: FedRAMP requires encryption
            publicAccess: true // Violation: FedRAMP prohibits public access
          }
        }
      ]
    }
  }
};

// Sample patches.ts file content for testing
export const samplePatchesFile = `
import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';

export const patchInfo = {
  name: 'ElastiCache Session Store',
  version: '1.0.0',
  description: 'Adds Redis cluster for session caching',
  author: 'platform-team'
};

export async function applyPatches(context: any) {
  const { stack, components, config, constructs } = context;
  
  // Add ElastiCache cluster
  const redis = new elasticache.CfnCacheCluster(stack, 'SessionCache', {
    cacheNodeType: 'cache.t3.micro',
    engine: 'redis',
    numCacheNodes: 1,
    vpcSecurityGroupIds: [constructs.api.securityGroup.securityGroupId]
  });
  
  // Add environment variable to API Lambda
  if (constructs.api) {
    constructs.api.addEnvironment('REDIS_HOST', redis.attrRedisEndpointAddress);
  }
}
`;

// Docker compose template for local development
export const sampleDockerCompose = `
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: {{dbName}}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: localdev
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - platform-network

  lambda-local:
    image: public.ecr.aws/lambda/nodejs:18
    environment:
      DB_HOST: postgres
      DATABASE_URL: postgresql://postgres:localdev@postgres:5432/{{dbName}}
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - platform-network

volumes:
  postgres-data:
    
networks:
  platform-network:
    driver: bridge
`;