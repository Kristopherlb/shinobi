# CDK Platform Project Structure

```
CDK-Lib/
├── README.md                           # Main project documentation
├── CONTRIBUTING.md                     # Contribution guidelines
├── package.json                        # Node.js dependencies and scripts
├── tsconfig.json                       # TypeScript configuration
├── jest.config.js                      # Jest testing configuration
├── service.yml                         # Demo service manifest
├── TODO.md                            # Project backlog and todos
│
├── config/                            # Environment configurations
│   ├── commercial.yml                 # Commercial compliance settings
│   ├── fedramp-moderate.yml          # FedRAMP Moderate settings
│   ├── fedramp-high.yml              # FedRAMP High settings
│   └── templates.yaml                # Template configurations
│
├── docs/                              # Documentation
│   ├── platform-standards/           # Platform standards and compliance
│   │   ├── platform-configuration-standard.md
│   │   ├── platform-logging-standard.md
│   │   ├── platform-observability-standard.md
│   │   ├── platform-tagging-standard.md
│   │   ├── platform-testing-standard.md
│   │   ├── feature-flagging-canary-deployment-v1.0.md
│   │   └── ephemeral-local-environment-standard.md
│   │
│   ├── spec/                          # Technical specifications
│   │   ├── platform-cli-spec.md       # CLI specification
│   │   ├── platform-ephemeral-environment-spec.md
│   │   ├── platform-inventory-tool-spec.md
│   │   ├── n-components-spec.md       # Component specifications
│   │   └── logging-service-spec.md
│   │
│   └── cli/                          # CLI documentation
│       └── svc-inventory.md
│
├── src/                              # Source code
│   ├── cli/                          # Command Line Interface
│   │   ├── cli.ts                    # Main CLI entry point
│   │   ├── init.ts                   # svc init command
│   │   ├── validate.ts               # svc validate command
│   │   ├── plan.ts                   # svc plan command
│   │   ├── deploy.ts                 # svc up/deploy command
│   │   ├── local.ts                  # svc local commands
│   │   ├── inventory.ts              # svc inventory command
│   │   ├── composition-root.ts       # Dependency injection
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── file-discovery.ts
│   │
│   ├── components/                   # Infrastructure Components
│   │   ├── vpc/
│   │   │   ├── vpc.component.ts
│   │   │   ├── vpc.component.test.ts
│   │   │   └── index.ts
│   │   ├── ec2-instance/
│   │   │   ├── ec2-instance.component.ts
│   │   │   ├── ec2-instance.test.ts
│   │   │   └── index.ts
│   │   ├── rds-postgres/
│   │   │   ├── rds-postgres.component.ts
│   │   │   ├── rds-postgres.creator.ts
│   │   │   └── index.ts
│   │   ├── application-load-balancer/
│   │   │   ├── application-load-balancer.component.ts
│   │   │   └── index.ts
│   │   ├── s3-bucket/
│   │   ├── lambda-api/
│   │   ├── ecs-fargate-service/
│   │   ├── ecs-ec2-service/
│   │   ├── ecs-cluster/
│   │   ├── elasticache-redis/
│   │   ├── api-gateway-rest/
│   │   ├── api-gateway-http/
│   │   ├── localstack-environment/
│   │   │   ├── localstack-environment.component.ts
│   │   │   ├── localstack-environment.creator.ts
│   │   │   └── index.ts
│   │   └── [35+ other components...]
│   │
│   ├── services/                     # Core Platform Services
│   │   ├── observability.service.ts  # OpenTelemetry observability
│   │   ├── logging.service.ts        # Structured logging service
│   │   ├── validation-orchestrator.ts
│   │   ├── manifest-parser.ts
│   │   ├── context-hydrator.ts
│   │   ├── schema-validator.ts
│   │   ├── plan-output-formatter.ts
│   │   └── logging-handlers/         # Component-specific logging
│   │       ├── vpc-logging.handler.ts
│   │       ├── rds-logging.handler.ts
│   │       ├── alb-logging.handler.ts
│   │       └── [other handlers...]
│   │
│   ├── resolver/                     # Component Resolution Engine
│   │   ├── resolver-engine.ts        # Main resolution engine
│   │   ├── binder-registry.ts        # Component binding registry
│   │   └── binders/
│   │       └── concrete-binders.ts   # Binding strategies
│   │
│   ├── core-engine/                  # Core Platform Engine
│   │   ├── component-factory-provider.ts
│   │   ├── binding-strategies.ts
│   │   └── index.ts
│   │
│   ├── platform/                     # Platform Contracts & Interfaces
│   │   ├── contracts/
│   │   │   ├── component.ts          # Base component interfaces
│   │   │   ├── config-builder.ts     # Configuration builder
│   │   │   ├── platform-services.ts  # Service interfaces
│   │   │   ├── logging-interfaces.ts
│   │   │   └── [other contracts...]
│   │   └── [platform packages...]
│   │
│   ├── migration/                    # Migration Tools
│   │   ├── migration-engine.ts
│   │   ├── cloudformation-analyzer.ts
│   │   └── resource-mapper.ts
│   │
│   └── templates/                    # Project Templates
│       ├── template-engine.ts
│       └── patterns/
│           ├── empty/
│           ├── lambda-api-with-db/
│           └── worker-with-queue/
│
├── tests/                            # Test Suite
│   ├── unit/                         # Unit tests
│   │   ├── components/               # Component tests
│   │   │   ├── vpc.synthesis.test.ts
│   │   │   ├── rds-postgres.component.test.ts
│   │   │   ├── application-load-balancer.component.test.ts
│   │   │   └── [other component tests...]
│   │   └── [other unit tests...]
│   │
│   ├── integration/                  # Integration tests
│   │   ├── cli-commands.test.ts
│   │   ├── end-to-end-workflows.test.ts
│   │   └── [other integration tests...]
│   │
│   └── e2e/                         # End-to-end tests
│       ├── simple-ec2.test.ts       # Single EC2 deployment test
│       ├── ec2-rds.test.ts          # EC2 + RDS deployment test
│       ├── full-stack.test.ts       # EC2 + RDS + Cache test
│       └── [test service manifests...]
│
├── examples/                         # Usage Examples
│   ├── ec2-rds-cache-binding/
│   │   ├── README.md
│   │   └── service.yml
│   ├── localstack-development/
│   │   ├── README.md
│   │   └── service.yml
│   └── [other examples...]
│
├── tools/                           # Development Tools
│   └── test-metadata-validator.ts
│
├── dist/                            # Compiled JavaScript (generated)
│   ├── cli.js                       # Main CLI executable
│   └── [compiled TypeScript files...]
│
├── demo-output/                     # Demo CDK Output (generated)
│   ├── app.ts                       # Generated CDK application
│   ├── package.json                 # Generated package.json
│   └── cdk.json                     # Generated CDK config
│
├── deploy-standalone.js             # Standalone deploy script (demo)
├── demo-synth.js                    # CDK synthesis demo script
└── docker-compose.localstack.yml   # LocalStack configuration
```

## Key Directories Explained

### `/src/components/`
Contains 40+ infrastructure components (VPC, EC2, RDS, Lambda, ECS, etc.). Each component follows a standard pattern:
- `*.component.ts` - Main component implementation
- `*.test.ts` - Unit tests
- `index.ts` - Export interface

### `/src/services/`
Core platform services including:
- **ObservabilityService** - OpenTelemetry integration
- **LoggingService** - Structured logging with component-specific handlers
- **ValidationOrchestrator** - Manifest validation pipeline
- **ResolverEngine** - Component resolution and binding

### `/src/cli/`
Complete CLI implementation with commands:
- `svc init` - Project scaffolding
- `svc validate` - Manifest validation
- `svc plan` - Deployment planning
- `svc up` - Infrastructure deployment
- `svc local` - LocalStack management
- `svc inventory` - Code analysis

### `/docs/platform-standards/`
Comprehensive platform standards covering:
- Configuration management
- Logging and observability
- Tagging and governance
- Testing methodologies
- Security compliance (Commercial, FedRAMP Moderate/High)

### `/tests/`
Three-tier testing strategy:
- **Unit tests** - Individual component testing
- **Integration tests** - Service interaction testing  
- **E2E tests** - Full CLI workflow testing

This is a production-ready, enterprise-grade CDK platform with comprehensive testing, documentation, and compliance frameworks.
