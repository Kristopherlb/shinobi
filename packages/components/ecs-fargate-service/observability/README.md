# ECS Fargate Service Observability Assets

The component configures OpenTelemetry and CloudWatch monitoring automatically. Key behaviours:

- The platform observability service injects a complete OTEL environment for every task, including collector endpoint, authorization headers, and trace propagation configuration.
- Default CloudWatch alarms are provisioned for CPU utilisation, memory utilisation, and running task count. Alarm tags annotate the owning service and cluster.
- When blue/green deployment is enabled, the component emits additional observability metadata on the ALB and target groups to aid troubleshooting.

## Dashboards and Alarms

| Asset | Location | Description |
|-------|----------|-------------|
| CloudWatch alarms | Created by `EcsFargateServiceComponent._configureObservabilityForEcsService` | Baseline alarms for CPU, memory, and task count with FedRAMP-friendly defaults. |

Additional dashboards can be layered on through the platform observability service (`configureObservability` capability) using the exported `otel:environment` capability.
