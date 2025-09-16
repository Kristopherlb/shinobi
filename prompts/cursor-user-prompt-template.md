# Cursor User Prompt Template

## Component Generation Request

```
Generate a new component:

componentName: "s3-bucket"
serviceType: "s3-bucket"
framework: "fedramp-moderate"
extraControlTags: ["AC-2(3)", "AT-4(b)"]

Tasks:
- Use KB packs (global logging+monitoring, service s3, fedramp-moderate).
- Scaffold component/builder/creator/tests/docs.
- Ensure defaults satisfy encryption+access logging.
- Stamp compliance tags on resources.
- Emit audit plan, REGO (where needed), obs alarms/dashboard from recipe.
- Generate unit tests for property rules.
- Run static audit; if failing, adjust code and tests.
```

## Alternative Component Generation Requests

### Lambda API Component
```
Generate a new component:

componentName: "lambda-api"
serviceType: "lambda-api"
framework: "fedramp-high"
extraControlTags: ["AC-2(3)", "AT-4(b)", "SC-7(8)"]

Tasks:
- Use KB packs for lambda service with fedramp-high framework.
- Ensure API Gateway integration with proper security.
- Enable X-Ray tracing and CloudWatch monitoring.
- Generate comprehensive test suite.
```

### ECS Cluster Component
```
Generate a new component:

componentName: "ecs-cluster"
serviceType: "ecs-cluster"
framework: "commercial"
extraControlTags: ["AC-6", "SC-7"]

Tasks:
- Use KB packs for ECS service with commercial framework.
- Enable container insights and logging.
- Configure auto-scaling and load balancing.
- Generate REGO policies for container security.
```

### RDS Cluster Component
```
Generate a new component:

componentName: "rds-cluster"
serviceType: "rds-cluster"
framework: "fedramp-moderate"
extraControlTags: ["AC-2", "SC-28"]

Tasks:
- Use KB packs for RDS service with fedramp-moderate framework.
- Enable encryption at rest and in transit.
- Configure backup and monitoring.
- Generate compliance tests for data protection.
```

## Compliance Q&A Requests

### Ask About Packs
```
qa.component(componentName: "s3-bucket", question: "which packs are selected?")
```

### Ask About Controls
```
qa.component(componentName: "lambda-api", question: "which nist controls are enforced?")
```

### Ask About Rules
```
qa.component(componentName: "ecs-cluster", question: "which rules are enforced?")
```

### Ask About Capabilities
```
qa.component(componentName: "rds-cluster", question: "which capabilities are enabled?")
```

### Ask About Security Features
```
qa.component(componentName: "s3-bucket", question: "what security features are implemented?")
```

### Ask About Compliance Gaps
```
qa.component(componentName: "lambda-api", question: "are there any compliance gaps?")
```

### Ask for Summary
```
qa.component(componentName: "ecs-cluster", question: "provide a compliance summary")
```

## Component Upgrade Requests

### Upgrade Existing Component
```
Upgrade the existing component:

componentName: "ec2-instance"
serviceType: "ec2-instance"
framework: "fedramp-moderate"
extraControlTags: ["AC-2(3)", "AT-4(b)"]

Tasks:
- Use KB packs to update compliance requirements.
- Regenerate audit plan with latest controls.
- Update tests to reflect new compliance rules.
- Run static audit to verify compliance.
```

## Observability Requests

### Generate Observability Config
```
Generate observability configuration for:

componentName: "s3-bucket"
framework: "fedramp-moderate"

Tasks:
- Create CloudWatch alarms based on service recipe.
- Generate OpenTelemetry dashboard template.
- Configure log retention based on framework.
- Set up monitoring and alerting.
```

## Testing Requests

### Run Component Tests
```
Run tests for component:

componentName: "lambda-api"

Tasks:
- Execute unit tests for builder and component.
- Run compliance tests for NIST controls.
- Execute observability tests for monitoring.
- Generate test coverage report.
```

## Audit Requests

### Run Static Audit
```
Run static compliance audit for:

Tasks:
- Execute synth + (nag|guard|conftest) over the repo.
- Validate component structure and patterns.
- Check compliance plan integrity.
- Report any violations or gaps.
```

## Multi-Component Requests

### Generate Multiple Components
```
Generate multiple components for a service:

serviceType: "web-application"
framework: "fedramp-moderate"
components: ["s3-bucket", "lambda-api", "ecs-cluster"]
extraControlTags: ["AC-2(3)", "AT-4(b)"]

Tasks:
- Generate each component with consistent compliance.
- Ensure components work together.
- Generate integration tests.
- Run static audit for all components.
```
