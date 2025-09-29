// JSON Schema for Shinobi service.yml manifests
// Based on the MCP API schema definition

export const serviceManifestSchema: any = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Shinobi Service Manifest",
  description: "Schema for Shinobi IDP service.yml manifest files",
  type: "object",
  required: ["service", "owner", "components"],
  properties: {
    service: {
      type: "string",
      pattern: "^[a-z0-9-]+$",
      description: "Service name in lowercase with hyphens only"
    },
    owner: {
      type: "string",
      description: "Service owner or team"
    },
    complianceFramework: {
      type: "string",
      enum: ["commercial", "fedramp-moderate", "fedramp-high"] as const,
      default: "commercial",
      description: "Compliance framework to apply"
    },
    runtime: {
      type: "string",
      description: "Runtime environment specification"
    },
    labels: {
      type: "object",
      description: "Key-value labels for the service",
      additionalProperties: {
        type: "string"
      }
    },
    environments: {
      type: "object",
      description: "Configuration defaults for different environments",
      properties: {
        "$ref": {
          type: "string",
          description: "Relative path to an external configuration file"
        }
      },
      additionalProperties: {
        type: "object",
        properties: {
          "$ref": {
            type: "string"
          },
          defaults: {
            type: "object",
            additionalProperties: true
          }
        }
      }
    },
    components: {
      type: "array",
      minItems: 1,
      description: "List of components in this service",
      items: {
        type: "object",
        required: ["name", "type"],
        properties: {
          name: {
            type: "string",
            pattern: "^[a-z0-9-]+$",
            description: "Component name in lowercase with hyphens only"
          },
          type: {
            type: "string",
            description: "Component type (e.g., lambda-api, rds-postgres, sqs-queue)"
          },
          config: {
            type: "object",
            description: "Component-specific configuration",
            additionalProperties: true
          },
          binds: {
            type: "array",
            description: "Outbound bindings to other capabilities",
            items: {
              type: "object",
              required: ["capability", "access"],
              properties: {
                to: {
                  type: "string",
                  description: "Target component or resource"
                },
                capability: {
                  type: "string",
                  description: "Capability being accessed (e.g., db:postgres, queue:sqs)"
                },
                access: {
                  type: "string",
                  enum: ["read", "write", "admin"] as const,
                  description: "Access level required"
                }
              }
            }
          },
          triggers: {
            type: "array",
            description: "Inbound triggers from other resources",
            items: {
              type: "object",
              required: ["type"],
              properties: {
                type: {
                  type: "string",
                  description: "Trigger type (e.g., http, schedule, queue)"
                },
                config: {
                  type: "object",
                  description: "Trigger-specific configuration",
                  additionalProperties: true
                }
              }
            }
          },
          labels: {
            type: "object",
            description: "Component-specific labels",
            additionalProperties: {
              type: "string"
            }
          },
          overrides: {
            type: "object",
            description: "Environment-specific overrides",
            additionalProperties: true
          },
          policy: {
            type: "object",
            description: "Component policy configuration",
            additionalProperties: true
          }
        }
      }
    },
    extensions: {
      type: "object",
      description: "Platform extensions and customizations",
      properties: {
        patches: {
          type: "array",
          description: "Policy patches and suppressions",
          items: {
            type: "object",
            required: ["name", "justification", "owner", "expiresOn"],
            properties: {
              name: {
                type: "string",
                description: "Policy rule name to patch"
              },
              justification: {
                type: "string",
                minLength: 20,
                description: "Detailed justification for the patch"
              },
              owner: {
                type: "string",
                description: "Owner responsible for this patch"
              },
              expiresOn: {
                type: "string",
                format: "date",
                description: "Expiration date for this patch"
              }
            }
          }
        }
      }
    },
    metadata: {
      type: "object",
      description: "Service metadata and tracking information",
      properties: {
        lastModified: {
          type: "string",
          format: "date-time",
          description: "Last modification timestamp"
        },
        modifiedBy: {
          type: "string",
          description: "User who last modified the manifest"
        },
        gitHash: {
          type: "string",
          description: "Git commit hash for tracking"
        },
        gitBranch: {
          type: "string",
          description: "Git branch name"
        }
      }
    }
  }
} as const;