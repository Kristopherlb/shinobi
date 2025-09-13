# test-s3-bucket

CDK L3 component for s3-bucket with fedramp-moderate compliance.

## Features

- Production-ready CDK L3 component
- FEDRAMP-MODERATE compliance by construction
- Comprehensive observability integration
- Automated testing and validation
- Security best practices built-in

## Usage

```typescript
import { test-s3-bucket } from '@cdk-lib/test-s3-bucket';

const component = new test-s3-bucket(scope, 'Mytest-s3-bucket', {
  // Configuration options
});
```

## Compliance

This component enforces the following compliance requirements:

- **Framework**: FEDRAMP-MODERATE
- **NIST Controls**: See `audit/component.plan.json`
- **Security Features**: Encryption, logging, monitoring
- **Observability**: CloudWatch alarms and dashboards

## Development

```bash
npm install
npm run build
npm test
```

## Architecture

- **Component**: Main CDK construct
- **Builder**: Configuration builder with 5-layer precedence
- **Creator**: Component factory with validation
- **Tests**: Unit, integration, and compliance tests
- **Observability**: Alarms, dashboards, and metrics
