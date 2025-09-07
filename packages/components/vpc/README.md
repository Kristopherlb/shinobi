# VPC Component

Enterprise-grade Amazon Virtual Private Cloud (VPC) with advanced networking features, security controls, and comprehensive compliance support for isolated cloud infrastructure.

## Overview

This component provides a fully configured VPC with:

- **Network Isolation**: Private and public subnets across multiple availability zones
- **Security Controls**: NACLs, security groups, and flow logs for comprehensive monitoring
- **Connectivity Options**: NAT gateways, VPC endpoints, and peering connections
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Advanced Features**: Transit gateway integration, DNS resolution, and monitoring

## Capabilities

- **network:vpc**: Provides isolated network foundation for all AWS resources

## Configuration

```yaml
components:
  - name: app-network
    type: vpc
    config:
      vpcName: ApplicationVPC
      cidrBlock: 10.0.0.0/16
      
      enableDnsHostnames: true
      enableDnsSupport: true
      
      availabilityZones:
        - us-east-1a
        - us-east-1b
        - us-east-1c
      
      subnets:
        public:
          - name: public-1a
            cidr: 10.0.1.0/24
            availabilityZone: us-east-1a
            mapPublicIpOnLaunch: true
          - name: public-1b
            cidr: 10.0.2.0/24
            availabilityZone: us-east-1b
            mapPublicIpOnLaunch: true
        
        private:
          - name: private-1a
            cidr: 10.0.11.0/24
            availabilityZone: us-east-1a
          - name: private-1b
            cidr: 10.0.12.0/24
            availabilityZone: us-east-1b
        
        database:
          - name: db-1a
            cidr: 10.0.21.0/24
            availabilityZone: us-east-1a
          - name: db-1b
            cidr: 10.0.22.0/24
            availabilityZone: us-east-1b
      
      natGateways:
        enabled: true
        redundancy: high  # high, medium, single
      
      internetGateway:
        enabled: true
      
      vpcEndpoints:
        - service: s3
          type: Gateway
          routeTableIds: 
            - private-route-table
        - service: ec2
          type: Interface
          subnetIds:
            - private-1a
            - private-1b
          securityGroupIds:
            - sg-vpc-endpoints
      
      flowLogs:
        enabled: true
        trafficType: ALL
        logDestination: cloudwatch
        logGroupName: /aws/vpc/flowlogs
        logFormat: "${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action}"
      
      transitGateway:
        enabled: true
        amazonSideAsn: 64512
        autoAcceptSharedAttachments: enable
        defaultRouteTableAssociation: enable
        defaultRouteTablePropagation: enable
      
      tags:
        network-tier: application
        environment: production
        monitoring-enabled: "true"
```

## Binding Examples

### ECS Cluster in VPC

```yaml
components:
  - name: app-cluster
    type: ecs-cluster
    config:
      clusterName: ApplicationCluster
      vpc:
        vpcId: ${app-network.vpcId}
        subnetIds:
          - ${app-network.privateSubnets.private-1a}
          - ${app-network.privateSubnets.private-1b}
    binds:
      - to: app-network
        capability: network:vpc
        access: compute-subnet
```

### RDS Database in VPC

```yaml
components:
  - name: app-database
    type: rds-postgres
    config:
      instanceClass: db.r5.large
      dbSubnetGroupName: ${app-network.dbSubnetGroup.name}
      vpcSecurityGroupIds:
        - ${app-network.securityGroups.database}
    binds:
      - to: app-network
        capability: network:vpc
        access: database-subnet
```

## Compliance Features

### Commercial
- Basic VPC with public and private subnets
- Standard NAT gateway configuration
- Basic flow logging
- Cost-optimized settings

### FedRAMP Moderate
- Enhanced network segmentation with dedicated database subnets
- Comprehensive VPC flow logs with extended retention
- VPC endpoints for AWS service access
- Network ACLs for additional security layers
- 1-year flow log retention

### FedRAMP High
- Strict network isolation with multiple subnet tiers
- Comprehensive monitoring with detailed flow logs
- Mandatory VPC endpoints for all AWS services
- Advanced security groups and NACLs
- Transit gateway for controlled connectivity
- 10-year audit log retention
- Enhanced network monitoring and alerting

## Advanced Configuration

### Multi-Tier Architecture

```yaml
config:
  subnets:
    # Web tier - public facing
    web:
      - name: web-1a
        cidr: 10.0.1.0/24
        availabilityZone: us-east-1a
        mapPublicIpOnLaunch: true
      - name: web-1b
        cidr: 10.0.2.0/24
        availabilityZone: us-east-1b
        mapPublicIpOnLaunch: true
    
    # Application tier - private
    application:
      - name: app-1a
        cidr: 10.0.11.0/24
        availabilityZone: us-east-1a
      - name: app-1b
        cidr: 10.0.12.0/24
        availabilityZone: us-east-1b
    
    # Database tier - isolated
    database:
      - name: db-1a
        cidr: 10.0.21.0/24
        availabilityZone: us-east-1a
      - name: db-1b
        cidr: 10.0.22.0/24
        availabilityZone: us-east-1b
    
    # Management tier - highly restricted
    management:
      - name: mgmt-1a
        cidr: 10.0.31.0/28
        availabilityZone: us-east-1a
```

### Comprehensive VPC Endpoints

```yaml
config:
  vpcEndpoints:
    # Gateway endpoints (no additional charges)
    - service: s3
      type: Gateway
      routeTableIds: [private-route-table, db-route-table]
    
    - service: dynamodb
      type: Gateway
      routeTableIds: [private-route-table]
    
    # Interface endpoints for AWS services
    - service: ec2
      type: Interface
      subnetIds: [private-1a, private-1b]
      privateDnsEnabled: true
    
    - service: ssm
      type: Interface
      subnetIds: [private-1a, private-1b]
      privateDnsEnabled: true
    
    - service: logs
      type: Interface
      subnetIds: [private-1a, private-1b]
      privateDnsEnabled: true
    
    - service: monitoring
      type: Interface
      subnetIds: [private-1a, private-1b]
      privateDnsEnabled: true
```

### Network ACLs for Additional Security

```yaml
config:
  networkAcls:
    web-tier-nacl:
      subnets: [web-1a, web-1b]
      rules:
        ingress:
          - ruleNumber: 100
            protocol: tcp
            portRange:
              from: 80
              to: 80
            cidrBlock: 0.0.0.0/0
            ruleAction: allow
          - ruleNumber: 110
            protocol: tcp
            portRange:
              from: 443
              to: 443
            cidrBlock: 0.0.0.0/0
            ruleAction: allow
        egress:
          - ruleNumber: 100
            protocol: -1
            cidrBlock: 0.0.0.0/0
            ruleAction: allow
    
    application-tier-nacl:
      subnets: [app-1a, app-1b]
      rules:
        ingress:
          - ruleNumber: 100
            protocol: tcp
            portRange:
              from: 8080
              to: 8080
            cidrBlock: 10.0.0.0/16  # Only internal traffic
            ruleAction: allow
        egress:
          - ruleNumber: 100
            protocol: -1
            cidrBlock: 0.0.0.0/0
            ruleAction: allow
```

## Monitoring and Observability

The component automatically configures:

- **VPC Flow Logs**: Comprehensive network traffic monitoring
- **CloudWatch Metrics**: VPC-level networking metrics
- **Transit Gateway Metrics**: Cross-VPC connectivity monitoring
- **VPC Endpoint Metrics**: Endpoint usage and performance
- **Custom Dashboards**: Network performance and security visualizations

### Monitoring Levels

- **Basic**: VPC flow logs and basic connectivity monitoring
- **Enhanced**: Detailed flow analysis + performance metrics + endpoint monitoring
- **Comprehensive**: Enhanced + security analytics + compliance reporting + threat detection

## Security Features

### Network Segmentation
- Multi-tier subnet architecture
- Dedicated database subnets with restricted access
- Management subnets for administrative access
- Network ACLs for subnet-level filtering

### Access Control
- Security groups for instance-level firewalls
- Route table controls for traffic flow
- VPC endpoints for private AWS service access
- Transit gateway for controlled inter-VPC communication

### Monitoring and Logging
- Comprehensive VPC flow logs
- DNS query logging
- Security group and NACL change monitoring
- Network performance analytics

## Networking Patterns

### Hub and Spoke Architecture

```yaml
# Hub VPC (main network)
config:
  transitGateway:
    enabled: true
    amazonSideAsn: 64512
    routeTables:
      - name: hub-routes
        defaultAssociation: true
        defaultPropagation: true
      - name: spoke-routes
        defaultAssociation: false
        defaultPropagation: false
```

### VPC Peering Configuration

```yaml
config:
  vpcPeering:
    connections:
      - name: prod-to-shared-services
        peerVpcId: vpc-87654321
        peerRegion: us-east-1
        accepter:
          allowDnsResolutionFromRemoteVpc: true
          allowEgressFromLocalClassicLinkToRemoteVpc: false
        requester:
          allowDnsResolutionFromRemoteVpc: true
          allowEgressFromLocalVpcToRemoteClassicLink: false
```

### Site-to-Site VPN Integration

```yaml
config:
  vpnGateway:
    enabled: true
    amazonSideAsn: 65000
    connections:
      - name: corporate-office
        customerGatewayIp: 203.0.113.1
        bgpAsn: 65001
        type: ipsec.1
        staticRoutes:
          - 192.168.0.0/16
```

## Performance Optimization

### NAT Gateway Configuration

```yaml
config:
  natGateways:
    enabled: true
    redundancy: high  # Creates NAT gateway in each AZ
    bandwidth: 45Gbps  # Up to 45 Gbps
    
    # Custom configuration per AZ
    gateways:
      - availabilityZone: us-east-1a
        allocationId: eip-12345678
      - availabilityZone: us-east-1b
        allocationId: eip-87654321
```

### Enhanced Networking

```yaml
config:
  enhancedNetworking:
    sriovNetSupport: enabled
    enaSupport: enabled
    
  placementGroups:
    - name: high-performance-cluster
      strategy: cluster
      
  dedicatedTenancy:
    enabled: false  # Set to true for compliance requirements
```

## Cost Optimization

### NAT Gateway Alternatives

```yaml
# Option 1: Single NAT gateway (cost-optimized)
config:
  natGateways:
    enabled: true
    redundancy: single
    availabilityZone: us-east-1a

# Option 2: NAT instances (ultra cost-optimized)
config:
  natInstances:
    enabled: true
    instanceType: t3.micro
    keyName: my-key-pair
```

### VPC Endpoint Cost Management

```yaml
config:
  vpcEndpoints:
    # Use gateway endpoints (free) where possible
    - service: s3
      type: Gateway
    
    # Selective interface endpoints for frequently used services
    - service: ec2
      type: Interface
      policyDocument: |
        {
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": "*",
              "Action": "ec2:DescribeInstances",
              "Resource": "*"
            }
          ]
        }
```

## Disaster Recovery and Multi-Region

### Cross-Region VPC Setup

```yaml
# Primary region configuration
config:
  cidrBlock: 10.0.0.0/16
  transitGateway:
    enabled: true
    crossRegionPeering:
      - peerRegion: us-west-2
        peerTransitGatewayId: tgw-87654321

# Secondary region (disaster recovery)
# config:
#   cidrBlock: 10.1.0.0/16  # Non-overlapping CIDR
#   transitGateway:
#     enabled: true
#     crossRegionPeering:
#       - peerRegion: us-east-1
#         peerTransitGatewayId: tgw-12345678
```

## Troubleshooting

### Common Issues

1. **Connectivity Problems**
   - Check route tables for proper routing
   - Verify security group and NACL rules
   - Ensure NAT gateway or internet gateway configuration

2. **DNS Resolution Issues**
   - Verify enableDnsSupport and enableDnsHostnames settings
   - Check VPC endpoint DNS configuration
   - Review route53 private hosted zones

3. **VPC Endpoint Access Issues**
   - Verify endpoint policy permissions
   - Check security groups allow HTTPS traffic
   - Ensure route tables include endpoint routes

### Debug Mode

Enable comprehensive networking monitoring:

```yaml
config:
  flowLogs:
    enabled: true
    trafficType: ALL
    logFormat: "${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${windowstart} ${windowend} ${action} ${flowlogstatus}"
  
  tags:
    debug: "true"
    detailed-monitoring: "enabled"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/three-tier-vpc/` - Classic three-tier architecture
- `examples/microservices-network/` - Microservices networking setup
- `examples/hybrid-connectivity/` - On-premises integration

## API Reference

### VpcComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (VPC, Subnets, Route Tables, Gateways, Endpoints)
- `getCapabilities()`: Returns network:vpc capability
- `getType()`: Returns 'vpc'

### Configuration Interfaces

- `VpcConfig`: Main configuration interface
- `VPC_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.