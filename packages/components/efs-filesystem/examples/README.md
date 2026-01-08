# EFS Filesystem - Example Manifests

This directory contains example service manifests demonstrating various configurations of the `efs-filesystem` component.

## Examples

### simple-filesystem.yml
Basic EFS filesystem with encryption and VPC mount targets.

### high-performance.yml
High-performance filesystem with provisioned throughput and maxIO mode.

### fedramp-moderate.yml
Filesystem configured for FedRAMP Moderate compliance with TLS, CMK, and logging.

### fedramp-high.yml
Filesystem configured for FedRAMP High compliance with 7-year retention and comprehensive monitoring.

## Usage

Copy an example and modify it for your service:

```bash
cp examples/simple-filesystem.yml my-service.yml
# Edit my-service.yml
shinobi validate --file my-service.yml
shinobi plan --file my-service.yml --env dev
```

## Security Warning

**⚠️ NEVER use 0.0.0.0/0 in security group ingress rules!**

EFS (NFS port 2049) should ONLY be accessible from specific VPC CIDRs or via binder-managed security group rules.

```yaml
# ❌ BAD - exposes NFS to internet:
securityGroup:
  ingressRules:
    - port: 2049
      cidr: 0.0.0.0/0

# ✅ GOOD - restricts to VPC:
securityGroup:
  ingressRules:
    - port: 2049
      cidr: 10.0.0.0/16
      description: NFS from application subnets
```

## Configuration Options

For complete schema documentation, see [Config.schema.json](../Config.schema.json).

