# DynamoDB Table Component

Enterprise-grade Amazon DynamoDB table with advanced features including global tables, encryption, auto-scaling, and comprehensive monitoring for high-performance NoSQL applications.

## Overview

This component provides a fully managed DynamoDB table with:

- **Serverless Scale**: On-demand and provisioned capacity with auto-scaling
- **Global Distribution**: Multi-region global tables with eventual consistency
- **Security Integration**: Encryption at rest, fine-grained access control, and VPC endpoints
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Advanced Features**: Streams, backups, point-in-time recovery, and DAX caching

## Capabilities

- **database:dynamodb**: Provides NoSQL database connectivity for high-performance applications

## Configuration

```yaml
components:
  - name: user-sessions
    type: dynamodb-table
    config:
      tableName: UserSessions
      
      billingMode: ON_DEMAND
      # Alternative: PAY_PER_REQUEST for provisioned capacity
      # provisionedThroughput:
      #   readCapacityUnits: 100
      #   writeCapacityUnits: 50
      
      attributeDefinitions:
        - attributeName: sessionId
          attributeType: S
        - attributeName: userId
          attributeType: S
        - attributeName: createdAt
          attributeType: N
        - attributeName: expiresAt
          attributeType: N
      
      keySchema:
        - attributeName: sessionId
          keyType: HASH
      
      globalSecondaryIndexes:
        - indexName: UserIdIndex
          keySchema:
            - attributeName: userId
              keyType: HASH
            - attributeName: createdAt
              keyType: RANGE
          projection:
            projectionType: ALL
          # For ON_DEMAND tables, throughput is not specified
          # provisionedThroughput:
          #   readCapacityUnits: 50
          #   writeCapacityUnits: 25
        
        - indexName: ExpirationIndex
          keySchema:
            - attributeName: expiresAt
              keyType: HASH
          projection:
            projectionType: KEYS_ONLY
      
      localSecondaryIndexes:
        - indexName: SessionTypeIndex
          keySchema:
            - attributeName: sessionId
              keyType: HASH
            - attributeName: sessionType
              keyType: RANGE
          projection:
            projectionType: INCLUDE
            nonKeyAttributes:
              - userAgent
              - ipAddress
      
      streamSpecification:
        streamEnabled: true
        streamViewType: NEW_AND_OLD_IMAGES
      
      sseSpecification:
        sseEnabled: true
        kmsMasterKeyId: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      
      pointInTimeRecoveryEnabled: true
      
      backupPolicy:
        pointInTimeRecoveryEnabled: true
        backupPlan:
          ruleName: DailyBackups
          schedule: cron(0 2 * * ? *)
          retention: 30
      
      timeToLiveSpecification:
        enabled: true
        attributeName: expiresAt
      
      tags:
        data-type: session-store
        encryption-enabled: "true"
        backup-enabled: "true"
```

## Binding Examples

### Lambda Function to DynamoDB

```yaml
components:
  - name: session-manager
    type: lambda-api
    config:
      handler: src/sessions.handler
      environment:
        variables:
          SESSIONS_TABLE: ${user-sessions.tableName}
          USER_ID_INDEX: UserIdIndex
    binds:
      - to: user-sessions
        capability: database:dynamodb
        access: read-write
```

### DynamoDB Streams to Lambda

```yaml
components:
  - name: session-processor
    type: lambda-worker
    config:
      handler: src/process-sessions.handler
      eventSourceMappings:
        - eventSourceArn: ${user-sessions.streamArn}
          startingPosition: TRIM_HORIZON
          batchSize: 10
    binds:
      - to: user-sessions
        capability: database:dynamodb
        access: stream-read
```

## Compliance Features

### Commercial
- Basic encryption with AWS managed keys
- Standard backup configuration
- Cost-optimized on-demand billing

### FedRAMP Moderate
- Customer-managed KMS encryption with rotation
- Point-in-time recovery enabled
- Enhanced monitoring and logging
- 1-year backup retention
- Comprehensive audit trails

### FedRAMP High
- Strict encryption requirements with key rotation
- Advanced backup policies with extended retention
- Enhanced security monitoring and alerting
- 10-year audit log retention
- Global tables for disaster recovery
- Advanced access logging and monitoring

## Advanced Configuration

### Global Tables Setup

```yaml
config:
  globalTables:
    regions:
      - us-east-1
      - us-west-2
      - eu-west-1
    
    replicationGroup:
      - region: us-east-1
        pointInTimeRecoveryEnabled: true
        kmsKeyId: arn:aws:kms:us-east-1:123456789012:key/primary-key
      - region: us-west-2
        pointInTimeRecoveryEnabled: true
        kmsKeyId: arn:aws:kms:us-west-2:123456789012:key/west-key
      - region: eu-west-1
        pointInTimeRecoveryEnabled: true
        kmsKeyId: arn:aws:kms:eu-west-1:123456789012:key/eu-key
```

### Auto Scaling Configuration

```yaml
config:
  billingMode: PROVISIONED
  provisionedThroughput:
    readCapacityUnits: 100
    writeCapacityUnits: 50
  
  autoScaling:
    readCapacity:
      minCapacity: 5
      maxCapacity: 1000
      targetTrackingScalingPolicyConfiguration:
        targetValue: 70.0
        scaleInCooldown: 60
        scaleOutCooldown: 60
    
    writeCapacity:
      minCapacity: 5
      maxCapacity: 1000
      targetTrackingScalingPolicyConfiguration:
        targetValue: 70.0
        scaleInCooldown: 60
        scaleOutCooldown: 60
```

### DAX Cluster Integration

```yaml
config:
  daxCluster:
    enabled: true
    clusterName: user-sessions-dax
    nodeType: dax.r4.large
    replicationFactor: 3
    
    subnetGroupName: dax-subnet-group
    securityGroupIds:
      - sg-dax-cluster
    
    parameterGroupName: custom-dax-params
    
    sseSpecification:
      enabled: true
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Read/write capacity, throttling, errors, item counts
- **DynamoDB Insights**: Performance analysis and optimization recommendations  
- **CloudWatch Alarms**: Capacity utilization, throttling, and error rate monitoring
- **AWS X-Ray**: Request tracing for DynamoDB operations
- **Custom Metrics**: Application-specific performance indicators

### Monitoring Levels

- **Basic**: Standard DynamoDB metrics and basic error tracking
- **Enhanced**: Detailed performance metrics + capacity monitoring + throttling analysis
- **Comprehensive**: Enhanced + query optimization + security monitoring + compliance reporting

## Security Features

### Encryption
- Encryption at rest with customer-managed KMS keys
- Encryption in transit for all client connections
- Automatic key rotation support
- Encrypted backups and global table replication

### Access Control
- Fine-grained IAM policies for table and index access
- Resource-based policies for cross-account access
- VPC endpoints for private connectivity
- Conditional access based on item attributes

### Data Protection
- Point-in-time recovery for data restoration
- Automated and manual backup strategies
- Time-to-live (TTL) for automatic data expiration
- Data masking and attribute-level permissions

## Data Modeling Patterns

### Single Table Design

```javascript
// User management single table design
const userTable = {
  tableName: 'UserManagement',
  
  // Partition Key: PK, Sort Key: SK
  keySchema: [
    { attributeName: 'PK', keyType: 'HASH' },
    { attributeName: 'SK', keyType: 'RANGE' }
  ],
  
  // GSI for querying by different access patterns
  globalSecondaryIndexes: [
    {
      indexName: 'GSI1',
      keySchema: [
        { attributeName: 'GSI1PK', keyType: 'HASH' },
        { attributeName: 'GSI1SK', keyType: 'RANGE' }
      ]
    }
  ]
};

// Data patterns:
// User: PK=USER#123, SK=PROFILE
// User Orders: PK=USER#123, SK=ORDER#456
// Order Details: PK=ORDER#456, SK=DETAIL
// User Sessions: PK=USER#123, SK=SESSION#789
```

### Time Series Data

```javascript
// IoT sensor data time series pattern
const sensorDataTable = {
  tableName: 'SensorData',
  
  keySchema: [
    { attributeName: 'deviceId', keyType: 'HASH' },
    { attributeName: 'timestamp', keyType: 'RANGE' }
  ],
  
  // TTL for automatic data cleanup
  timeToLiveSpecification: {
    enabled: true,
    attributeName: 'expiresAt'
  },
  
  // GSI for querying by sensor type
  globalSecondaryIndexes: [
    {
      indexName: 'SensorTypeIndex',
      keySchema: [
        { attributeName: 'sensorType', keyType: 'HASH' },
        { attributeName: 'timestamp', keyType: 'RANGE' }
      ]
    }
  ]
};
```

## Performance Optimization

### Query Optimization

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

class DynamoDBService {
    constructor(tableName) {
        this.tableName = tableName;
    }
    
    // Efficient query with pagination
    async getUserSessions(userId, limit = 20, lastKey = null) {
        const params = {
            TableName: this.tableName,
            IndexName: 'UserIdIndex',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            },
            ScanIndexForward: false, // Sort descending
            Limit: limit
        };
        
        if (lastKey) {
            params.ExclusiveStartKey = lastKey;
        }
        
        return await dynamodb.query(params).promise();
    }
    
    // Batch operations for efficiency
    async batchWriteSessions(sessions) {
        const chunks = this.chunkArray(sessions, 25); // DynamoDB batch limit
        
        const promises = chunks.map(chunk => {
            const params = {
                RequestItems: {
                    [this.tableName]: chunk.map(session => ({
                        PutRequest: {
                            Item: session
                        }
                    }))
                }
            };
            
            return dynamodb.batchWrite(params).promise();
        });
        
        return await Promise.all(promises);
    }
    
    // Efficient filtering with expression attribute names
    async getActiveSessions(userId) {
        const params = {
            TableName: this.tableName,
            IndexName: 'UserIdIndex',
            KeyConditionExpression: 'userId = :userId',
            FilterExpression: '#status = :active AND expiresAt > :now',
            ExpressionAttributeNames: {
                '#status': 'status' // Reserved keyword
            },
            ExpressionAttributeValues: {
                ':userId': userId,
                ':active': 'ACTIVE',
                ':now': Date.now()
            }
        };
        
        return await dynamodb.query(params).promise();
    }
    
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}
```

### Capacity Management

```javascript
// Capacity monitoring and alerting
class CapacityMonitor {
    constructor(tableName, cloudwatch) {
        this.tableName = tableName;
        this.cloudwatch = cloudwatch;
    }
    
    async checkCapacityMetrics() {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - (15 * 60 * 1000)); // 15 minutes ago
        
        const readCapacityParams = {
            Namespace: 'AWS/DynamoDB',
            MetricName: 'ConsumedReadCapacityUnits',
            Dimensions: [
                {
                    Name: 'TableName',
                    Value: this.tableName
                }
            ],
            StartTime: startTime,
            EndTime: endTime,
            Period: 300, // 5 minutes
            Statistics: ['Sum', 'Average']
        };
        
        const readMetrics = await this.cloudwatch.getMetricStatistics(readCapacityParams).promise();
        
        // Analyze metrics and trigger scaling if needed
        this.analyzeAndScale(readMetrics);
    }
    
    analyzeAndScale(metrics) {
        // Custom logic for capacity analysis
        const averageConsumption = metrics.Datapoints.reduce((sum, point) => 
            sum + point.Average, 0) / metrics.Datapoints.length;
        
        console.log(`Average read capacity consumption: ${averageConsumption}`);
        
        // Implement scaling logic based on thresholds
        if (averageConsumption > 80) {
            console.log('High capacity usage detected - consider scaling up');
        }
    }
}
```

## Stream Processing

### Lambda Stream Processor

```javascript
exports.handler = async (event) => {
    console.log(`Processing ${event.Records.length} DynamoDB stream records`);
    
    for (const record of event.Records) {
        try {
            await processStreamRecord(record);
        } catch (error) {
            console.error('Error processing record:', error);
            // Implement retry logic or DLQ handling
            throw error; // Fail the batch to retry
        }
    }
    
    return { statusCode: 200 };
};

async function processStreamRecord(record) {
    const { eventName, dynamodb } = record;
    
    switch (eventName) {
        case 'INSERT':
            await handleInsert(dynamodb.NewImage);
            break;
        case 'MODIFY':
            await handleModify(dynamodb.OldImage, dynamodb.NewImage);
            break;
        case 'REMOVE':
            await handleRemove(dynamodb.OldImage);
            break;
    }
}

async function handleInsert(newImage) {
    // Process new item insertion
    const sessionData = AWS.DynamoDB.Converter.unmarshall(newImage);
    
    // Example: Update user activity metrics
    await updateUserActivity(sessionData.userId, 'session_created');
    
    // Example: Send notification
    await sendSessionNotification(sessionData);
}

async function handleModify(oldImage, newImage) {
    // Process item modification
    const oldData = AWS.DynamoDB.Converter.unmarshall(oldImage);
    const newData = AWS.DynamoDB.Converter.unmarshall(newImage);
    
    // Check for specific changes
    if (oldData.status !== newData.status) {
        await handleStatusChange(newData.sessionId, oldData.status, newData.status);
    }
}

async function handleRemove(oldImage) {
    // Process item removal (could be TTL expiration)
    const sessionData = AWS.DynamoDB.Converter.unmarshall(oldImage);
    
    // Cleanup related resources
    await cleanupSessionResources(sessionData.sessionId);
}
```

## Backup and Recovery

### Automated Backup Strategy

```yaml
config:
  backupPolicy:
    pointInTimeRecoveryEnabled: true
    
    continuousBackups:
      enabled: true
      
    scheduledBackups:
      - ruleName: DailyBackups
        schedule: cron(0 2 * * ? *)
        retention: 30
        copyTags: true
        
      - ruleName: WeeklyBackups
        schedule: cron(0 2 ? * SUN *)
        retention: 365
        copyTags: true
```

### Cross-Region Backup

```javascript
// Lambda function for cross-region backup
const AWS = require('aws-sdk');

exports.handler = async (event) => {
    const dynamodb = new AWS.DynamoDB();
    const s3 = new AWS.S3();
    
    const tableName = process.env.TABLE_NAME;
    const backupBucket = process.env.BACKUP_BUCKET;
    
    try {
        // Create on-demand backup
        const backupResult = await dynamodb.createBackup({
            TableName: tableName,
            BackupName: `${tableName}-${new Date().toISOString()}`
        }).promise();
        
        // Export to S3 for cross-region durability
        const exportResult = await dynamodb.exportTableToPointInTime({
            TableArn: backupResult.BackupDetails.BackupArn,
            S3Bucket: backupBucket,
            S3Prefix: `exports/${tableName}/`,
            ExportFormat: 'DYNAMODB_JSON'
        }).promise();
        
        console.log('Backup and export completed:', exportResult.ExportDescription.ExportArn);
        
    } catch (error) {
        console.error('Backup failed:', error);
        throw error;
    }
};
```

## Troubleshooting

### Common Issues

1. **Throttling Errors**
   - Monitor capacity metrics and auto-scaling settings
   - Review access patterns for hot partitions
   - Consider using on-demand billing for unpredictable workloads

2. **Query Performance Issues**
   - Use query instead of scan operations when possible
   - Design proper partition keys to distribute load evenly
   - Implement proper pagination for large result sets

3. **GSI Throttling**
   - Monitor GSI capacity separately from base table
   - Consider sparse GSI design patterns
   - Review projection types to minimize storage costs

### Debug Mode

Enable comprehensive monitoring and logging:

```yaml
config:
  tags:
    debug: "true"
    detailed-monitoring: "enabled"
    
  # Enable all available metrics
  contributorInsightsSpecification:
    enabled: true
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/session-store/` - User session management with DynamoDB
- `examples/iot-time-series/` - IoT sensor data with time series patterns
- `examples/global-leaderboard/` - Gaming leaderboard with global tables

## API Reference

### DynamodbTableComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (DynamoDB Table, GSIs, Auto Scaling, Backups)
- `getCapabilities()`: Returns database:dynamodb capability
- `getType()`: Returns 'dynamodb-table'

### Configuration Interfaces

- `DynamodbTableConfig`: Main configuration interface
- `DYNAMODB_TABLE_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.