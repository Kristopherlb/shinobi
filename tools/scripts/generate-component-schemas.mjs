#!/usr/bin/env node

import { readdir, writeFile, readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

// Schema template for components
const createComponentSchema = (componentName, componentType) => {
  const baseSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "title": `${componentName} Component Configuration`,
    "description": `Configuration schema for the ${componentName} component`,
    "properties": {
      "serviceName": {
        "type": "string",
        "description": "Name of the service this component belongs to",
        "minLength": 1,
        "maxLength": 63
      },
      "environment": {
        "type": "string",
        "description": "Environment name (dev, staging, prod)",
        "enum": ["dev", "staging", "prod"]
      },
      "complianceFramework": {
        "type": "string",
        "description": "Compliance framework to apply",
        "enum": ["commercial", "fedramp-moderate", "fedramp-high"],
        "default": "commercial"
      },
      "tags": {
        "type": "object",
        "description": "Resource tags",
        "patternProperties": {
          "^[a-zA-Z0-9\\-_.:/=+@]+$": {
            "type": "string",
            "maxLength": 256
          }
        },
        "additionalProperties": false
      }
    },
    "required": ["serviceName", "environment"],
    "additionalProperties": false
  };

  // Add component-specific properties based on type
  switch (componentType) {
    case 'lambda-api':
      baseSchema.properties = {
        ...baseSchema.properties,
        "runtime": {
          "type": "string",
          "enum": ["nodejs18.x", "nodejs20.x", "python3.9", "python3.10", "python3.11", "java11", "java17"],
          "default": "nodejs20.x"
        },
        "memorySize": {
          "type": "integer",
          "minimum": 128,
          "maximum": 10240,
          "default": 512
        },
        "timeout": {
          "type": "integer",
          "minimum": 1,
          "maximum": 900,
          "default": 30
        },
        "api": {
          "type": "object",
          "properties": {
            "path": {
              "type": "string",
              "default": "/"
            },
            "methods": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
              },
              "default": ["GET", "POST"]
            }
          }
        }
      };
      break;

    case 'ecs-cluster':
      baseSchema.properties = {
        ...baseSchema.properties,
        "clusterName": {
          "type": "string",
          "description": "Name of the ECS cluster"
        },
        "containerInsights": {
          "type": "boolean",
          "default": true
        },
        "serviceConnect": {
          "type": "object",
          "properties": {
            "namespace": {
              "type": "string",
              "description": "Service Connect namespace name"
            }
          },
          "required": ["namespace"]
        },
        "capacity": {
          "type": "object",
          "properties": {
            "instanceType": {
              "type": "string",
              "default": "t3.medium"
            },
            "minSize": {
              "type": "integer",
              "minimum": 0,
              "default": 0
            },
            "maxSize": {
              "type": "integer",
              "minimum": 1,
              "default": 10
            },
            "desiredSize": {
              "type": "integer",
              "minimum": 0
            }
          }
        }
      };
      break;

    case 's3-bucket':
      baseSchema.properties = {
        ...baseSchema.properties,
        "bucketName": {
          "type": "string",
          "description": "Name of the S3 bucket"
        },
        "encryption": {
          "type": "object",
          "properties": {
            "enabled": {
              "type": "boolean",
              "default": true
            },
            "kmsKeyId": {
              "type": "string",
              "description": "KMS key ID for encryption"
            }
          }
        },
        "versioning": {
          "type": "boolean",
          "default": false
        },
        "publicAccessBlock": {
          "type": "boolean",
          "default": true
        }
      };
      break;

    case 'rds-postgres':
      baseSchema.properties = {
        ...baseSchema.properties,
        "instanceClass": {
          "type": "string",
          "default": "db.t3.micro"
        },
        "allocatedStorage": {
          "type": "integer",
          "minimum": 20,
          "default": 20
        },
        "backupRetentionPeriod": {
          "type": "integer",
          "minimum": 0,
          "maximum": 35,
          "default": 7
        },
        "multiAz": {
          "type": "boolean",
          "default": false
        },
        "publiclyAccessible": {
          "type": "boolean",
          "default": false
        }
      };
      break;

    default:
      // Generic component schema
      break;
  }

  return baseSchema;
};

async function generateComponentSchemas() {
  try {
    // Get all component directories
    const componentsDir = join(rootDir, 'packages/components');
    const components = await readdir(componentsDir, { withFileTypes: true });

    const componentDirs = components
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Found ${componentDirs.length} components to process...`);

    let created = 0;
    let skipped = 0;

    for (const componentName of componentDirs) {
      const schemaPath = join(componentsDir, componentName, 'Config.schema.json');

      // Check if schema already exists
      try {
        await readFile(schemaPath, 'utf8');
        console.log(`✓ ${componentName} already has Config.schema.json`);
        skipped++;
        continue;
      } catch (error) {
        // File doesn't exist, create it
      }

      // Determine component type from name
      let componentType = 'generic';
      if (componentName.includes('lambda')) componentType = 'lambda-api';
      else if (componentName.includes('ecs')) componentType = 'ecs-cluster';
      else if (componentName.includes('s3')) componentType = 's3-bucket';
      else if (componentName.includes('rds')) componentType = 'rds-postgres';
      else if (componentName.includes('ec2')) componentType = 'ec2-instance';

      // Generate schema
      const schema = createComponentSchema(componentName, componentType);

      await writeFile(schemaPath, JSON.stringify(schema, null, 2));
      console.log(`✓ Created Config.schema.json for ${componentName}`);
      created++;
    }

    console.log(`\n✅ Schema generation completed!`);
    console.log(`   Created: ${created} schemas`);
    console.log(`   Skipped: ${skipped} schemas (already exist)`);

  } catch (error) {
    console.error('❌ Error generating component schemas:', error);
    process.exit(1);
  }
}

generateComponentSchemas();
