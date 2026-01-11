# AWS Config Conformance Pack Mapping

This document maps AWS services and compliance frameworks to their corresponding AWS Config conformance packs.

**Source**: https://github.com/awslabs/aws-config-rules/tree/master/aws-config-conformance-packs  
**Last Updated**: 2025-01-06

## Service-to-Pack Mapping

### Compute Services

| AWS Service | Conformance Pack | Key Rules | Observability Focus |
|-------------|------------------|-----------|---------------------|
| EC2 | `Operational-Best-Practices-for-EC2.yaml` | IMDSv2, security groups, VPC configuration, instance metadata | CloudWatch metrics, VPC Flow Logs, CloudTrail |
| ECS | `Operational-Best-Practices-for-ECS.yaml` | Task definitions, service configuration, logging, container insights | CloudWatch Container Insights, ECS service metrics |
| Lambda | `Operational-Best-Practices-for-Lambda.yaml` | VPC configuration, dead letter queues, tracing, environment variables | X-Ray tracing, CloudWatch Logs, Lambda metrics |
| EKS | `Operational-Best-Practices-for-EKS.yaml` | Cluster configuration, pod security, network policies | CloudWatch Container Insights, Prometheus metrics |

### Storage Services

| AWS Service | Conformance Pack | Key Rules | Observability Focus |
|-------------|------------------|-----------|---------------------|
| S3 | `Operational-Best-Practices-for-S3.yaml` | Encryption, versioning, logging, access control, lifecycle policies | CloudWatch metrics (BucketSizeBytes, NumberOfObjects), CloudTrail |
| EBS | `Operational-Best-Practices-for-EBS.yaml` | Encryption, snapshots, volume types | CloudWatch metrics, backup monitoring |
| EFS | `Operational-Best-Practices-for-EFS.yaml` | Encryption, access points, performance mode | CloudWatch metrics, file system monitoring |

### Database Services

| AWS Service | Conformance Pack | Key Rules | Observability Focus |
|-------------|------------------|-----------|---------------------|
| RDS | `Operational-Best-Practices-for-RDS.yaml` | Encryption, backups, multi-AZ, parameter groups, enhanced monitoring | CloudWatch Enhanced Monitoring, RDS metrics |
| DynamoDB | `Operational-Best-Practices-for-DynamoDB.yaml` | Encryption, point-in-time recovery, auto-scaling | CloudWatch metrics, DynamoDB Streams |
| ElastiCache | `Operational-Best-Practices-for-ElastiCache.yaml` | Encryption, backup, maintenance windows | CloudWatch metrics, Redis/Memcached monitoring |

### Networking Services

| AWS Service | Conformance Pack | Key Rules | Observability Focus |
|-------------|------------------|-----------|---------------------|
| VPC | `Operational-Best-Practices-for-VPC.yaml` | Flow logs, security groups, network ACLs | VPC Flow Logs, CloudWatch metrics |
| ALB/NLB | `Operational-Best-Practices-for-ELB.yaml` | Access logs, health checks, SSL/TLS | CloudWatch metrics, access logs |
| API Gateway | `Operational-Best-Practices-for-API-Gateway.yaml` | Logging, caching, throttling, WAF | CloudWatch Logs, API Gateway metrics |

### Messaging Services

| AWS Service | Conformance Pack | Key Rules | Observability Focus |
|-------------|------------------|-----------|---------------------|
| SQS | `Operational-Best-Practices-for-SQS.yaml` | Encryption, dead letter queues, visibility timeout | CloudWatch metrics (ApproximateNumberOfMessages, etc.) |
| SNS | `Operational-Best-Practices-for-SNS.yaml` | Encryption, delivery status, topic policies | CloudWatch metrics, delivery status logging |
| EventBridge | `Operational-Best-Practices-for-EventBridge.yaml` | Event rules, targets, archive | CloudWatch metrics, event logging |

## Compliance Framework Mapping

### FedRAMP

| Framework Level | Conformance Pack | Key Requirements |
|-----------------|------------------|-------------------|
| FedRAMP Low | `Operational-Best-Practices-for-FedRAMP-Low.yaml` | Basic encryption, logging, access control |
| FedRAMP Moderate | `Operational-Best-Practices-for-FedRAMP-Moderate.yaml` | Customer-managed KMS keys, extended logging (1095 days), audit trails, encryption at rest and in transit |
| FedRAMP High | `Operational-Best-Practices-for-FedRAMP-High.yaml` | Enhanced encryption, extended logging (2555 days), stricter access control, multi-region backups |

### Other Compliance Frameworks

| Framework | Conformance Pack | Key Requirements |
|-----------|------------------|-------------------|
| HIPAA | `Operational-Best-Practices-for-HIPAA.yaml` | PHI protection, encryption, audit logging, access controls |
| PCI-DSS | `Operational-Best-Practices-for-PCI-DSS.yaml` | Cardholder data protection, encryption, access control, network segmentation |
| SOC 2 | `Operational-Best-Practices-for-SOC-2.yaml` | Security controls, availability, processing integrity, confidentiality |
| CIS Benchmarks | `Operational-Best-Practices-for-CIS.yaml` | Security hardening, configuration baselines |

## Well-Architected Framework Pillars

| Pillar | Conformance Pack | Key Focus Areas |
|--------|------------------|-----------------|
| Security | `Operational-Best-Practices-for-WA-Security-Pillar.yaml` | Identity and access management, detective controls, infrastructure protection, data protection |
| Reliability | `Operational-Best-Practices-for-WA-Reliability-Pillar.yaml` | Foundations, change management, failure management |
| Performance Efficiency | `Operational-Best-Practices-for-WA-Performance-Pillar.yaml` | Selection, review, monitoring |
| Cost Optimization | `Operational-Best-Practices-for-WA-Cost-Pillar.yaml` | Cost awareness, cost-effective resources, demand and supply management |
| Operational Excellence | `Operational-Best-Practices-for-WA-Operational-Excellence-Pillar.yaml` | Preparation, operation, evolution |

## Observability Rules by Category

### Metrics

- **CloudWatch Metrics**: Enable detailed monitoring, custom metrics, metric filters
- **Container Insights**: Enable for ECS/EKS services
- **Enhanced Monitoring**: Enable for RDS instances
- **X-Ray Tracing**: Enable for Lambda, API Gateway, ECS services

### Logging

- **CloudWatch Logs**: Enable logging for all services, configure log retention based on compliance framework
- **CloudTrail**: Enable for all regions, enable data events for S3, Lambda
- **VPC Flow Logs**: Enable for all VPCs
- **Access Logs**: Enable for ALB, API Gateway, S3

### Alarms

- **Error Rate Alarms**: Configure for Lambda, API Gateway, ECS services
- **Latency Alarms**: Configure for API Gateway, ALB, Lambda
- **Resource Utilization Alarms**: Configure for EC2, RDS, ECS based on thresholds
- **Cost Alarms**: Configure budget alerts and anomaly detection

### Dashboards

- **Service Dashboards**: Create dashboards per service with key metrics
- **Compliance Dashboards**: Create dashboards showing compliance status
- **Cost Dashboards**: Create dashboards showing cost by service, resource, tag

## Usage in Component Configuration

When configuring a component:

1. **Identify Service**: Determine which AWS service the component manages
2. **Find Pack**: Look up the conformance pack in this mapping
3. **Extract Rules**: Parse the conformance pack YAML to extract relevant rules
4. **Map to Config**: Translate rules into component configuration:
   - Observability settings → CloudWatch metrics, alarms, dashboards
   - Security settings → Encryption, access control, IAM policies
   - Compliance settings → Logging retention, encryption requirements
5. **Validate**: Ensure configuration aligns with platform standards

## References

- AWS Config Conformance Packs: https://docs.aws.amazon.com/config/latest/developerguide/conformance-packs.html
- AWS Labs Repository: https://github.com/awslabs/aws-config-rules/tree/master/aws-config-conformance-packs
- AWS Well-Architected Framework: https://aws.amazon.com/architecture/well-architected/


