# Glue Job Component

Enterprise-grade AWS Glue Job for serverless ETL data processing workflows with advanced security, monitoring, and compliance features.

## Overview

This component provides a fully managed AWS Glue ETL Job with:

- **Serverless Processing**: Auto-scaling Spark-based ETL jobs
- **Advanced Security**: KMS encryption, VPC support, and IAM controls
- **Multi-Framework Support**: PySpark, Scala, and Python Shell jobs
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Cost Optimization**: Configurable worker types and auto-scaling

## Capabilities

- **etl:glue-job**: Provides ETL job execution for data processing workflows

## Configuration

```yaml
components:
  - name: customer-data-etl
    type: glue-job
    config:
      jobName: CustomerDataTransformation
      description: Transform raw customer data for analytics
      glueVersion: "4.0"
      jobType: glueetl
      
      scriptLocation: s3://company-glue-scripts/customer-etl.py
      
      command:
        pythonVersion: "3"
        scriptArguments:
          --source_database: raw_data
          --target_database: analytics
          --transformation_type: customer_360
      
      workerConfiguration:
        workerType: G.2X
        numberOfWorkers: 20
      
      maxConcurrentRuns: 3
      maxRetries: 3
      timeout: 1440  # 24 hours
      
      connections:
        - data-warehouse-connection
        - s3-vpc-endpoint
      
      securityConfiguration: customer-data-security-config
      
      defaultArguments:
        --enable-continuous-cloudwatch-log: "true"
        --enable-metrics: "true"
        --enable-spark-ui: "true"
        --enable-job-insights: "true"
        --job-bookmark-option: job-bookmark-enable
        --TempDir: s3://company-glue-temp/customer-etl/
      
      nonOverridableArguments:
        --compliance-framework: fedramp-moderate
        --data-classification: pii
      
      tags:
        data-pipeline: customer-analytics
        business-unit: marketing
        compliance: fedramp-moderate
```

## Binding Examples

### S3 Data Lake Integration

```yaml
components:
  - name: data-lake
    type: s3-bucket
    config:
      bucketName: company-data-lake
    binds:
      - from: customer-data-etl
        capability: storage:s3
        access: read-write
```

### RDS Database Connection

```yaml
components:
  - name: analytics-db
    type: rds-postgres
    config:
      instanceClass: db.r5.xlarge
    binds:
      - from: customer-data-etl
        capability: database:postgres
        access: write
```

## Compliance Features

### Commercial
- Basic monitoring and error handling
- Cost-optimized worker configuration (G.1X)
- Standard security settings

### FedRAMP Moderate
- Enhanced worker types (G.2X minimum)
- Comprehensive CloudWatch logging
- KMS encryption for all data
- 3 retry attempts for reliability
- 1-year audit log retention

### FedRAMP High
- High-performance workers (G.4X minimum)
- Maximum parallelism (50 workers)
- Enhanced monitoring and alerting
- 5 retry attempts for maximum reliability
- 10-year audit log retention
- Advanced security configurations

## Advanced Configuration

### Custom Security Configuration

```yaml
config:
  securityConfiguration: custom-encryption-config
  # Defines KMS encryption for:
  # - CloudWatch Logs
  # - Job Bookmarks
  # - S3 data encryption
```

### PySpark ETL Script Example

```python
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'source_database', 'target_database'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read from Data Catalog
datasource = glueContext.create_dynamic_frame.from_catalog(
    database=args['source_database'],
    table_name="customer_raw"
)

# Apply transformations
transformed = ApplyMapping.apply(
    frame=datasource,
    mappings=[
        ("customer_id", "string", "customer_id", "string"),
        ("first_name", "string", "first_name", "string"),
        ("last_name", "string", "last_name", "string"),
        ("email", "string", "email", "string"),
        ("registration_date", "string", "registration_date", "timestamp")
    ]
)

# Write to target
glueContext.write_dynamic_frame.from_catalog(
    frame=transformed,
    database=args['target_database'],
    table_name="customer_processed"
)

job.commit()
```

### Streaming ETL Configuration

```yaml
config:
  jobType: gluestreaming
  defaultArguments:
    --enable-continuous-cloudwatch-log: "true"
    --enable-streaming-checkpoints: "true"
    --checkpoint-location: s3://company-glue-checkpoints/streaming/
    --window-size: "100 seconds"
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Job duration, success/failure rates, DPU usage
- **CloudWatch Logs**: Detailed execution logs with error tracking
- **Spark UI**: Job monitoring and performance analysis
- **Job Insights**: Automatic performance recommendations
- **CloudWatch Alarms**: Failure detection and duration monitoring

### Monitoring Levels

- **Basic**: Job status and error monitoring
- **Enhanced**: Performance metrics + detailed logging
- **Comprehensive**: Enhanced + Spark UI + job insights + security monitoring

## Security Features

### Data Encryption
- S3 data encryption with KMS
- CloudWatch Logs encryption
- Job bookmark encryption
- In-transit encryption for all communications

### Network Security
- VPC endpoint support for S3 access
- Security group controls for database connections
- Private subnet deployment options
- Network isolation for sensitive workloads

### Access Control
- IAM role-based permissions
- Resource-specific access policies
- Cross-account role support
- Principle of least privilege

## Worker Types and Performance

### Standard Workers
- **Standard**: Legacy worker type (deprecated)
- **G.1X**: 1 DPU, 4GB memory, 16GB disk (cost-optimized)
- **G.2X**: 2 DPU, 8GB memory, 64GB disk (balanced)

### Memory-Optimized Workers
- **G.4X**: 4 DPU, 16GB memory, 64GB disk (memory-intensive)
- **G.8X**: 8 DPU, 32GB memory, 128GB disk (large datasets)

### Ray-based Workers
- **Z.2X**: Ray framework support for ML workloads

## Data Sources and Connections

### Supported Data Sources
- Amazon S3
- Amazon RDS (PostgreSQL, MySQL, etc.)
- Amazon Redshift
- Amazon DynamoDB
- JDBC-compatible databases
- Kafka streams (for streaming jobs)

### Connection Management

```yaml
config:
  connections:
    - name: postgres-connection
      connectionType: JDBC
      properties:
        JDBC_CONNECTION_URL: jdbc:postgresql://db.example.com:5432/analytics
        USERNAME: glue_user
        # Password stored in AWS Secrets Manager
```

## Job Scheduling and Triggers

### Trigger Configuration

```yaml
# Note: Triggers are typically configured separately
# Example CloudFormation trigger:
triggers:
  - name: daily-etl-trigger
    type: SCHEDULED
    schedule: cron(0 2 * * ? *)  # Daily at 2 AM
    actions:
      - jobName: customer-data-etl
        arguments:
          --batch_date: $(date)
```

### Event-based Triggers

```yaml
triggers:
  - name: s3-data-arrival
    type: EVENT
    eventBatchingCondition:
      batchSize: 10
      batchWindow: 300  # 5 minutes
```

## Error Handling and Retry Logic

### Retry Configuration

```yaml
config:
  maxRetries: 3
  timeout: 2880  # 48 hours maximum
  notificationProperty:
    notifyDelayAfter: 60  # Notify after 1 hour
```

### Error Handling Patterns

```python
# In your Glue script
try:
    # ETL operations
    transformed_data = transform_data(source_data)
except Exception as e:
    logger.error(f"Transformation failed: {str(e)}")
    # Send to DLQ or error bucket
    error_handler.handle_error(e, source_data)
    raise
```

## Troubleshooting

### Common Issues

1. **Job Failures**
   - Check CloudWatch Logs for detailed error messages
   - Verify IAM permissions for all required resources
   - Ensure data sources are accessible

2. **Performance Issues**
   - Monitor DPU utilization in CloudWatch
   - Review Spark UI for optimization opportunities
   - Consider increasing worker count or type

3. **Data Quality Issues**
   - Implement data validation in ETL scripts
   - Use AWS Glue Data Quality for automated checks
   - Monitor data freshness and completeness

### Debug Mode

Enable comprehensive debugging:

```yaml
config:
  defaultArguments:
    --enable-continuous-cloudwatch-log: "true"
    --enable-metrics: "true"
    --enable-spark-ui: "true"
    --enable-job-insights: "true"
    --verbose: "true"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/data-pipeline/` - End-to-end data processing pipeline
- `examples/data-lake-etl/` - Data lake transformation workflows
- `examples/streaming-analytics/` - Real-time data processing

## API Reference

### GlueJobComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (Glue Job, IAM Role, Security Configuration)
- `getCapabilities()`: Returns etl:glue-job capability
- `getType()`: Returns 'glue-job'

### Configuration Interfaces

- `GlueJobConfig`: Main configuration interface
- `GLUE_JOB_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.