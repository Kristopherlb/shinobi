# OpenSearch Domain Component

Enterprise-grade AWS OpenSearch Service domain for search and analytics workloads with advanced security, clustering, and compliance features.

## Overview

This component provides a fully managed OpenSearch Service domain with:

- **Scalable Search**: Multi-node clusters with dedicated master nodes
- **Advanced Security**: Fine-grained access control and encryption
- **High Availability**: Multi-AZ deployment with automated failover
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Comprehensive Monitoring**: CloudWatch integration and performance metrics

## Capabilities

- **search:opensearch**: Provides OpenSearch connectivity for search and analytics

## Configuration

```yaml
components:
  - name: product-search
    type: opensearch-domain
    config:
      domainName: product-search-cluster
      version: OpenSearch_2.7
      
      cluster:
        instanceType: m6g.medium.search
        instanceCount: 3
        dedicatedMasterEnabled: true
        masterInstanceType: m6g.small.search
        masterInstanceCount: 3
        warmEnabled: true
        warmInstanceType: ultrawarm1.medium.search
        warmInstanceCount: 2
      
      ebs:
        enabled: true
        volumeType: gp3
        volumeSize: 100
        throughput: 250
      
      vpc:
        vpcId: vpc-12345678
        subnetIds:
          - subnet-12345678
          - subnet-87654321
          - subnet-13579024
        securityGroupIds:
          - sg-opensearch
      
      encryptionAtRest:
        enabled: true
      
      nodeToNodeEncryption:
        enabled: true
      
      domainEndpoint:
        enforceHTTPS: true
        tlsSecurityPolicy: Policy-Min-TLS-1-2-2019-07
      
      advancedSecurity:
        enabled: true
        internalUserDatabaseEnabled: true
        masterUserName: admin
        masterUserPassword: SecurePassword123!
      
      logging:
        slowSearchLogEnabled: true
        slowIndexLogEnabled: true
        errorLogEnabled: true
        auditLogEnabled: true
        appLogEnabled: true
      
      tags:
        search-type: product-catalog
        business-unit: ecommerce
```

## Binding Examples

### Lambda Function to OpenSearch

```yaml
components:
  - name: search-api
    type: lambda-api
    config:
      handler: src/search.handler
    binds:
      - to: product-search
        capability: search:opensearch
        access: read-write
```

This binding allows the Lambda function to:
- Query and index documents
- Perform search operations
- Access cluster metrics and status

## Compliance Features

### Commercial
- Basic security with standard encryption
- Single-node cluster (cost-optimized)
- Standard monitoring and logging

### FedRAMP Moderate
- Multi-node cluster (3 data nodes, 3 master nodes)
- Enhanced instance types (m6g.medium+)
- Comprehensive audit logging
- Fine-grained access control enabled
- 1-year log retention

### FedRAMP High
- Large-scale cluster (6 data nodes, 5 master nodes)
- High-performance instances (m6g.large+)
- Warm storage tier enabled
- Mandatory comprehensive logging
- 10-year log retention
- Enhanced security monitoring

## Advanced Configuration

### Custom Access Policies

```yaml
config:
  accessPolicies:
    statements:
      - Effect: Allow
        Principal:
          AWS: "arn:aws:iam::123456789012:role/SearchRole"
        Action: "es:*"
        Resource: "arn:aws:es:us-east-1:123456789012:domain/product-search/*"
```

### Index Templates and Policies

```yaml
config:
  advancedOptions:
    "indices.fielddata.cache.size": "20%"
    "indices.query.bool.max_clause_count": "1024"
    "rest.action.multi.allow_explicit_index": "true"
```

### Custom Security Configuration

```yaml
config:
  advancedSecurity:
    enabled: true
    samlOptions:
      enabled: true
      idpEntityId: "your-idp-entity-id"
      idpMetadataContent: "SAML metadata XML"
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Cluster health, indexing rate, search latency
- **CloudWatch Logs**: Configurable log types with structured output
- **OpenSearch Dashboards**: Built-in visualization and monitoring
- **CloudWatch Alarms**: Cluster status and performance monitoring
- **Custom Metrics**: Application-specific search metrics

### Monitoring Levels

- **Basic**: Cluster status and error monitoring
- **Enhanced**: Performance metrics + slow query logs
- **Comprehensive**: Enhanced + audit logs + security monitoring

## Security Features

### Encryption
- Encryption at rest with AWS KMS
- Node-to-node encryption (TLS)
- HTTPS enforcement for all endpoints
- Data encryption in transit

### Access Control
- VPC-based network isolation
- Security group restrictions
- Fine-grained access control (FGAC)
- Role-based access management

### Authentication Methods
- Internal user database
- AWS IAM integration
- SAML authentication
- OpenID Connect support

## Cluster Architecture

### Data Node Configuration
- Configurable instance types and counts
- EBS volume optimization
- Auto-scaling support
- Multi-AZ distribution

### Master Node Configuration
- Dedicated master nodes for cluster stability
- Automated failover capabilities
- Cluster state management
- Split-brain prevention

### Warm Storage Tier
- Cost-optimized storage for older data
- Automated data lifecycle management
- Configurable transition policies
- Query performance optimization

## Index Management

### Index Policies

```yaml
config:
  indexPolicies:
    - name: logs-policy
      policy: |
        {
          "policy": {
            "description": "Log rotation policy",
            "default_state": "hot",
            "states": [
              {
                "name": "hot",
                "actions": [],
                "transitions": [
                  {
                    "state_name": "warm",
                    "conditions": {
                      "min_index_age": "7d"
                    }
                  }
                ]
              }
            ]
          }
        }
```

## Troubleshooting

### Common Issues

1. **Cluster Health Issues**
   - Check CloudWatch cluster status metrics
   - Verify sufficient storage and memory
   - Review shard allocation and replication

2. **Performance Problems**
   - Monitor search and indexing latency
   - Check JVM memory pressure
   - Review query patterns and optimization

3. **Security Configuration**
   - Verify fine-grained access control settings
   - Check VPC and security group configurations
   - Validate SSL/TLS certificate settings

### Debug Mode

Enable comprehensive logging for debugging:

```yaml
config:
  logging:
    slowSearchLogEnabled: true
    slowIndexLogEnabled: true
    errorLogEnabled: true
    auditLogEnabled: true
    appLogEnabled: true
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/log-analytics/` - Log aggregation and analysis
- `examples/product-search/` - E-commerce product search
- `examples/content-discovery/` - Content management and discovery

## API Reference

### OpenSearchDomainComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (Domain, Security Groups, Log Groups)
- `getCapabilities()`: Returns search:opensearch capability
- `getType()`: Returns 'opensearch-domain'

### Configuration Interfaces

- `OpenSearchDomainConfig`: Main configuration interface
- `OPENSEARCH_DOMAIN_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.