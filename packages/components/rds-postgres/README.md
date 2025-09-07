# RDS PostgreSQL Component

Enterprise-grade Amazon RDS PostgreSQL database with advanced features including high availability, automated backups, encryption, and comprehensive monitoring capabilities.

## Overview

This component provides a fully managed PostgreSQL database with:

- **High Availability**: Multi-AZ deployments with automatic failover
- **Security Integration**: Encryption at rest/transit, VPC isolation, and secrets management
- **Automated Management**: Backups, maintenance, monitoring, and scaling
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Performance Optimization**: Read replicas, connection pooling, and parameter tuning

## Capabilities

- **database:postgres**: Provides PostgreSQL database connectivity for applications

## Configuration

```yaml
components:
  - name: app-database
    type: rds-postgres
    config:
      dbInstanceIdentifier: app-production-db
      dbName: application
      
      engine: postgres
      engineVersion: "15.4"
      instanceClass: db.r6g.xlarge
      
      allocatedStorage: 100
      maxAllocatedStorage: 1000
      storageType: gp3
      storageEncrypted: true
      kmsKeyId: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      
      masterUsername: dbadmin
      manageMasterUserPassword: true
      masterUserSecretKmsKeyId: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      
      vpcSecurityGroupIds:
        - sg-database-access
        - sg-monitoring
      
      dbSubnetGroupName: app-db-subnet-group
      
      multiAZ: true
      availabilityZone: us-east-1a
      
      backupRetentionPeriod: 30
      backupWindow: "03:00-04:00"
      maintenanceWindow: "sun:04:00-sun:05:00"
      
      monitoringInterval: 60
      monitoringRoleArn: arn:aws:iam::123456789012:role/rds-monitoring-role
      enablePerformanceInsights: true
      performanceInsightsRetentionPeriod: 7
      performanceInsightsKMSKeyId: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      
      enableCloudwatchLogsExports:
        - postgresql
      
      parameterGroupName: custom-postgres15-params
      optionGroupName: custom-postgres15-options
      
      deletionProtection: true
      deleteAutomatedBackups: false
      
      tags:
        database-type: postgresql
        environment: production
        backup-required: "true"
        high-availability: "true"
```

## Binding Examples

### Lambda Function to Database

```yaml
components:
  - name: api-service
    type: lambda-api
    config:
      handler: src/api.handler
      environment:
        variables:
          DB_HOST: ${app-database.endpoint.address}
          DB_PORT: ${app-database.endpoint.port}
          DB_NAME: ${app-database.databaseName}
          DB_SECRET_ARN: ${app-database.masterUserSecret.secretArn}
    binds:
      - to: app-database
        capability: database:postgres
        access: read-write
```

### ECS Service to Database

```yaml
components:
  - name: web-service
    type: ecs-fargate-service
    config:
      taskDefinition:
        containerDefinitions:
          - name: web-app
            environment:
              - name: DATABASE_URL
                value: postgresql://${app-database.endpoint.address}:${app-database.endpoint.port}/${app-database.databaseName}
            secrets:
              - name: DB_PASSWORD
                valueFrom: ${app-database.masterUserSecret.secretArn}:password::
    binds:
      - to: app-database
        capability: database:postgres
        access: read-write
```

## Compliance Features

### Commercial
- Basic encryption and backups
- Standard monitoring configuration
- Cost-optimized instance types

### FedRAMP Moderate
- Enhanced encryption with customer-managed KMS keys
- Extended backup retention (30 days)
- Comprehensive monitoring with Performance Insights
- Multi-AZ deployment for high availability
- 1-year audit log retention

### FedRAMP High
- Strict encryption requirements with key rotation
- Extended backup retention (90 days)
- Advanced monitoring and alerting
- Mandatory deletion protection
- 10-year audit log retention
- Enhanced security monitoring

## Advanced Configuration

### Read Replica Setup

```yaml
config:
  readReplicas:
    - replicaIdentifier: app-db-read-replica-1
      instanceClass: db.r6g.large
      availabilityZone: us-east-1b
      publiclyAccessible: false
      monitoringInterval: 60
    
    - replicaIdentifier: app-db-read-replica-2
      instanceClass: db.r6g.large
      availabilityZone: us-east-1c
      publiclyAccessible: false
```

### Custom Parameter Group

```yaml
config:
  parameterGroupName: custom-postgres15-optimized
  parameters:
    shared_preload_libraries: 'pg_stat_statements,auto_explain'
    max_connections: 200
    shared_buffers: '256MB'
    effective_cache_size: '1GB'
    work_mem: '4MB'
    maintenance_work_mem: '64MB'
    checkpoint_completion_target: 0.9
    wal_buffers: '16MB'
    default_statistics_target: 100
    random_page_cost: 1.1
    effective_io_concurrency: 200
    min_wal_size: '1GB'
    max_wal_size: '4GB'
    
    # Logging configuration
    log_statement: 'all'
    log_duration: 'on'
    log_line_prefix: '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
    log_checkpoints: 'on'
    log_connections: 'on'
    log_disconnections: 'on'
    log_lock_waits: 'on'
    log_temp_files: 0
```

### Connection Pooling with RDS Proxy

```yaml
config:
  rdsProxy:
    enabled: true
    proxyName: app-db-proxy
    engineFamily: POSTGRESQL
    auth:
      - authScheme: SECRETS
        secretArn: ${app-database.masterUserSecret.secretArn}
        iamAuth: DISABLED
    
    targetGroups:
      - dbInstanceIdentifiers:
          - ${app-database.dbInstanceIdentifier}
        connectionPoolConfig:
          maxConnectionsPercent: 100
          maxIdleConnectionsPercent: 50
          connectionBorrowTimeoutSeconds: 120
          sessionPinningFilters:
            - EXCLUDE_VARIABLE_SETS
    
    vpcSubnetIds:
      - subnet-12345678
      - subnet-87654321
    
    requireTLS: true
    idleClientTimeout: 1800
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Database performance, connections, storage, and replication
- **Performance Insights**: Query performance analysis and optimization recommendations
- **CloudWatch Logs**: PostgreSQL logs with configurable export
- **Enhanced Monitoring**: OS-level metrics and detailed database metrics
- **Custom Alarms**: Database health, performance thresholds, and resource utilization

### Monitoring Levels

- **Basic**: Standard RDS metrics and basic alerting
- **Enhanced**: Performance Insights + enhanced monitoring + detailed logs
- **Comprehensive**: Enhanced + query analysis + performance optimization + security monitoring

## Security Features

### Encryption
- Encryption at rest with KMS customer-managed keys
- Encryption in transit with SSL/TLS
- Automatic key rotation support
- Encrypted backups and snapshots

### Network Security
- VPC isolation with private subnets
- Security group controls for database access
- No public accessibility by default
- VPC endpoints for AWS service access

### Access Control
- IAM database authentication support
- Master user credentials managed by Secrets Manager
- Role-based access control within PostgreSQL
- Network-based access restrictions

## Database Management

### Automated Backups

```yaml
config:
  backupRetentionPeriod: 35
  backupWindow: "03:00-04:00"
  copyTagsToSnapshot: true
  deleteAutomatedBackups: false
  
  # Manual snapshots
  finalSnapshotIdentifier: app-db-final-snapshot
  skipFinalSnapshot: false
```

### Maintenance and Updates

```yaml
config:
  maintenanceWindow: "sun:04:00-sun:05:00"
  autoMinorVersionUpgrade: true
  allowMajorVersionUpgrade: false
  
  # Blue/Green deployment support
  blueGreenUpdate:
    enabled: true
    deletionPolicy: Delete
```

### Database Initialization

```sql
-- Example initialization script for new databases
-- Run via Lambda function or EC2 instance after database creation

-- Create application user
CREATE USER app_user WITH PASSWORD 'managed_by_secrets_manager';

-- Create application database
CREATE DATABASE myapp OWNER app_user;

-- Connect to application database
\c myapp;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant permissions
GRANT CONNECT ON DATABASE myapp TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT CREATE ON SCHEMA public TO app_user;

-- Create application tables
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

## Performance Optimization

### Instance Sizing Guidelines

```yaml
# Development/Testing
config:
  instanceClass: db.t4g.micro
  allocatedStorage: 20
  
# Small Production
config:
  instanceClass: db.r6g.large
  allocatedStorage: 100
  
# Large Production
config:
  instanceClass: db.r6g.2xlarge
  allocatedStorage: 500
  maxAllocatedStorage: 2000
  
# High Performance
config:
  instanceClass: db.r6g.4xlarge
  storageType: io1
  iops: 10000
```

### Connection Management

```javascript
// Node.js connection pool example
const { Pool } = require('pg');
const AWS = require('aws-sdk');

class DatabaseConnection {
    constructor() {
        this.pool = null;
        this.secretsManager = new AWS.SecretsManager();
    }
    
    async initialize() {
        const secret = await this.getSecret('app-database-secret');
        
        this.pool = new Pool({
            host: secret.host,
            port: secret.port,
            database: secret.database,
            user: secret.username,
            password: secret.password,
            
            // Connection pool settings
            max: 20,                    // Maximum connections
            min: 5,                     // Minimum connections
            idleTimeoutMillis: 30000,   // Close idle connections after 30s
            connectionTimeoutMillis: 2000, // Fail fast on connection errors
            
            // SSL configuration
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        // Test connection
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        console.log('Database pool initialized successfully');
    }
    
    async getSecret(secretId) {
        const result = await this.secretsManager.getSecretValue({
            SecretId: secretId
        }).promise();
        
        return JSON.parse(result.SecretString);
    }
    
    async query(text, params) {
        const start = Date.now();
        const result = await this.pool.query(text, params);
        const duration = Date.now() - start;
        
        console.log('Query executed', { duration, text });
        return result;
    }
}
```

## Migration and Data Loading

### Database Migration Strategy

```javascript
// Migration example using node-pg-migrate
module.exports = {
    up: async (pgm) => {
        // Create users table
        pgm.createTable('users', {
            id: {
                type: 'uuid',
                primaryKey: true,
                default: pgm.func('uuid_generate_v4()')
            },
            email: {
                type: 'varchar(255)',
                notNull: true,
                unique: true
            },
            password_hash: {
                type: 'varchar(255)',
                notNull: true
            },
            created_at: {
                type: 'timestamp with time zone',
                default: pgm.func('NOW()')
            },
            updated_at: {
                type: 'timestamp with time zone',
                default: pgm.func('NOW()')
            }
        });
        
        // Create indexes
        pgm.createIndex('users', 'email');
        pgm.createIndex('users', 'created_at');
        
        // Create updated_at trigger
        pgm.sql(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
            
            CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        `);
    },
    
    down: async (pgm) => {
        pgm.dropTable('users', { cascade: true });
        pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;');
    }
};
```

## Troubleshooting

### Common Issues

1. **Connection Timeout Errors**
   - Check security group rules allow database port (5432)
   - Verify network ACLs and routing
   - Review connection pool configuration

2. **Performance Issues**
   - Monitor CloudWatch metrics for CPU/memory usage
   - Use Performance Insights to identify slow queries
   - Review parameter group settings

3. **Storage Full Errors**
   - Enable storage auto-scaling with maxAllocatedStorage
   - Monitor free storage space metrics
   - Review backup retention and log retention settings

### Debug Mode

Enable detailed monitoring and logging:

```yaml
config:
  monitoringInterval: 15  # Most frequent monitoring
  enablePerformanceInsights: true
  performanceInsightsRetentionPeriod: 31
  enableCloudwatchLogsExports:
    - postgresql
  
  tags:
    debug: "true"
    detailed-monitoring: "enabled"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/web-app-database/` - Web application with RDS PostgreSQL
- `examples/microservices-database/` - Shared database for microservices
- `examples/data-warehouse/` - Analytics database setup

## API Reference

### RdsPostgresComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (RDS Instance, Subnet Group, Parameter Group, etc.)
- `getCapabilities()`: Returns database:postgres capability
- `getType()`: Returns 'rds-postgres'

### Configuration Interfaces

- `RdsPostgresConfig`: Main configuration interface
- `RDS_POSTGRES_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.