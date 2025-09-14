# 🥷 Shinobi Platform Dagger CI/CD Integration

This directory contains a comprehensive Dagger-based CI/CD pipeline for the Shinobi platform that provides consistent, containerized, and secure execution across different CI providers.

## 🏗️ Architecture Overview

The Dagger integration provides:

- **Provider-agnostic execution**: Works with GitHub Actions, GitLab CI, Jenkins, and any CI system
- **Hermetic containers**: Isolated, reproducible builds with supply chain integrity
- **Compliance guarantees**: FIPS-140-2 compliant base images and FedRAMP configurations
- **mTLS security**: Secure communication with Dagger Engine Pool
- **Consistent results**: Same outputs regardless of where the pipeline runs

## 📁 Directory Structure

```
dagger/
├── pipelines/                    # Core Dagger pipeline definitions
│   ├── platform-pipeline.ts     # Main platform pipeline
│   └── engine-pool-integration.ts # Engine Pool integration
├── ci-providers/                # CI provider integrations
│   ├── github-actions.yml       # GitHub Actions workflow
│   ├── gitlab-ci.yml           # GitLab CI configuration
│   ├── Jenkinsfile             # Jenkins pipeline
│   └── run-pipeline.sh         # Universal CLI runner
├── examples/                    # Example configurations
└── README.md                   # This documentation
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Dagger CLI
curl -L https://dl.dagger.io/dagger/install.sh | sh

# Install Node.js dependencies
npm install

# Install TypeScript execution tool
npm install -g tsx
```

### 2. Run Pipeline Locally

```bash
# Run full pipeline for development
./dagger/ci-providers/run-pipeline.sh --environment dev

# Run with FedRAMP compliance
./dagger/ci-providers/run-pipeline.sh \
  --environment prod \
  --compliance fedramp-high \
  --fips-compliance

# Run specific steps only
./dagger/ci-providers/run-pipeline.sh \
  --skip-audit \
  --skip-deploy
```

### 3. Initialize Dagger Project

```bash
# Initialize Dagger project (if not already done)
dagger project init --name=shinobi-platform
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Target environment (dev/staging/prod) | `dev` |
| `COMPLIANCE_FRAMEWORK` | Compliance framework | `commercial` |
| `OUTPUT_FORMAT` | Output format (json/yaml/pretty) | `json` |
| `FIPS_COMPLIANCE` | Use FIPS-compliant images | `false` |
| `DAGGER_MTLS_ENABLED` | Enable mTLS for Engine Pool | `false` |
| `AWS_ACCESS_KEY_ID` | AWS access key for deployment | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for deployment | - |
| `AWS_DEFAULT_REGION` | AWS region | `us-east-1` |

### Pipeline Steps

The pipeline includes the following steps:

1. **Validation** (`svc validate`): Validate service manifest and configuration
2. **Testing** (`npm test`): Run unit and integration tests
3. **Audit** (`npm run audit:all`): Run compliance and security audits
4. **Planning** (`svc plan`): Generate deployment plan
5. **Deployment** (`svc up`): Deploy to target environment

## 🔒 Security & Compliance

### FIPS-140-2 Compliance

For FedRAMP environments, the pipeline uses FIPS-compliant base images:

```bash
# Enable FIPS compliance
export FIPS_COMPLIANCE=true
./dagger/ci-providers/run-pipeline.sh --fips-compliance
```

### mTLS Security

Enable mTLS for secure communication with Dagger Engine Pool:

```bash
# Enable mTLS
export DAGGER_MTLS_ENABLED=true
./dagger/ci-providers/run-pipeline.sh --mtls-enabled
```

### Compliance Frameworks

| Framework | Features |
|-----------|----------|
| `commercial` | Standard security, no FIPS requirements |
| `fedramp-moderate` | FIPS-compliant images, enhanced audit logging |
| `fedramp-high` | FIPS-compliant images, network isolation, STIG hardening |

## 🔌 CI Provider Integration

### GitHub Actions

Copy the workflow file to `.github/workflows/`:

```bash
cp dagger/ci-providers/github-actions.yml .github/workflows/
```

The workflow provides:
- Automatic execution on PR and main branch
- Manual workflow dispatch with parameters
- Security scanning with Trivy
- Compliance validation for FedRAMP environments
- PR comment with results

### GitLab CI

Copy the configuration to your repository root:

```bash
cp dagger/ci-providers/gitlab-ci.yml .gitlab-ci.yml
```

Features:
- Multi-stage pipeline with parallel execution
- Coverage reporting
- Security scanning
- Compliance validation
- Manual deployment gates

### Jenkins

Use the Jenkinsfile in your Jenkins pipeline:

```bash
cp dagger/ci-providers/Jenkinsfile Jenkinsfile
```

Features:
- Parameterized builds
- Parallel test execution
- Email notifications
- Artifact archiving
- Compliance validation

### Universal CLI Runner

The `run-pipeline.sh` script works with any CI provider:

```bash
# Make executable
chmod +x dagger/ci-providers/run-pipeline.sh

# Run in any CI environment
./dagger/ci-providers/run-pipeline.sh --environment prod --compliance fedramp-moderate
```

## 🏭 Dagger Engine Pool Integration

For enterprise environments requiring hermetic execution:

### 1. Deploy Engine Pool

```bash
# Deploy Engine Pool with mTLS
docker run -d \
  --name dagger-engine-pool \
  -p 8080:8080 \
  -e DAGGER_MTLS_ENABLED=true \
  dagger/engine-pool:latest
```

### 2. Configure mTLS

```bash
# Generate certificates
dagger engine-pool certs generate

# Configure environment
export DAGGER_ENGINE_POOL_ENDPOINT=tcp://dagger-engine-pool:8080
export DAGGER_MTLS_ENABLED=true
```

### 3. Run with Engine Pool

```bash
./dagger/ci-providers/run-pipeline.sh --mtls-enabled
```

## 📊 Pipeline Outputs

The pipeline generates several outputs:

### Artifacts

- `.shinobi/plan/`: Deployment plans in JSON/YAML format
- `.shinobi/audit/`: Compliance audit results
- `coverage/`: Test coverage reports
- `pipeline-results/`: Complete pipeline execution results

### Reports

- **Validation Report**: Service manifest validation results
- **Test Report**: Unit and integration test results with coverage
- **Audit Report**: Compliance and security audit findings
- **Plan Report**: Infrastructure deployment plan
- **Security Scan**: Vulnerability scan results (Trivy)

## 🛠️ Customization

### Adding Custom Steps

Extend the pipeline by modifying `platform-pipeline.ts`:

```typescript
// Add custom step
async function runCustomStep(container: Container, config: PipelineConfig): Promise<Container> {
  console.log("🔧 Running custom step...");
  return container.withExec(["npm", "run", "custom-command"]);
}

// Integrate into main pipeline
export async function runPlatformPipeline(config: PipelineConfig): Promise<Container> {
  // ... existing steps ...
  
  if (config.steps.custom) {
    container = await runCustomStep(container, config);
  }
  
  // ... rest of pipeline ...
}
```

### Custom Base Images

Modify the `getBaseImage` function:

```typescript
function getBaseImage(config: PipelineConfig): string {
  if (config.useFipsCompliantImages) {
    return "your-registry/fips-compliant-node:latest";
  }
  return "your-registry/node:20-alpine";
}
```

### Environment-Specific Configuration

Add environment-specific logic:

```typescript
// In createPlatformContainer function
if (config.environment === 'prod') {
  container = container
    .withEnvVariable("NODE_ENV", "production")
    .withEnvVariable("LOG_LEVEL", "error");
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Dagger CLI not found**
   ```bash
   # Install Dagger CLI
   curl -L https://dl.dagger.io/dagger/install.sh | sh
   export PATH="$PATH:$HOME/.local/bin"
   ```

2. **Permission denied on scripts**
   ```bash
   chmod +x dagger/ci-providers/run-pipeline.sh
   ```

3. **TypeScript execution errors**
   ```bash
   npm install -g tsx
   ```

4. **AWS credentials not found**
   ```bash
   export AWS_ACCESS_KEY_ID=your-key
   export AWS_SECRET_ACCESS_KEY=your-secret
   ```

### Debug Mode

Enable debug output:

```bash
export DEBUG=true
./dagger/ci-providers/run-pipeline.sh --environment dev
```

### Pipeline Logs

Check pipeline execution logs:

```bash
# View Dagger logs
dagger logs

# View pipeline results
cat pipeline-results/pipeline-summary.json
```

## 📚 Examples

### Example 1: Development Pipeline

```bash
# Run development pipeline
./dagger/ci-providers/run-pipeline.sh \
  --environment dev \
  --compliance commercial \
  --skip-deploy
```

### Example 2: Production Deployment

```bash
# Run production deployment with FedRAMP compliance
./dagger/ci-providers/run-pipeline.sh \
  --environment prod \
  --compliance fedramp-high \
  --fips-compliance \
  --mtls-enabled
```

### Example 3: CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Platform Pipeline
  env:
    ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'prod' || 'dev' }}
    COMPLIANCE_FRAMEWORK: ${{ vars.COMPLIANCE_FRAMEWORK || 'commercial' }}
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  run: ./dagger/ci-providers/run-pipeline.sh
```

## 🤝 Contributing

To contribute to the Dagger integration:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with different CI providers
5. Submit a pull request

## 📄 License

This Dagger integration is part of the Shinobi platform and follows the same licensing terms.

## 🆘 Support

For support with the Dagger integration:

- Check the troubleshooting section above
- Review the pipeline logs
- Open an issue in the repository
- Contact the platform team

---

**🥷 Shinobi Platform - Consistent CI/CD Across All Environments**
