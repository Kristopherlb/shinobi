# Bug Report: Template Save for Early Validation Debugging

**Status:** ✅ RESOLVED  
**Severity:** MEDIUM  
**Affected Components:** `up-command.ts`  
**Created:** 2026-01-07  
**Reporter:** Platform Team

## Executive Summary

During debugging of `AWS::EarlyValidation::ResourceExistenceCheck` errors, we needed a way to capture the synthesized CloudFormation template for manual analysis and testing with AWS CLI commands. This ticket documents the addition of template file saving functionality to the `up` command.

## Problem Statement

When debugging CloudFormation Early Validation errors, we needed to:
1. Inspect the exact template being sent to CloudFormation
2. Test template validation using AWS CLI commands (e.g., `aws cloudformation create-change-set`)
3. Query change set validation results using `aws cloudformation describe-change-set`
4. Avoid complex instrumentation and change set creation logic in the CLI

The synthesized template exists in the CDK assembly directory, but it's not easily accessible for manual testing.

## Root Cause

The `up` command synthesizes templates and stores them in temporary CDK assembly directories, but doesn't save them to a predictable location for manual use. This made it difficult to:
- Test templates with AWS CLI commands
- Debug Early Validation errors by inspecting the exact template
- Share templates for troubleshooting

## Solution Implemented

### Changes Made

**File:** `apps/svc/src/cli/up-command.ts`

Added template saving functionality after synthesis and post-processing:

```typescript
// Save template to filesystem for manual use
const templatePath = path.join(synthResult.assembly.directory, synthResult.stack.templateFile);
const savedTemplatePath = path.join(process.cwd(), `${stackName}-template.json`);
const templateContent = await fsp.readFile(templatePath, 'utf-8');
await fsp.writeFile(savedTemplatePath, templateContent, 'utf-8');

if (!options.json) {
  logger.info(`Template saved to: ${savedTemplatePath}`);
}
```

**Location:** Lines 146-153 in `up-command.ts`

### Behavior

1. **Template Location**: The template is saved to the workspace root as `{stack-name}-template.json`
   - Example: `api-s3-service-test-dev-template.json`

2. **Timing**: The template is saved **after**:
   - Synthesis completes
   - Post-processing (singleton resource handling) completes
   - This ensures the saved template matches exactly what would be deployed

3. **User Feedback**: A log message indicates where the template was saved (unless `--json` flag is used)

### Why This Approach

1. **Simplicity**: No complex change set creation logic in the CLI
2. **Flexibility**: Users can use AWS CLI commands directly with the saved template
3. **Debugging**: Enables manual testing and inspection of templates
4. **Non-Intrusive**: Doesn't change deployment behavior, only adds file saving

## Usage

### Saving Template

Run the `up` command normally:

```bash
pnpm shinobi up -f apps/api-s3-service-test/service.yml --env dev --yes
```

The template will be saved to:
```
{workspace-root}/{stack-name}-template.json
```

### Using Saved Template

**Note:** If the template is larger than 51,200 bytes, you must upload it to S3 and use `--template-url` instead of `--template-body`.

#### 1. Upload Template to S3 (Required for Large Templates)

```bash
# Create a temporary S3 bucket or use an existing one
BUCKET_NAME="your-temp-bucket-name"
aws s3 cp api-s3-service-test-dev-template.json s3://${BUCKET_NAME}/templates/api-s3-service-test-dev-template.json --region us-west-2

# Get the S3 URL
TEMPLATE_URL="https://${BUCKET_NAME}.s3.us-west-2.amazonaws.com/templates/api-s3-service-test-dev-template.json"
```

#### 2. Create Change Set for Validation

**For Small Templates (< 51,200 bytes):**
```bash
aws cloudformation create-change-set \
    --stack-name "api-s3-service-test-dev" \
    --change-set-name "validation-$(date +%s)" \
    --change-set-type "CREATE" \
    --template-body file://api-s3-service-test-dev-template.json \
    --region us-west-2
```

**For Large Templates (≥ 51,200 bytes):**
```bash
aws cloudformation create-change-set \
    --stack-name "api-s3-service-test-dev" \
    --change-set-name "validation-$(date +%s)" \
    --change-set-type "CREATE" \
    --template-url ${TEMPLATE_URL} \
    --region us-west-2
```

#### 3. Query Change Set Status

```bash
aws cloudformation describe-change-set \
    --stack-name "api-s3-service-test-dev" \
    --change-set-name "validation-{timestamp}" \
    --region us-west-2
```

#### 4. Query Validation Errors

```bash
aws cloudformation describe-stack-events \
    --stack-name "api-s3-service-test-dev" \
    --region us-west-2 \
    --query 'StackEvents[?contains(ResourceStatusReason, `EarlyValidation`) || contains(ResourceStatusReason, `ResourceExistenceCheck`)]'
```

#### 5. Delete Change Set After Testing

#### 6. Clean Up S3 Template (Optional)

```bash
# Remove the template from S3 after testing
aws s3 rm s3://${BUCKET_NAME}/templates/api-s3-service-test-dev-template.json --region us-west-2
```

```bash
aws cloudformation delete-change-set \
    --stack-name "api-s3-service-test-dev" \
    --change-set-name "validation-{timestamp}" \
    --region us-west-2
```

## Benefits

1. **Debugging**: Easy access to templates for manual inspection and testing
2. **Validation**: Can test templates with AWS CLI before deployment
3. **Troubleshooting**: Can share templates for debugging without accessing CDK assembly directories
4. **Early Validation**: Can use CloudFormation change sets to catch validation errors before deployment

## Related Issues

- `tickets/bugs/api-gateway-account-early-validation-error.md` - Original Early Validation error
- `tickets/bugs/vpc-subnet-early-validation-root-cause.md` - VPC/subnet Early Validation issues

## Testing

**Test Case 1: Template Saved Correctly**
- Run `pnpm shinobi up -f apps/api-s3-service-test/service.yml --env dev --yes`
- Verify `api-s3-service-test-dev-template.json` exists in workspace root
- Verify template content matches synthesized template

**Test Case 2: Template Contains Post-Processed Changes**
- Run `up` command with a service that triggers singleton resource handling
- Verify saved template doesn't contain removed singleton resources (e.g., `AWS::ApiGateway::Account`)

**Test Case 3: Multiple Stacks**
- Deploy multiple stacks in sequence
- Verify each stack's template is saved with correct name
- Verify templates don't overwrite each other

## Future Enhancements

Potential improvements (not implemented):
- Option to specify custom template save location via CLI flag
- Option to save template without deploying (`--save-template-only`)
- Template validation before saving (catch JSON syntax errors)

## Notes

- The saved template is the **final** template after all post-processing
- Template is saved even if deployment fails (after synthesis completes)
- Template file is overwritten on each `up` command run for the same stack
- Consider adding template cleanup option for CI/CD environments

