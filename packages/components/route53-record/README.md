# Route 53 Record Component

Declarative management of AWS Route 53 DNS records with reference resolution support for dynamic target resolution.

## Overview

The Route 53 Record component provides a declarative way to create and manage DNS records within your service manifests. It supports all major DNS record types, routing policies, and automatic reference resolution from other components.

## Features

- **Declarative DNS Management**: Define DNS records in simple YAML manifests
- **All Record Types**: Support for A, AAAA, CNAME, MX, TXT, NS, SRV, and PTR records
- **Routing Policies**: Weighted, geolocation, failover, and latency-based routing
- **Reference Resolution**: Dynamic target resolution using `${ref:...}` syntax
- **5-Layer Configuration**: Inherits platform's configuration precedence chain
- **Hosted Zone Integration**: Automatic hosted zone creation or import

## Usage

### Basic A Record

```yaml
# service.yml
components:
  - name: api-dns
    type: route53-record
    config:
      description: "API endpoint DNS record"
      record:
        recordName: api.example.com
        recordType: A
        zoneName: example.com.
        target: 192.168.1.100
        ttl: 300
```

### CNAME Record

```yaml
components:
  - name: www-redirect
    type: route53-record
    config:
      record:
        recordName: www.example.com
        recordType: CNAME
        zoneName: example.com.
        target: example.com
        ttl: 300
```

### MX Record

```yaml
components:
  - name: mail-servers
    type: route53-record
    config:
      record:
        recordName: example.com
        recordType: MX
        zoneName: example.com.
        target:
          - "10 mail1.example.com"
          - "20 mail2.example.com"
        ttl: 3600
```

### TXT Record

```yaml
components:
  - name: domain-verification
    type: route53-record
    config:
      record:
        recordName: _verification.example.com
        recordType: TXT
        zoneName: example.com.
        target:
          - '"v=spf1 include:_spf.google.com ~all"'
          - '"google-site-verification=abc123"'
        ttl: 300
```

### Reference Resolution

```yaml
components:
  - name: web-server
    type: ec2-instance
    config:
      instanceType: t3.micro
  
  - name: web-dns
    type: route53-record
    config:
      record:
        recordName: web.example.com
        recordType: A
        zoneName: example.com.
        target: ${ref:web-server.privateIp}
      referenceResolution:
        resolveReferences: true
        fallbackValue: 127.0.0.1
```

### Weighted Routing

```yaml
components:
  - name: api-primary
    type: route53-record
    config:
      record:
        recordName: api.example.com
        recordType: A
        zoneName: example.com.
        target: 192.168.1.1
        weight: 100
        setIdentifier: primary
  
  - name: api-secondary
    type: route53-record
    config:
      record:
        recordName: api.example.com
        recordType: A
        zoneName: example.com.
        target: 192.168.1.2
        weight: 50
        setIdentifier: secondary
```

### Geolocation Routing

```yaml
components:
  - name: api-us
    type: route53-record
    config:
      record:
        recordName: api.example.com
        recordType: A
        zoneName: example.com.
        target: 192.168.1.1
        geoLocation:
          continent: NA
          country: US
        setIdentifier: us-region
  
  - name: api-eu
    type: route53-record
    config:
      record:
        recordName: api.example.com
        recordType: A
        zoneName: example.com.
        target: 192.168.2.1
        geoLocation:
          continent: EU
        setIdentifier: eu-region
```

### Failover Routing

```yaml
components:
  - name: api-primary
    type: route53-record
    config:
      record:
        recordName: api.example.com
        recordType: A
        zoneName: example.com.
        target: 192.168.1.1
        failover: PRIMARY
        setIdentifier: primary-failover
  
  - name: api-secondary
    type: route53-record
    config:
      record:
        recordName: api.example.com
        recordType: A
        zoneName: example.com.
        target: 192.168.1.2
        failover: SECONDARY
        setIdentifier: secondary-failover
```

## Configuration Reference

### Top-Level Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | No | Component name (auto-generated if not provided) |
| `description` | string | No | Component description |
| `record` | object | Yes | Route 53 record configuration |
| `referenceResolution` | object | No | Reference resolution settings |
| `tags` | object | No | Custom tags (for documentation purposes only) |

### Record Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `recordName` | string | Yes | DNS record name (e.g., 'api.example.com') |
| `recordType` | string | Yes | DNS record type (A, AAAA, CNAME, MX, TXT, NS, SRV, PTR) |
| `zoneName` | string | Yes | Hosted zone name (e.g., 'example.com.') |
| `target` | string/array | Yes | Target value(s) for the DNS record |
| `ttl` | number | No | Time to live in seconds (default: 300) |
| `comment` | string | No | Comment for the record set |
| `evaluateTargetHealth` | boolean | No | Whether to evaluate target health (default: false) |
| `weight` | number | No | Weight for weighted routing (0-255) |
| `setIdentifier` | string | No | Set identifier for routing policies |
| `geoLocation` | object | No | Geographic location for geolocation routing |
| `failover` | string | No | Failover configuration (PRIMARY/SECONDARY) |
| `region` | string | No | Latency-based routing region |

### GeoLocation Configuration

| Property | Type | Description |
|----------|------|-------------|
| `continent` | string | Continent code (e.g., 'NA', 'EU', 'AS') |
| `country` | string | Country code (e.g., 'US', 'CA', 'GB') |
| `subdivision` | string | Subdivision code (e.g., 'CA', 'NY', 'TX') |

### Reference Resolution Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `resolveReferences` | boolean | true | Whether to resolve ${ref:...} expressions in target |
| `customResolvers` | object | {} | Custom reference resolvers |
| `fallbackValue` | string | - | Fallback value if reference resolution fails |

## Record Types

### A Record
```yaml
record:
  recordName: api.example.com
  recordType: A
  zoneName: example.com.
  target: 192.168.1.100
```

### AAAA Record
```yaml
record:
  recordName: api.example.com
  recordType: AAAA
  zoneName: example.com.
  target: 2001:db8::1
```

### CNAME Record
```yaml
record:
  recordName: www.example.com
  recordType: CNAME
  zoneName: example.com.
  target: example.com
```

### MX Record
```yaml
record:
  recordName: example.com
  recordType: MX
  zoneName: example.com.
  target:
    - "10 mail1.example.com"
    - "20 mail2.example.com"
```

### TXT Record
```yaml
record:
  recordName: _verification.example.com
  recordType: TXT
  zoneName: example.com.
  target:
    - '"v=spf1 include:_spf.google.com ~all"'
```

### NS Record
```yaml
record:
  recordName: subdomain.example.com
  recordType: NS
  zoneName: example.com.
  target:
    - ns1.example.com
    - ns2.example.com
```

### SRV Record
```yaml
record:
  recordName: _sip._tcp.example.com
  recordType: SRV
  zoneName: example.com.
  target:
    - "10 5 5060 sip.example.com"
```

## Reference Resolution

The component supports dynamic reference resolution using the `${ref:...}` syntax:

### Basic Reference
```yaml
target: ${ref:my-instance.privateIp}
```

### Custom Resolvers
```yaml
referenceResolution:
  resolveReferences: true
  customResolvers:
    my-instance.privateIp: 192.168.1.100
    my-load-balancer.dns: lb.example.com
  fallbackValue: 127.0.0.1
```

### Disable Resolution
```yaml
referenceResolution:
  resolveReferences: false
```

## Routing Policies

### Weighted Routing
```yaml
record:
  recordName: api.example.com
  recordType: A
  zoneName: example.com.
  target: 192.168.1.1
  weight: 100
  setIdentifier: primary
```

### Geolocation Routing
```yaml
record:
  recordName: api.example.com
  recordType: A
  zoneName: example.com.
  target: 192.168.1.1
  geoLocation:
    continent: NA
    country: US
  setIdentifier: us-region
```

### Failover Routing
```yaml
record:
  recordName: api.example.com
  recordType: A
  zoneName: example.com.
  target: 192.168.1.1
  failover: PRIMARY
  setIdentifier: primary-failover
```

### Latency-Based Routing
```yaml
record:
  recordName: api.example.com
  recordType: A
  zoneName: example.com.
  target: 192.168.1.1
  region: us-west-2
  setIdentifier: us-west-2-latency
```

## Examples

### Web Application Stack

```yaml
components:
  - name: web-server
    type: ec2-instance
    config:
      instanceType: t3.micro
  
  - name: web-dns
    type: route53-record
    config:
      description: "Web server DNS record"
      record:
        recordName: web.example.com
        recordType: A
        zoneName: example.com.
        target: ${ref:web-server.privateIp}
        ttl: 300
        comment: "Web server endpoint"
      referenceResolution:
        resolveReferences: true
        fallbackValue: 127.0.0.1
```

### Load Balancer with Multiple Records

```yaml
components:
  - name: api-lb
    type: application-load-balancer
    config:
      scheme: internet-facing
  
  - name: api-dns
    type: route53-record
    config:
      record:
        recordName: api.example.com
        recordType: A
        zoneName: example.com.
        target: ${ref:api-lb.dnsName}
        evaluateTargetHealth: true
  
  - name: www-redirect
    type: route53-record
    config:
      record:
        recordName: www.example.com
        recordType: CNAME
        zoneName: example.com.
        target: api.example.com
```

### Email Configuration

```yaml
components:
  - name: mail-servers
    type: route53-record
    config:
      description: "Mail server configuration"
      record:
        recordName: example.com
        recordType: MX
        zoneName: example.com.
        target:
          - "10 mail1.example.com"
          - "20 mail2.example.com"
        ttl: 3600
  
  - name: spf-record
    type: route53-record
    config:
      record:
        recordName: example.com
        recordType: TXT
        zoneName: example.com.
        target:
          - '"v=spf1 include:_spf.google.com ~all"'
        ttl: 300
```

## Testing

Run the component tests:

```bash
npm test
```

The test suite covers:
- 5-layer configuration precedence
- Schema validation
- Component synthesis
- All record types
- Reference resolution
- Routing policies
- Error handling

## Architecture

The component follows the Platform Component API Contract:

- **ConfigBuilder**: Extends abstract `ConfigBuilder` with 5-layer precedence
- **Component**: Extends `BaseComponent` with Route 53 record synthesis logic
- **Creator**: Factory class for component instantiation
- **Reference Resolution**: Built-in support for `${ref:...}` syntax

## Security Considerations

- Use appropriate TTL values for your use case
- Validate target values before deployment
- Use failover routing for critical services
- Monitor DNS resolution with CloudWatch
- Regularly audit DNS records for accuracy

## Troubleshooting

### Common Issues

1. **Invalid Record Name**: Ensure record names follow DNS naming conventions
2. **Zone Not Found**: Verify the hosted zone exists or will be created
3. **Reference Resolution Failed**: Check that referenced components exist
4. **Invalid Target Format**: Ensure targets match the record type requirements

### Debug Mode

Enable debug logging to troubleshoot DNS issues:

```bash
export DEBUG=platform:route53-record:*
```

## Contributing

When extending this component:

1. Follow the Abstract Component ConfigBuilder specification
2. Add comprehensive tests for new features
3. Update this documentation
4. Ensure compliance framework compatibility
5. Test reference resolution with affected components
