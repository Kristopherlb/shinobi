# End-to-End (E2E) Tests

These tests validate that our platform components can actually synthesize working CloudFormation templates and integrate properly with each other.

## Test Strategy

### What We Test
1. **Service Manifest Processing**: Parse `service.yml` files correctly
2. **ResolverEngine Integration**: Full workflow through our component resolution engine
3. **CloudFormation Generation**: Valid CloudFormation templates from service manifests
4. **Component Capabilities**: Components expose correct capabilities for binding
5. **Compliance Framework Application**: Different compliance settings produce correct resources
6. **Multi-Component Integration**: Multiple components work together in a single service

### What We Don't Test (Yet)
- Actual AWS deployment (would require AWS credentials and cost money)
- Runtime behavior of deployed resources
- CLI command integration (`svc plan`, `svc up`)
- LocalStack deployment validation

## Running E2E Tests

```bash
# Run all E2E tests
npm test tests/e2e

# Run specific test
npm test tests/e2e/simple-ec2.test.ts

# Run with verbose output
npm test tests/e2e -- --verbose
```

## Test Scenarios

### `simple-ec2.test.ts`
- **Scenario**: Single EC2 instance from service manifest
- **Tests**: ResolverEngine processing, CloudFormation generation, configuration validation
- **Purpose**: Validates basic service manifest workflow

### `ec2-rds.test.ts` 
- **Scenario**: EC2 + RDS PostgreSQL from service manifest
- **Tests**: Multi-component resolution, database capabilities, compliance frameworks
- **Purpose**: Validates multi-component services and component binding

### `full-stack.test.ts`
- **Scenario**: EC2 + RDS + ElastiCache from service manifest
- **Tests**: Complete application stack, performance, large manifest handling
- **Purpose**: Validates complex multi-tier applications and scalability

## Adding New E2E Tests

1. Create a new `.test.ts` file in this directory
2. Follow the pattern:
   ```typescript
   describe('E2E: Your Scenario', () => {
     let app: cdk.App;
     let stack: cdk.Stack;

     beforeEach(() => {
       app = new cdk.App();
       stack = new cdk.Stack(app, 'TestStack');
     });

     test('should process service manifest', async () => {
       const serviceManifest: ServiceManifest = { /* your manifest */ };
       const resolverEngine = new ResolverEngine();
       const components = await resolverEngine.resolve(serviceManifest, {
         environment: 'dev',
         scope: stack
       });
       // Verify CloudFormation template
     });
   });
   ```
3. Test service manifest processing, ResolverEngine integration, and CloudFormation generation
4. Use CDK assertions to verify AWS resource properties

## Future Enhancements

- **LocalStack Integration**: Deploy to LocalStack for runtime testing
- **CLI Integration**: Test `svc plan` and `svc up` commands
- **Cross-Component Networking**: Test actual network connectivity
- **Performance Testing**: Measure synthesis time and template size
