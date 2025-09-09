# EC2 + RDS + ElastiCache Binding Example

This example demonstrates the complete binding capabilities between EC2, RDS PostgreSQL, and ElastiCache Redis components using the platform's binding system.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   EC2 Instance  │    │  RDS PostgreSQL  │    │ ElastiCache Redis   │
│   (web-server)  │────│ (app-database)   │    │  (session-cache)    │
│                 │    │                  │    │                     │
│ - t3.small      │    │ - db.t3.micro    │    │ - cache.t3.micro    │
│ - AL2023        │    │ - 20GB storage   │    │ - Auth enabled      │
│ - CloudWatch    │    │ - Encrypted      │    │ - Encryption        │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## Binding Configuration

### EC2 to RDS PostgreSQL
- **Capability**: `db:postgres`
- **Access**: `readwrite`
- **Security**: Automatic security group ingress rules
- **IAM**: EC2 instance role granted access to database secrets
- **Environment Variables**:
  - `DATABASE_HOST`: RDS endpoint hostname
  - `DATABASE_PORT`: RDS port (5432)
  - `DATABASE_NAME`: Database name
  - `DATABASE_SECRET_ARN`: Secrets Manager ARN for credentials

### EC2 to ElastiCache Redis
- **Capability**: `cache:redis`
- **Access**: `readwrite`
- **Security**: Automatic security group ingress rules on port 6379
- **IAM**: EC2 instance role granted access to auth token secret
- **Environment Variables**:
  - `REDIS_HOST`: ElastiCache primary endpoint
  - `REDIS_PORT`: Redis port (6379)
  - `REDIS_AUTH_SECRET_ARN`: Secrets Manager ARN for auth token

## Platform Standards Compliance

### Security
- ✅ **Encryption**: All data encrypted at rest and in transit
- ✅ **Secrets Management**: Database and cache credentials stored in AWS Secrets Manager
- ✅ **Network Isolation**: Security groups configured automatically by bindings
- ✅ **IAM**: Least privilege access via binding-specific IAM policies

### Observability
- ✅ **Monitoring**: CloudWatch detailed monitoring enabled
- ✅ **Performance Insights**: Enabled for RDS
- ✅ **Enhanced Monitoring**: Enabled for RDS
- ✅ **CloudWatch Agent**: Installed on EC2 for custom metrics

### Compliance
- ✅ **Commercial Framework**: Standard security and monitoring
- ✅ **Backup & Recovery**: Automated backups configured
- ✅ **Maintenance Windows**: Scheduled for minimal impact

## Usage

1. **Update VPC and Subnet IDs**: Replace placeholder values in `service.yml`
2. **Deploy**: Use the platform CLI to deploy the service
3. **Connect**: The EC2 instance will have environment variables configured automatically
4. **Monitor**: Check CloudWatch dashboards for all components

## Environment Variables Available on EC2

The binding system automatically configures these environment variables on the EC2 instance:

```bash
# Database connection
DATABASE_HOST=mydb.abc123.us-east-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_NAME=webapp
DATABASE_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:rds-db-credentials/cluster-ABC123

# Redis connection
REDIS_HOST=myredis.abc123.cache.amazonaws.com
REDIS_PORT=6379
REDIS_AUTH_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:elasticache-auth-token-ABC123
```

## Application Integration

Example Python code to use the configured connections:

```python
import os
import boto3
import psycopg2
import redis
import json

# Get database credentials from Secrets Manager
def get_secret(secret_arn):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_arn)
    return json.loads(response['SecretString'])

# Connect to PostgreSQL
db_secret = get_secret(os.environ['DATABASE_SECRET_ARN'])
db_conn = psycopg2.connect(
    host=os.environ['DATABASE_HOST'],
    port=os.environ['DATABASE_PORT'],
    database=os.environ['DATABASE_NAME'],
    user=db_secret['username'],
    password=db_secret['password']
)

# Connect to Redis
redis_secret = get_secret(os.environ['REDIS_AUTH_SECRET_ARN'])
redis_client = redis.Redis(
    host=os.environ['REDIS_HOST'],
    port=int(os.environ['REDIS_PORT']),
    password=redis_secret['auth-token'],
    ssl=True
)

# Use the connections
cursor = db_conn.cursor()
cursor.execute("SELECT version()")
db_version = cursor.fetchone()

redis_client.set('app:status', 'running')
app_status = redis_client.get('app:status')

print(f"Database version: {db_version}")
print(f"App status: {app_status}")
```
