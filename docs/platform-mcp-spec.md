Platform Model Context Protocol (MCP) Server Specification
Version: 1.0 Status: Published Last Updated: September 6, 2025
1. Overview & Vision
This document defines the specification for the platform's Model Context Protocol (MCP) Server. This server acts as the definitive, machine-readable API for the entire platform ecosystem. Its primary purpose is to provide structured, real-time context about our platform's capabilities, schemas, and deployed services to trusted clients, with a focus on enabling AI-driven development and operations.
The vision is to create a "System-Level API" for our infrastructure. By exposing this context, we enable next-generation tools like GitHub Copilot, Cursor, and autonomous AIOps agents to understand, interact with, and even manage our services. This transforms the platform from a human-centric tool into a foundational layer for an intelligent, automated software development lifecycle.
2. Guiding Principles
Read-Only by Default: The MCP server is a descriptive, not a prescriptive, service. Its primary function is to provide information. Any actions (like deployments) are still initiated through the version-controlled, CI/CD-driven workflow.
Desired and Actual State: The server MUST be able to report on both the desired state (as defined in the service.yml manifests in Git) and the actual state (as observed from live AWS APIs). This dual-state awareness is critical for AIOps and drift detection.
Schema-Driven: All data exposed by the MCP server MUST conform to the same, version-controlled JSON schemas used by the platform's validation pipeline (service.yml, component schemas, etc.).
Secure by Design: Access to the MCP server MUST be authenticated and authorized. Clients (whether AI agents or internal tools) will require specific permissions to access platform-level or service-level data.
3. Architectural Implementation
Service: A standalone, containerized REST API service (e.g., ecs-fargate-service) managed by the platform itself.
Data Sources:
Desired State: Read-only access to the Git repositories containing the service manifests.
Actual State: A dedicated, read-only IAM role that grants the server permissions to describe AWS resources across the organization's accounts (e.g., ec2:DescribeInstances, rds:DescribeDBInstances, cloudwatch:GetMetricData).
Authentication: The server will use a token-based authentication mechanism (e.g., API Gateway with a Lambda authorizer) to validate requests from authorized clients.
4. The API Contract (Endpoints)
The MCP server provides two categories of information: the platform's capabilities and the state of individual services.
4.1. Platform-Level Endpoints (The "Toolbox")
These endpoints provide context for generating new infrastructure.
Endpoint
Description
Example Response
GET /platform/components
Lists all available, versioned components in the registry.
[{ "type": "rds-postgres", "version": "1.2.1", "description": "..." }]
GET /platform/components/{type}/schema
Returns the Config.schema.json for a specific component.
The full JSON Schema object for an rds-postgres component.
GET /platform/capabilities
Returns the official Capability Naming Standard.
A list of all supported capabilities (db:postgres, queue:sqs, etc.) and their data shapes.
GET /platform/bindings
Returns the BindingMatrix from the BinderRegistry.
[{ "sourceType": "lambda-api", "targetCapability": "queue:sqs", "supported": true }]
POST /platform/validate
Validates a provided service.yml manifest against the platform's validation pipeline.
{ "valid": true } or { "valid": false, "errors": [...] }

4.2. Service-Level Endpoints (The "Running Systems")
These endpoints provide context for observing and operating on existing infrastructure.
Endpoint
Description
Example Response
GET /services
Lists all services managed by the platform.
[{ "name": "order-api", "owner": "team-fulfillment" }]
GET /services/{name}
Provides a consolidated view of a service, linking to other resources.
{ "name": "order-api", "owner": "...", "complianceFramework": "fedramp-high", "manifestUrl": "/services/order-api/manifest", "statusUrl": "/services/order-api/status" }
GET /services/{name}/manifest
Returns the service's current service.yml from the main branch.
The raw YAML content of the manifest.
GET /services/{name}/status
(The Live View) Returns the actual state of the service by describing its live AWS resources and key metrics.
{ "components": [{ "name": "api-lambda", "status": "OK", "metrics": { "invocations": 1024, "errorRate": "0.1%" } }, { "name": "orders-db", "status": "OK", "metrics": { "cpuUtilization": "15%" } }], "driftDetected": false }
GET /services/{name}/logs
Returns a stream of correlated, structured logs for the service.
A stream of JSON log objects conforming to the Platform Logging Standard.

5. The AI Integration Workflow (The Game-Changer)
This is how an AI assistant like Cursor or a Copilot extension would leverage the MCP server to provide an unparalleled development experience.
Scenario: A developer needs to add caching to their order-api service.
Context Gathering: The developer types a comment in their service.yml: # Add a Redis cache and connect the API to it.
Copilot Action: The Copilot extension queries the MCP server: GET /services/order-api. It learns the service exists and is owned by team-fulfillment.
Discovering Tools: The AI needs to know how to build a cache.
Copilot Action: It queries GET /platform/components. It discovers a component with type: "redis-cache". To understand how to configure it, it queries GET /platform/components/redis-cache/schema.
Understanding Connections: The AI needs to know if a Lambda can connect to Redis.
Copilot Action: It queries GET /platform/bindings. It finds a rule where sourceType: "lambda-api" can connect to targetCapability: "cache:redis".
Intelligent Code Generation: Armed with this comprehensive context, Copilot now generates a high-quality, fully compliant manifest snippet. It knows the exact type to use, the required config fields from the schema, and the correct structure for the binds directive.
# Copilot generates this code suggestion:
- name: order-cache
  type: redis-cache
  config:
    nodeType: "cache.t3.small"

# And modifies the existing 'api' component:
- name: api
  type: lambda-api
  # ... existing config ...
  binds:
    - to: order-cache
      capability: cache:redis
      access: readwrite


Pre-flight Validation (Optional): Before showing the code to the user, the Copilot extension could send the newly generated YAML snippet to the POST /platform/validate endpoint to get instant confirmation that its suggestion is valid.
This closed-loop, context-aware interaction is a massive leap beyond simple text-based autocomplete. It transforms the AI assistant from a code generator into a true, intelligent partner that understands our specific platform, its rules, and its capabilities.
