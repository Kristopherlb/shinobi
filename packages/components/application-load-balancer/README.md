# Application Load Balancer Component

Configuration-driven Application Load Balancer that honours the platform precedence chain through `ApplicationLoadBalancerComponentConfigBuilder`. All compliance defaults now live in `/config/<framework>.yml`; the component only consumes the resolved configuration and materialises the L7 load balancer.

## Features

- Internet-facing or internal ALB with dual-stack support, subnets and security groups provided declaratively.
- Listener definitions (HTTP/HTTPS) including HTTPS policy, redirect/fixed-response/forward default actions.
- Target group catalogue (instance/IP/Lambda) with health checks, stickiness, and optional blue/green deployment scaffolding.
- Access logging enabled by default with opinionated retention and removal safeguards.
- Monitoring surfaces for HTTP 5xx, unhealthy hosts, connection errors, and rejected connections driven by config thresholds.
- X-Ray tracing integration with configurable sampling rates for distributed request tracing.
- AWS WAF integration with managed rule groups for security protection.
- CloudWatch observability dashboard with key performance metrics.
- CDK Nag security validation with proper suppressions and justifications.
- Capability payload advertises the resolved hardening profile for downstream binders.
- Secure-by-default posture: no implicit ingress rules, deletion protection on, and observability features active out of the box.

## Usage

```yaml
components:
  - name: edge-alb
    type: application-load-balancer
    config:
      vpc:
        vpcId: vpc-0123456789abcdef0
      listeners:
        - port: 443
          protocol: HTTPS
          certificateArn: arn:aws:acm:us-east-1:123456789012:certificate/11111111-2222-3333-4444-555555555555
          defaultAction:
            type: forward
      securityGroups:
        ingress:
          - port: 443
            cidr: 10.0.0.0/16
            description: Allow HTTPS from corporate network
      targetGroups:
        - name: web
          port: 80
          protocol: HTTP
          targetType: instance
          healthCheck:
            path: /healthz
      accessLogs:
        enabled: true
        bucketName: platform-alb-logs
        prefix: edge/
      monitoring:
        enabled: true
        alarms:
          http5xx:
            enabled: true
            threshold: 5
```

Any omitted properties fall back to the platform defaults for the active compliance framework (`/config/commercial.yml`, `/config/fedramp-moderate.yml`, `/config/fedramp-high.yml`). Those defaults enable access logging, observability, and deletion protection while requiring explicit ingress declarations.

## Key Configuration Sections

| Path | Description |
|------|-------------|
| `scheme` | `internet-facing` or `internal`. Defaults come from the framework config. |
| `ipAddressType` | `ipv4` or `dualstack`. |
| `vpc` | Lookup settings (VPC ID and/or subnet IDs) used to attach the ALB. |
| `securityGroups` | Whether to create a managed security group and the ingress rules/additional security group IDs. |
| `accessLogs` | Enablement, destination bucket/prefix, retention days, and removal policy. |
| `listeners[]` | Listeners with protocol/port and optional TLS policy, certificate ARN, redirect/fixed-response/forward actions. |
| `targetGroups[]` | Target groups (instance/IP/Lambda) with health check, stickiness, and naming constraints handled by the builder. |
| `deploymentStrategy` | `single` or `blue-green`; blue/green target groups are scaffolded automatically when requested. |
| `monitoring` | Toggle plus per-alarm thresholds for HTTP 5xx, unhealthy hosts, connection errors, and rejected connections. |
| `hardeningProfile` | Abstract posture indicator surfaced via the `net:load-balancer` capability (defaults per framework). |

## Capabilities

- `net:load-balancer` – ALB metadata (ARN, DNS name, hosted zone, hardening profile, monitoring flag).
- `net:load-balancer-target` – Target group ARNs/names for downstream binders.
- `observability:application-load-balancer` – Observability metadata (monitoring thresholds, logging, tracing, and telemetry descriptors) consumed by the OTEL service.

## Observability Configuration

The component supports comprehensive observability features through the `observability` configuration section:

```yaml
components:
  - name: edge-alb
    type: application-load-balancer
    config:
      # ... other configuration ...
      observability:
        dashboard:
          enabled: true
          name: "my-alb-dashboard"  # Optional custom name
        xrayTracing:
          enabled: true
          samplingRate: 0.1  # 10% sampling
          serviceName: "my-service"  # Optional custom service name
        waf:
          enabled: true
          managedRuleGroups:
            - "AWSManagedRulesCommonRuleSet"
            - "AWSManagedRulesKnownBadInputsRuleSet"
            - "AWSManagedRulesSQLiRuleSet"
          customRules: []  # Optional custom rules
```

### Features

- **Telemetry contract**: Publishes metrics and alarm expectations (`RequestCount`, `HTTPCode_ELB_5XX_Count`, unhealthy host counts, connection errors) via the observability capability.
- **Centralised dashboards**: Emits dashboard widget definitions so the observability binder can render CloudWatch dashboards; the component no longer synthesizes them directly.
- **Tracing directives**: Announces optional X-Ray sampling rules in telemetry instead of creating `CfnSamplingRule` resources.
- **AWS WAF**: Security protection with managed rule groups and custom rules.
- **CDK Nag**: Security validation with proper suppressions.

> Monitoring thresholds, tracing preferences, and dashboard widgets are published through the `observability:application-load-balancer` capability so the central observability service can provision OTEL collectors, CloudWatch alarms, and dashboards centrally. The component no longer synthesizes those resources directly.

### Telemetry Descriptor

The `observability:application-load-balancer` capability exposes a `telemetry` object similar to the example below. The observability binder reads this payload to materialize metrics, alarms, dashboards, and tracing rules in a consistent manner:

```json
{
  "telemetry": {
    "metrics": [
      { "metricName": "HTTPCode_ELB_5XX_Count", "namespace": "AWS/ApplicationELB" },
      { "metricName": "UnHealthyHostCount", "dimensions": { "TargetGroup": "targetgroup/edge-blue/..." } }
    ],
    "alarms": [
      { "id": "alb-http5xx", "metricId": "<lb>-elb-5xx", "threshold": 10, "comparisonOperator": "gte" }
    ],
    "logging": { "destination": "s3", "bucketName": "edge-alb-logs" },
    "tracing": { "provider": "xray", "samplingRate": 0.1 }
  }
}
```

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/application-load-balancer/tests/application-load-balancer.builder.test.ts \
  packages/components/application-load-balancer/tests/application-load-balancer.component.synthesis.test.ts
```

## Notes

- The component no longer inspects `context.complianceFramework`; all compliance-driven behaviour must be expressed via the segregated config files.
- When tests need to synthesise without hitting AWS, provide a VPC ID and inject the matching CDK context (the builder honours the supplied IDs without mutating them).
