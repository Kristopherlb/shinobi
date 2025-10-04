# API Gateway HTTP Component Audit Notes

This component inherits the platform FedRAMP control mappings defined for API Gateway v2 HTTP API services. Key enforcement points:

## Security Controls

- **AC-17 / SC-7** – `disableExecuteApiEndpoint` disables the default execute-api endpoint in FedRAMP manifests and enforces private entry points.
- **AU-2 / AU-11** – Access logging is enabled by default with retention controlled by manifests (365 days for FedRAMP High).
- **SI-4** – CloudWatch alarms generated from `monitoring.alarms` detect anomalous error rates and latency.
- **CM-6** – All throttling, logging, and WAF settings are sourced from manifest/config files to maintain immutable configuration history.

## Compliance Framework Mappings

### Commercial
- Access logging: 90 days retention
- WAF: Optional, configurable
- CORS: Configurable with safe defaults
- Throttling: 50 rps rate, 100 burst limit

### FedRAMP Moderate
- Access logging: 90 days retention
- WAF: Recommended for production
- CORS: Strict origin validation required
- Throttling: 100 rps rate, 200 burst limit
- Resource policies: IP range restrictions

### FedRAMP High
- Access logging: 365 days retention
- WAF: Mandatory for production
- CORS: Strict origin validation, no wildcards
- Throttling: 100 rps rate, 200 burst limit
- Resource policies: VPC and account restrictions
- Custom metrics: Security event monitoring

## Evidence Generation

Produce OSCAL/RegO evidence by exporting synthesized CloudFormation templates and attaching CloudWatch alarm definitions referenced in `observability/alarms-config.json`.

## Audit Checklist

- [ ] Verify access logging is enabled with appropriate retention
- [ ] Confirm WAF is configured for production environments
- [ ] Validate CORS origins are explicitly defined (no wildcards)
- [ ] Check resource policies are applied for network restrictions
- [ ] Ensure custom metrics are configured for security monitoring
- [ ] Verify throttling limits are appropriate for environment
- [ ] Confirm custom domain uses TLS 1.2 minimum
- [ ] Validate API key authentication is properly configured
