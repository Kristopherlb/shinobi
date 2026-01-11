# ApiGateway Account Early Validation Fix - Clean Implementation

**Status:** ✅ WORKING  
**Issue:** `AWS::EarlyValidation::ResourceExistenceCheck` error when deploying stacks with API Gateway  
**Root Cause:** ApiGateway Account is a singleton per account/region. CDK creates a new Account resource that references a CloudWatch Role using `Fn::GetAtt`, which Early Validation cannot resolve.  
**Fix:** Check if ApiGateway Account exists, and if it does, remove the Account and CloudWatch Role resources from the template before deployment.

## The Fix (Only Code That Should Be Preserved)

**File:** `apps/svc/src/cli/up-command.ts`  
**Location:** Inside the `produce` function, after `latestSynth = synthResult;`

```typescript
// CRITICAL FIX: ApiGateway Account is a singleton per account/region
// If it already exists, CDK creates a new CloudWatch Role and Account resource
// that references it using Fn::GetAtt, causing Early Validation failures.
// Solution: Check if ApiGateway Account exists, and if it does, remove the
// Account and CloudWatch Role resources from the template.
const assemblyDir = synthResult.assembly.directory;
const templatePath = path.join(assemblyDir, synthResult.stack.templateFile);
try {
  const apiGatewayModule = await import('@aws-sdk/client-api-gateway');
  const apigatewayClient = new apiGatewayModule.APIGatewayClient({ region });
  const accountResponse = await apigatewayClient.send(new apiGatewayModule.GetAccountCommand({}));
  if (accountResponse.cloudwatchRoleArn) {
    // Remove ApiGateway Account and CloudWatch Role resources from template
    try {
      const templateContent = await fsp.readFile(templatePath, 'utf-8');
      const template = JSON.parse(templateContent);
      let apiGatewayResourcesRemoved = false;
      
      // Find and remove ApiGateway Account resources
      const accountResources = Object.keys(template.Resources || {}).filter(key => 
        template.Resources[key].Type === 'AWS::ApiGateway::Account'
      );
      for (const resourceKey of accountResources) {
        delete template.Resources[resourceKey];
        apiGatewayResourcesRemoved = true;
        
        // CRITICAL: Remove references to Account resource from DependsOn arrays
        // Other resources (like ApiGateway Stage) may depend on the Account resource
        for (const otherResourceKey of Object.keys(template.Resources || {})) {
          const otherResource = template.Resources[otherResourceKey];
          if (otherResource.DependsOn && Array.isArray(otherResource.DependsOn)) {
            otherResource.DependsOn = otherResource.DependsOn.filter((dep: string) => dep !== resourceKey);
            // Remove DependsOn array if it's now empty
            if (otherResource.DependsOn.length === 0) {
              delete otherResource.DependsOn;
            }
          }
        }
      }
      
      // Find and remove CloudWatch Role resources that are referenced by ApiGateway Account
      // Look for IAM Roles with apigateway.amazonaws.com service principal
      const cloudWatchRoleResources = Object.keys(template.Resources || {}).filter(key => {
        const resource = template.Resources[key];
        if (resource.Type === 'AWS::IAM::Role') {
          const principal = resource.Properties?.AssumeRolePolicyDocument?.Statement?.[0]?.Principal;
          return principal?.Service === 'apigateway.amazonaws.com';
        }
        return false;
      });
      for (const resourceKey of cloudWatchRoleResources) {
        delete template.Resources[resourceKey];
        apiGatewayResourcesRemoved = true;
        
        // CRITICAL: Remove references to CloudWatch Role from DependsOn arrays
        for (const otherResourceKey of Object.keys(template.Resources || {})) {
          const otherResource = template.Resources[otherResourceKey];
          if (otherResource.DependsOn && Array.isArray(otherResource.DependsOn)) {
            otherResource.DependsOn = otherResource.DependsOn.filter((dep: string) => dep !== resourceKey);
            // Remove DependsOn array if it's now empty
            if (otherResource.DependsOn.length === 0) {
              delete otherResource.DependsOn;
            }
          }
        }
      }
      
      if (apiGatewayResourcesRemoved) {
        await fsp.writeFile(templatePath, JSON.stringify(template, null, 2), 'utf-8');
        
        // CRITICAL: Also remove references from manifest.json
        // CDK uses manifest.json to understand the assembly structure
        // If manifest references removed resources, Early Validation may still fail
        try {
          const cdkManifestPath = path.join(assemblyDir, 'manifest.json');
          const manifestContent = await fsp.readFile(cdkManifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);
          let manifestModified = false;
          
          // Remove metadata entries for Account and CloudWatch Role resources
          const stackArtifact = manifest.artifacts?.[synthResult.stack.id];
          if (stackArtifact?.metadata) {
            // Remove Account metadata
            const accountMetadataKeys = Object.keys(stackArtifact.metadata).filter(key => 
              key.includes('/LambdaRestApi/Account') || 
              key.includes('/LambdaRestApi/CloudWatchRole')
            );
            for (const metadataKey of accountMetadataKeys) {
              delete stackArtifact.metadata[metadataKey];
              manifestModified = true;
            }
            
            if (manifestModified) {
              await fsp.writeFile(cdkManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
            }
          }
        } catch (manifestError) {
          // Non-fatal: continue even if we can't modify the manifest
        }
      }
    } catch (templateError) {
      // Non-fatal: continue even if we can't modify the template
    }
  }
} catch (apigwError) {
  // ApiGateway Account doesn't exist or error checking - let CDK create it
  // Non-fatal: continue deployment
}
```

## Required Dependency

**File:** `apps/svc/package.json`

```json
{
  "dependencies": {
    "@aws-sdk/client-api-gateway": "^3.637.0"
  }
}
```

## Testing

**Verified working:**
- ✅ `minimal-test` deployment succeeded with this fix
- ✅ Fixes `AWS::EarlyValidation::ResourceExistenceCheck` error for stacks with API Gateway

## Notes

- This is the **ONLY** code change that should be preserved
- All other changes were debug code and can be discarded
- The fix is a workaround - a permanent solution should be implemented in component code (see bug report)

