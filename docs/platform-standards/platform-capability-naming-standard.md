# Platform Capability Naming Standard

**Document ID**: PLAT-STD-CAPABILITY-NAMING-V1.0  
**Version**: 1.0  
**Status**: Published  
**Last Updated**: September 9, 2025  
**Author**: Platform Engineering Team  
**Standard**: Conforms to IEC/IEEE 82079-1:2019

## 1. Information for Use - Identification and Principles (IEC/IEEE 82079-1)

This document provides the definitive specification for the platform's Capability Naming Standard. A capability is the public, machine-readable contract that a component exposes to the platform, declaring the resources and connection information it makes available for other components to use.

This standard is the foundational language of our platform's automated wiring system. **Adherence to this standard is mandatory for all components.**

### Core Principles

**Principle of Decoupling**: Components interact via abstract capabilities, not concrete implementations. A lambda-api does not know about an rds-postgres component; it only knows how to bind to a component that provides the `db:postgres` capability.

**Principle of Predictability**: The data shape for each capability is strictly defined. This ensures that any component consuming a capability (e.g., a BinderStrategy) can reliably access the required information (like ARNs, endpoints, and security group IDs).

**Principle of Extensibility**: This standard provides a clear, consistent pattern for adding new types of interactions to the platform as the component library grows.

## 2. Intended Audience (IEC/IEEE 82079-1)

| Audience | Information Needs |
|----------|-------------------|
| **Platform Engineers / Component Developers** | A definitive reference for the correct capability keys and data shapes to implement when creating new components. |
| **Application Developers** | A clear list of available capabilities to use in the binds and triggers sections of their service.yml manifests. |
| **AI Coding Agents** | A machine-readable vocabulary to correctly generate binds directives in manifests and to correctly implement the `_registerCapability()` method when generating new components. |

## 3. The Naming Standard

All capability keys **MUST** follow the standardized `<category>:<type>` format.

- **`<category>`**: A broad, logical grouping for the resource type. This is used for high-level classification. Examples include `db`, `queue`, `api`, `net`.
- **`<type>`**: The specific technology or protocol that the capability represents. Examples include `postgres`, `sqs`, `rest`, `redis`.

This structure is designed to be both human-readable and easily parsable by the platform's tooling.

## 4. The Standard Capability Vocabulary & Data Shape Contracts

This section is the definitive registry of all officially supported capabilities and the precise data shape that components providing these capabilities **MUST** expose. The "Data Shape Contract" defines the fields and their expected CDK-native value source.

### Database Capabilities

#### `db:postgres`

**Definition**: Represents a PostgreSQL-compatible database endpoint.

**Data Shape Contract**:
| Field | Type | Description & CDK Source |
| :--- | :--- | :--- |
| host | string | The connection endpoint hostname. From rdsInstance.dbInstanceEndpointAddress. |
| port | number | The connection endpoint port. From rdsInstance.dbInstanceEndpointPort. |
| dbName| string | The initial database name. From the component's config. |
| secretArn| string | The ARN of the Secrets Manager secret containing credentials. From rdsInstance.secret.secretArn. |
| sgId | string | The ID of the database's primary security group. From rdsInstance.connections.securityGroups[0].securityGroupId. |
| instanceArn| string | The ARN of the RDS instance. From rdsInstance.instanceArn. |

**Example Providers**: `rds-postgres`, `rds-postgres-import`

#### `db:dynamodb`

**Definition**: Represents a DynamoDB table.

**Data Shape Contract**:
| Field | Type | Description & CDK Source |
| :--- | :--- | :--- |
| tableName | string | The name of the table. From table.tableName. |
| tableArn | string | The ARN of the table. From table.tableArn. |
| tableStreamArn| string?| The ARN of the table's stream, if enabled. From table.tableStreamArn. |

**Example Providers**: `dynamodb-table`, `dynamodb-table-import`

### Messaging Capabilities

#### `queue:sqs`

**Definition**: Represents an Amazon SQS queue.

**Data Shape Contract**:
| Field | Type | Description & CDK Source |
| :--- | :--- | :--- |
| queueUrl | string | The URL of the queue. From queue.queueUrl. |
| queueArn | string | The ARN of the queue. From queue.queueArn. |

**Example Providers**: `sqs-queue`, `sqs-queue-import`

#### `topic:sns`

**Definition**: Represents an Amazon SNS topic.

**Data Shape Contract**:
| Field | Type | Description & CDK Source |
| :--- | :--- | :--- |
| topicArn | string | The ARN of the topic. From topic.topicArn. |
| topicName| string | The name of the topic. From topic.topicName. |

**Example Providers**: `sns-topic`, `sns-topic-import`

### Storage Capabilities

#### `bucket:s3`

**Definition**: Represents an Amazon S3 bucket.

**Data Shape Contract**:
| Field | Type | Description & CDK Source |
| :--- | :--- | :--- |
| bucketName | string | The name of the bucket. From bucket.bucketName. |
| bucketArn | string | The ARN of the bucket. From bucket.bucketArn. |

**Example Providers**: `s3-bucket`, `s3-bucket-import`

### API & Compute Capabilities

#### `api:rest`

**Definition**: Represents a RESTful API endpoint, typically managed by API Gateway.

**Data Shape Contract**:
| Field | Type | Description & CDK Source |
| :--- | :--- | :--- |
| apiId | string | The unique ID of the API Gateway. From api.restApiId. |
| endpointUrl| string | The invocation URL for the API. From api.url. |
| stageName | string | The name of the default deployment stage. From api.deploymentStage.stageName. |

**Example Providers**: `lambda-api`, `api-gateway`

#### `service:connect`

**Definition**: Represents a discoverable microservice within an ECS Service Connect mesh.

**Data Shape Contract**:
| Field | Type | Description & CDK Source |
| :--- | :--- | :--- |
| dnsName | string | The internal DNS name for service discovery (e.g., payments.internal). |
| port | number | The port the service is listening on. |
| sgId | string | The ID of the service's security group. |

**Example Providers**: `ecs-fargate-service`, `ecs-ec2-service`

### Networking & Caching Capabilities

#### `net:vpc`

**Definition**: Represents a Virtual Private Cloud.

**Data Shape Contract**:
| Field | Type | Description & CDK Source |
| :--- | :--- | :--- |
| vpcId | string | The ID of the VPC. From vpc.vpcId. |
| publicSubnetIds| string[] | A list of public subnet IDs. From vpc.publicSubnets. |
| privateSubnetIds| string[] | A list of private subnet IDs. From vpc.privateSubnets. |
| isolatedSubnetIds|string[] | A list of isolated subnet IDs. From vpc.isolatedSubnets.|

**Example Providers**: `vpc`, `vpc-import`

#### `cache:redis`

**Definition**: Represents an ElastiCache for Redis endpoint.

**Data Shape Contract**:
| Field | Type | Description & CDK Source |
| :--- | :--- | :--- |
| primaryEndpointAddress | string | The connection endpoint address. From replicationGroup.attrPrimaryEndPointAddress. |
| primaryEndpointPort| string | The connection endpoint port. From replicationGroup.attrPrimaryEndPointPort. |
| authTokenSecretArn| string?| The ARN of the Secrets Manager secret containing the AUTH token. |
| sgId | string | The ID of the cache cluster's primary security group. |

**Example Providers**: `elasticache-redis`, `elasticache-redis-import`

## 5. Examples in Practice

This standard comes to life in the `service.yml` manifest, where a developer uses a capability key in a binds directive.

### Scenario: A lambda-api needs to connect to an rds-postgres database

```yaml
# service.yml
components:
  - name: customer-db
    type: rds-postgres
    config:
      dbName: "customers"

  - name: user-api
    type: lambda-api
    config:
      handler: "src/api.handler"
    binds:
      # The developer specifies the target component, the capability, and the access level.
      - to: customer-db
        capability: "db:postgres"
        access: "readwrite"
```

In this example, the `LambdaToRdsBinder` is invoked. It knows it will receive an object for `customer-db` that conforms to the `db:postgres` data shape contract, allowing it to safely access the `secretArn` and `sgId` to perform the necessary wiring.