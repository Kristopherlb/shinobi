/**
 * Directive Schema Definitions
 * 
 * JSON Schema definitions for directive.options per capability type.
 * Also includes environment variable allow-lists per capability.
 * 
 * SECURITY: These schemas prevent injection attacks by validating
 * all user-controlled input before binding execution.
 */

/**
 * Schema registry for capability-specific directive.options validation
 * Key: capability (e.g., 's3:bucket', 'kms:key')
 * Value: JSON Schema for options validation
 * 
 * Note: Using `any` type here because AJV's JSONSchemaType has strict typing
 * requirements that don't work well with complex nested schemas. The schemas
 * are validated at runtime by AJV anyway.
 */
const capabilitySchemas: Record<string, any> = {
  // Security Group Rule capability
  'security-group:rule': {
    type: 'object',
    properties: {
      rules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ruleType: {
              type: 'string',
              enum: ['ingress', 'egress']
            },
            peer: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', const: 'sg' },
                    id: { type: 'string' }
                  },
                  required: ['kind', 'id'],
                  additionalProperties: false
                },
                {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', const: 'cidr' },
                    cidr: { type: 'string' }
                  },
                  required: ['kind', 'cidr'],
                  additionalProperties: false
                }
              ]
            },
            port: {
              type: 'object',
              properties: {
                from: { type: 'number', minimum: 0, maximum: 65535 },
                to: { type: 'number', minimum: 0, maximum: 65535 },
                protocol: { type: 'string', enum: ['tcp', 'udp', 'icmp'] }
              },
              required: ['from', 'to', 'protocol'],
              additionalProperties: false
            },
            description: { type: 'string' }
          },
          required: ['ruleType', 'peer', 'port'],
          additionalProperties: false
        }
      },
      // Shorthand single rule options
      peer: {
        oneOf: [
          { type: 'string' },
          {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['sg', 'cidr'] },
              id: { type: 'string' },
              cidr: { type: 'string' }
            },
            additionalProperties: false
          }
        ]
      },
      port: {
        oneOf: [
          { type: 'number', minimum: 0, maximum: 65535 },
          {
            type: 'object',
            properties: {
              from: { type: 'number', minimum: 0, maximum: 65535 },
              to: { type: 'number', minimum: 0, maximum: 65535 },
              protocol: { type: 'string', enum: ['tcp', 'udp', 'icmp'] }
            },
            required: ['from', 'to', 'protocol'],
            additionalProperties: false
          }
        ]
      },
      ruleType: { type: 'string', enum: ['ingress', 'egress'] },
      type: { type: 'string', enum: ['ingress', 'egress'] },
      protocol: { type: 'string', enum: ['tcp', 'udp', 'icmp'] },
      description: { type: 'string' },
      defaultPort: { type: 'number', minimum: 0, maximum: 65535 }
    },
    additionalProperties: false
  },

  // S3 Bucket capability
  's3:bucket': {
    type: 'object',
    properties: {
      bucketName: { type: 'string' },
      prefix: { type: 'string' },
      versioning: { type: 'boolean' },
      encryption: { type: 'string', enum: ['AES256', 'aws:kms'] },
      kmsKeyId: { type: 'string' }
    },
    additionalProperties: false
  },

  // KMS Key capability
  'kms:key': {
    type: 'object',
    properties: {
      keyId: { type: 'string' },
      keyAlias: { type: 'string' },
      keySpec: { type: 'string', enum: ['SYMMETRIC_DEFAULT', 'RSA_2048', 'RSA_3072', 'RSA_4096', 'ECC_NIST_P256', 'ECC_NIST_P384', 'ECC_NIST_P521'] },
      keyUsage: { type: 'string', enum: ['ENCRYPT_DECRYPT', 'SIGN_VERIFY'] }
    },
    additionalProperties: false
  },

  // Secrets Manager capability
  'secretsmanager:secret': {
    type: 'object',
    properties: {
      secretName: { type: 'string' },
      secretArn: { type: 'string' },
      versionId: { type: 'string' },
      versionStage: { type: 'string' }
    },
    additionalProperties: false
  },

  // DynamoDB Table capability
  'dynamodb:table': {
    type: 'object',
    properties: {
      tableName: { type: 'string' },
      indexName: { type: 'string' },
      streamViewType: { type: 'string', enum: ['KEYS_ONLY', 'NEW_IMAGE', 'OLD_IMAGE', 'NEW_AND_OLD_IMAGES'] }
    },
    additionalProperties: false
  },

  // SQS Queue capability
  'sqs:queue': {
    type: 'object',
    properties: {
      queueName: { type: 'string' },
      queueUrl: { type: 'string' },
      fifo: { type: 'boolean' },
      deadLetterQueue: { type: 'boolean' }
    },
    additionalProperties: false
  },

  // SNS Topic capability
  'sns:topic': {
    type: 'object',
    properties: {
      topicName: { type: 'string' },
      topicArn: { type: 'string' },
      fifo: { type: 'boolean' }
    },
    additionalProperties: false
  },

  // Lambda Function capability
  'lambda:function': {
    type: 'object',
    properties: {
      functionName: { type: 'string' },
      functionArn: { type: 'string' },
      qualifier: { type: 'string' },
      version: { type: 'string' },
      alias: { type: 'string' }
    },
    additionalProperties: false
  },

  // RDS Database capability
  'rds:database': {
    type: 'object',
    properties: {
      dbInstanceIdentifier: { type: 'string' },
      dbClusterIdentifier: { type: 'string' },
      endpoint: { type: 'string' },
      port: { type: 'number', minimum: 1, maximum: 65535 }
    },
    additionalProperties: false
  },

  // VPC capability
  'vpc:network': {
    type: 'object',
    properties: {
      vpcId: { type: 'string' },
      subnetId: { type: 'string' },
      subnetIds: {
        type: 'array',
        items: { type: 'string' }
      },
      securityGroupId: { type: 'string' }
    },
    additionalProperties: false
  }
  ,
  // REST API capability (binding-time options)
  // Used by resolver tests for capability version pinning.
  'api:rest': {
    type: 'object',
    properties: {
      expectedVersion: { type: 'number' }
    },
    additionalProperties: false
  },

  // S3 storage capability (binding-time options)
  // Used by resolver tests for IAM policy effect/action/resource conflict detection.
  'storage:s3': {
    type: 'object',
    properties: {
      actions: {
        type: 'array',
        items: { type: 'string' }
      },
      resources: {
        type: 'array',
        items: { type: 'string' }
      },
      effect: {
        type: 'string',
        enum: ['Allow', 'Deny']
      }
    },
    additionalProperties: false
  }
};

/**
 * Environment variable allow-lists per capability
 * Key: capability (e.g., 's3:bucket', 'kms:key')
 * Value: Array of allowed environment variable keys
 * 
 * If a capability is not in this list, all non-sensitive env vars are allowed
 * (for backwards compatibility), but a warning is logged.
 */
const envAllowLists: Record<string, string[]> = {
  's3:bucket': [
    'S3_BUCKET_NAME',
    'S3_BUCKET_ARN',
    'S3_BUCKET_REGION',
    'S3_BUCKET_PREFIX',
    'S3_BUCKET_URL'
  ],
  'kms:key': [
    'KMS_KEY_ID',
    'KMS_KEY_ARN',
    'KMS_KEY_ALIAS',
    'KMS_KEY_REGION'
  ],
  'secretsmanager:secret': [
    'SECRET_NAME',
    'SECRET_ARN',
    'SECRET_REGION',
    'SECRET_VERSION_ID',
    'SECRET_VERSION_STAGE'
  ],
  'dynamodb:table': [
    'DYNAMODB_TABLE_NAME',
    'DYNAMODB_TABLE_ARN',
    'DYNAMODB_TABLE_REGION',
    'DYNAMODB_INDEX_NAME',
    'DYNAMODB_STREAM_ARN'
  ],
  'sqs:queue': [
    'SQS_QUEUE_NAME',
    'SQS_QUEUE_URL',
    'SQS_QUEUE_ARN',
    'SQS_QUEUE_REGION',
    'SQS_DLQ_URL',
    'SQS_DLQ_ARN'
  ],
  'sns:topic': [
    'SNS_TOPIC_NAME',
    'SNS_TOPIC_ARN',
    'SNS_TOPIC_REGION'
  ],
  'lambda:function': [
    'LAMBDA_FUNCTION_NAME',
    'LAMBDA_FUNCTION_ARN',
    'LAMBDA_FUNCTION_REGION',
    'LAMBDA_FUNCTION_QUALIFIER',
    'LAMBDA_FUNCTION_VERSION'
  ],
  'rds:database': [
    'RDS_DB_INSTANCE_IDENTIFIER',
    'RDS_DB_CLUSTER_IDENTIFIER',
    'RDS_ENDPOINT',
    'RDS_PORT',
    'RDS_DATABASE_NAME',
    'RDS_REGION'
  ],
  'vpc:network': [
    'VPC_ID',
    'VPC_CIDR',
    'SUBNET_ID',
    'SUBNET_IDS',
    'SECURITY_GROUP_ID',
    'AVAILABILITY_ZONE'
  ],
  'security-group:rule': [
    'SECURITY_GROUP_RULE_TARGET_SG_ID',
    'SECURITY_GROUP_RULE_VPC_ID',
    'SECURITY_GROUP_RULE_COUNT',
    'SECURITY_GROUP_RULES'
  ]
};

/**
 * Get JSON Schema for a capability's directive.options
 * 
 * @param capability - Capability type (e.g., 's3:bucket', 'kms:key')
 * @returns JSON Schema for options validation, or undefined if no schema defined
 */
export function getDirectiveSchema(capability: string): any | undefined {
  return capabilitySchemas[capability];
}

/**
 * Get environment variable allow-list for a capability
 * 
 * @param capability - Capability type (e.g., 's3:bucket', 'kms:key')
 * @returns Array of allowed environment variable keys, or undefined if no allow-list defined
 */
export function getEnvAllowList(capability: string): string[] | undefined {
  return envAllowLists[capability];
}

/**
 * Register a custom schema for a capability
 * 
 * @param capability - Capability type
 * @param schema - JSON Schema for options validation
 */
export function registerDirectiveSchema(capability: string, schema: any): void {
  capabilitySchemas[capability] = schema;
}

/**
 * Register a custom environment variable allow-list for a capability
 * 
 * @param capability - Capability type
 * @param allowList - Array of allowed environment variable keys
 */
export function registerEnvAllowList(capability: string, allowList: string[]): void {
  envAllowLists[capability] = allowList;
}

