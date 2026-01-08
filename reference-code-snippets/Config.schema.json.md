# ECS Cluster Config Schema

**File:** `packages/components/ecs-cluster/Config.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "ECS Cluster Configuration",
  "description": "Configuration for creating an ECS Cluster with Service Connect",
  "required": ["serviceConnect"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Component name (optional, auto-generated when omitted)",
      "pattern": "^[a-zA-Z][a-zA-Z0-9-_]*$",
      "maxLength": 128
    },
    "description": {
      "type": "string",
      "description": "Component description for documentation",
      "maxLength": 1024
    },
    "serviceConnect": {
      "type": "object",
      "title": "Service Connect Configuration",
      "description": "Configuration for ECS Service Connect and service discovery",
      "required": ["namespace"],
      "properties": {
        "namespace": {
          "type": "string",
          "description": "Cloud Map namespace for service discovery",
          "pattern": "^[a-zA-Z][a-zA-Z0-9.-]*$",
          "minLength": 1,
          "maxLength": 64,
          "examples": ["internal", "my-app.internal", "services"]
        }
      },
      "additionalProperties": false
    },
    "capacity": {
      "type": "object",
      "title": "EC2 Capacity Configuration",
      "description": "Optional EC2 capacity for the cluster. If omitted, cluster is Fargate-only",
      "required": ["instanceType", "minSize", "maxSize"],
      "properties": {
        "instanceType": {
          "type": "string",
          "description": "EC2 instance type for cluster instances",
          "pattern": "^[a-z][a-z0-9-]*\\.[a-z0-9]+$",
          "examples": ["t3.medium", "m7i-flex.2xlarge", "c5.xlarge"]
        },
        "minSize": {
          "type": "integer",
          "description": "Minimum number of instances in Auto Scaling Group",
          "minimum": 0,
          "maximum": 1000
        },
        "maxSize": {
          "type": "integer",
          "description": "Maximum number of instances in Auto Scaling Group",
          "minimum": 1,
          "maximum": 1000
        },
        "desiredSize": {
          "type": "integer",
          "description": "Desired number of instances (defaults to minSize when omitted)",
          "minimum": 0,
          "maximum": 1000
        },
        "keyName": {
          "type": "string",
          "description": "EC2 key pair name for SSH access",
          "pattern": "^[a-zA-Z][a-zA-Z0-9_-]*$"
        },
        "enableMonitoring": {
          "type": "boolean",
          "description": "Enable detailed CloudWatch monitoring for instances",
          "default": false
        },
        "kmsKeyArn": {
          "type": "string",
          "description": "Customer-managed KMS key ARN used to encrypt EC2 capacity EBS volumes",
          "pattern": "^arn:aws[a-zA-Z-]*:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]+$"
        }
      },
      "additionalProperties": false
    },
    "containerInsights": {
      "type": "boolean",
      "description": "Enable Container Insights for advanced monitoring",
      "default": true
    },
    "clusterName": {
      "type": "string",
      "description": "Override for cluster name (auto-generated when omitted)",
      "pattern": "^[a-zA-Z][a-zA-Z0-9-]*$",
      "minLength": 1,
      "maxLength": 255
    },
    "monitoring": {
      "type": "object",
      "description": "Monitoring and observability configuration",
      "properties": {
        "enabled": {
          "type": "boolean",
          "const": true,
          "default": true,
          "description": "Monitoring is always enabled to satisfy platform observability requirements"
        },
        "detailedMetrics": {
          "type": "boolean",
          "description": "Enable detailed CloudWatch metrics",
          "default": false
        },
        "alarms": {
          "type": "object",
          "description": "Component-specific alarm thresholds",
          "additionalProperties": true
        }
      },
      "additionalProperties": false
    },
    "observability": {
      "type": "object",
      "description": "Telemetry controls for logging, tracing, alarms, and dashboards",
      "additionalProperties": false,
      "properties": {
        "logging": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "retentionInDays": {
              "type": "integer",
              "minimum": 1,
              "maximum": 3650,
              "description": "Override the CloudWatch log retention period for Container Insights"
            }
          },
          "default": {}
        },
        "alarms": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "notificationTopicArn": {
              "type": "string",
              "description": "SNS topic ARN used for alarm notifications",
              "pattern": "^arn:aws[a-zA-Z-]*:sns:[a-z0-9-]+:[0-9]{12}:[A-Za-z0-9-_]+$"
            },
            "severityOverrides": {
              "type": "object",
              "description": "Optional overrides for default alarm severities keyed by alarm identifier",
              "additionalProperties": {
                "type": "string"
              }
            }
          },
          "default": {}
        },
        "dashboard": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "enabled": {
              "type": "boolean",
              "default": true,
              "description": "Whether to publish the ECS observability dashboard"
            },
            "name": {
              "type": "string",
              "description": "Optional custom name for the generated dashboard"
            }
          },
          "default": {}
        },
        "tracing": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "adotSidecar": {
              "type": "boolean",
              "default": true,
              "description": "Whether workloads should run with the ADOT sidecar"
            },
            "collectorEndpoint": {
              "type": "string",
              "description": "Override OTLP collector endpoint advertised to workloads"
            }
          },
          "default": {}
        }
      },
      "default": {}
    },
    "tags": {
      "type": "object",
      "description": "Additional resource tags",
      "additionalProperties": {
        "type": "string"
      },
      "default": {}
    }
  },
  "additionalProperties": false
}
```

