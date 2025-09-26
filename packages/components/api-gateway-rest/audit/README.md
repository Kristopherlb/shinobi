# Api Gateway REST Component Audit Notes

This component inherits the platform FedRAMP control mappings defined for API Gateway services. Key enforcement points:

- **AC-17 / SC-7** – `disableExecuteApiEndpoint` disables the default execute-api endpoint in FedRAMP manifests and enforces private entry points.
- **AU-2 / AU-11** – Access logging is enabled by default with retention controlled by manifests (2555 days for FedRAMP High).
- **SI-4** – CloudWatch alarms generated from `monitoring.thresholds` detect anomalous error rates and latency.
- **CM-6** – All throttling, logging, and WAF settings are sourced from manifest/config files to maintain immutable configuration history.

Produce OSCAL/RegO evidence by exporting synthesized CloudFormation templates and attaching CloudWatch alarm definitions referenced in `observability/alarms-config.json`.
