# ECS Fargate Service - Example Manifests

This directory contains example service manifests demonstrating various configurations of the `ecs-fargate-service` component.

## Examples

### simple-api.yml
Basic API service with minimal configuration.

### auto-scaling.yml
Service with CPU and memory-based auto-scaling.

### blue-green-deployment.yml
Service configured for blue-green deployment with CodeDeploy.

### fedramp-moderate.yml
Service configured for FedRAMP Moderate compliance.

### fedramp-high.yml
Service configured for FedRAMP High compliance with full security controls.

## Usage

Copy an example and modify it for your service:

```bash
cp examples/simple-api.yml my-service.yml
# Edit my-service.yml
svc validate --manifest my-service.yml
svc plan --manifest my-service.yml --env dev
```

## Configuration Options

For complete schema documentation, see [Config.schema.json](../Config.schema.json).

