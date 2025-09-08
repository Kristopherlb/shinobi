# Platform Inventory Tool

The Platform Inventory Tool (`svc inventory`) is a strategic analysis tool that helps platform teams make data-driven decisions about which L3 components to build next. It uses static analysis to discover AWS CDK construct usage patterns across existing codebases.

## Overview

The tool analyzes TypeScript files in a CDK project to:

1. **Count construct usage**: Identifies all AWS L2 construct instantiations
2. **Detect patterns**: Finds frequently co-located constructs that could be abstracted
3. **Generate reports**: Creates actionable recommendations for component development

## Usage

```bash
# Analyze a specific project directory
svc inventory ../my-old-service

# Analyze the current directory
svc inventory ./

# Analyze with custom output location
svc inventory ./src/infrastructure --output ./ANALYSIS_REPORT.md
```

## Example Output

The tool generates a comprehensive `INVENTORY_REPORT.md` containing:

### Raw Construct Inventory
```
| Construct Type | Count | Example Locations |
|---|---|---|
| `cloudwatch.Alarm` | 68 | api-gateway-http/api-gateway-http.component.ts:871 |
| `cloudwatch.Metric` | 66 | api-gateway-http/api-gateway-http.component.ts:874 |
| `logs.LogGroup` | 14 | ecs-ec2-service/ecs-ec2-service.component.ts:546 |
```

### Enhanced Component Candidates
```
#### serverless-api
**Pattern:** apigateway.RestApi → lambda.Function → dynamodb.Table
**Frequency:** 5 occurrences
**Priority:** High
**Architectural Value:** 95/100
**Estimated Complexity Reduction:** ~435 lines of code
**Recommendation:** Strong candidate for a lambda-api component.

**Potential Impact:**
- Developer productivity: High
- Maintenance reduction: High  
- Consistency improvement: High

**Found In:**
- `services/user-api/infrastructure.ts`
- `services/order-api/infrastructure.ts`
- `services/product-api/infrastructure.ts`
```

### Anti-Pattern Detection
```
#### ⚠️ unmonitored-lambda
**Pattern:** lambda.Function
**Frequency:** 12 occurrences
**Warning:** Lambda functions without CloudWatch alarms detected.
**Solution:** Add CloudWatch alarms for error rates, duration, and throttles.
```

### Unmappable Resources
Complex imperative constructions that require manual review.

## Enhanced Analysis Features

### Multi-Algorithm Pattern Recognition
The tool uses four sophisticated algorithms working in parallel:

1. **Co-location Analysis**: Identifies constructs that frequently appear together
2. **Semantic Pattern Recognition**: Matches against known AWS architectural patterns
3. **Dependency Chain Analysis**: Detects data flow and processing pipelines  
4. **Anti-Pattern Detection**: Warns about problematic architectural choices

### Architectural Value Scoring
Each pattern receives a 0-100 architectural value score based on:
- **Construct complexity**: Higher scores for sophisticated AWS services
- **Integration value**: Bonus for well-integrated service combinations
- **Frequency impact**: More occurrences = higher potential impact
- **Coherence bonus**: Related services working together

### Enhanced Insights
- **Complexity Reduction Estimates**: Quantified lines of code that could be abstracted
- **ROI Analysis**: Developer time savings and productivity impact
- **Related Pattern Identification**: Consolidation opportunities using similarity analysis
- **Impact Assessment**: Productivity, maintenance, and consistency improvements
- **Anti-Pattern Warnings**: Security and architectural issue detection

### Smart Filtering & Analysis
- Automatically excludes test files (`.test.ts`, `.spec.ts`)
- Focuses on AWS service imports (`aws-cdk-lib/aws-*`)
- Identifies complex imperative logic that may not be suitable for abstraction
- Generates meaningful construct combinations (pairs, triples, etc.)
- Partial pattern matching for incomplete architectural implementations

## Integration into Platform Workflow

### Quarterly Analysis
Run `svc inventory` against all service repositories every quarter to:

1. **Identify trends** in infrastructure usage
2. **Prioritize roadmap** based on real demand
3. **Measure impact** of existing platform components

### Strategic Planning
Use inventory reports to:

- **Data-driven decisions**: Build components that will have maximum impact
- **Resource allocation**: Focus engineering effort on high-value abstractions
- **Technical debt reduction**: Identify repeated boilerplate for elimination

## Technical Implementation

The inventory tool uses:

- **AST Analysis**: `ts-morph` library for TypeScript parsing
- **Pattern Matching**: Intelligent co-location detection
- **Reporting**: Markdown generation with actionable insights

### Supported Constructs

The tool analyzes all AWS CDK L2 constructs including:
- Compute: Lambda, ECS, EC2
- Storage: S3, DynamoDB, RDS
- Networking: VPC, ALB, API Gateway
- Security: IAM, Secrets Manager, KMS
- Observability: CloudWatch, X-Ray

## Best Practices

1. **Run regularly**: Quarterly analysis provides trend insights
2. **Include all services**: Analyze entire codebase for comprehensive view  
3. **Review unmappable resources**: Manual analysis may reveal complex patterns
4. **Track metrics**: Monitor construct usage changes over time
5. **Validate recommendations**: Confirm patterns make architectural sense

## Example Workflow

```bash
# 1. Analyze existing service
cd ../legacy-microservice
svc inventory ./src/infrastructure

# 2. Review generated report
open INVENTORY_REPORT.md

# 3. Identify high-priority patterns
# Look for patterns with 3+ occurrences

# 4. Plan component development
# Add identified patterns to platform roadmap

# 5. Measure impact after implementation
# Re-run analysis to see usage reduction
```

The Platform Inventory Tool transforms gut-feeling component decisions into data-driven platform strategy, ensuring maximum developer productivity impact.
