/**
 * ApiGateway Account Handler
 * 
 * Handles the singleton AWS::ApiGateway::Account resource.
 * 
 * ApiGateway Account is a singleton per account/region. If it already exists,
 * CDK attempts to create a new CloudWatch Role and Account resource that references
 * it using Fn::GetAtt, causing Early Validation failures.
 * 
 * This handler checks if an ApiGateway Account exists, and if it does, removes
 * the Account and CloudWatch Role resources from the synthesized template.
 */

import * as path from 'path';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import type { Logger } from '../../logger/src/index.js';

// Find workspace root by walking up from current directory
async function findWorkspaceRoot(startDir: string): Promise<string | null> {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  
  const markerFiles = ['pnpm-workspace.yaml', 'pnpm-workspace.yml', 'nx.json', 'turbo.json', 'rush.json'];
  
  while (current !== root) {
    for (const marker of markerFiles) {
      try {
        const markerPath = path.join(current, marker);
        await fsp.access(markerPath);
        return current;
      } catch {
        // Continue checking
      }
    }
    
    // Check package.json for workspaces field
    try {
      const packageJsonPath = path.join(current, 'package.json');
      const packageJsonContent = await fsp.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      if (packageJson.workspaces) {
        return current;
      }
    } catch {
      // Continue
    }
    
    current = path.dirname(current);
  }
  
  return null;
}

// NOTE: Previously this module included ad-hoc debug telemetry (HTTP + file writes).
// That has been removed to keep @shinobi/core deterministic and side-effect free.

export interface ApiGatewayAccountHandlerDependencies {
  logger: Logger;
}

export interface PostProcessResult {
  templateModified: boolean;
  manifestModified: boolean;
}

/**
 * Read/write cdk.context.json for caching Account existence
 * Similar to how CDK caches VPC lookups
 */
async function readCdkContext(workspaceRoot: string): Promise<Record<string, any>> {
  const contextPath = path.join(workspaceRoot, 'cdk.context.json');
  try {
    const content = await fsp.readFile(contextPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // File doesn't exist or is invalid - return empty object
    return {};
  }
}

async function writeCdkContext(workspaceRoot: string, context: Record<string, any>): Promise<void> {
  const contextPath = path.join(workspaceRoot, 'cdk.context.json');
  try {
    await fsp.writeFile(contextPath, JSON.stringify(context, null, 2) + '\n', 'utf-8');
  } catch (error) {
    // Context file is optional; ignore write errors.
  }
}

function getAccountContextKey(region: string, accountId?: string): string {
  // Use account ID if available, otherwise just region
  // Format matches CDK's context key pattern
  return accountId 
    ? `apigateway-account:account=${accountId}:region=${region}`
    : `apigateway-account:region=${region}`;
}

export class ApiGatewayAccountHandler {
  constructor(private dependencies: ApiGatewayAccountHandlerDependencies) {}

  /**
   * Post-process template to handle ApiGateway Account singleton
   * 
   * @param assemblyDir - CDK assembly directory
   * @param stackId - Stack artifact ID
   * @param templateFileName - Template file name (e.g., 'stack.template.json')
   * @param region - AWS region
   * @returns Result indicating if template/manifest were modified
   */
  async postProcess(
    assemblyDir: string,
    stackId: string,
    templateFileName: string,
    region: string
  ): Promise<PostProcessResult> {
    const templatePath = path.join(assemblyDir, templateFileName);
    
    try {
      // Check if ApiGateway Account exists in AWS
      // If it exists, we need to remove any Account resources from the template
      // to avoid Early Validation errors
      // 
      // We use cdk.context.json to cache the result (similar to CDK's VPC lookups)
      // This persists across deployments and avoids repeated API calls
      let accountExists = false;
      
      // Try to get account ID from stack ID or environment
      // Stack ID format: {service}-{env} (e.g., "test-service-v2-dev")
      // For now, we use region-only key (account ID would require AWS STS call)
      const workspaceRoot = await findWorkspaceRoot(process.cwd());
      const contextKey = getAccountContextKey(region);
      
      // Check cdk.context.json first
      let context: Record<string, any> = {};
      if (workspaceRoot) {
        context = await readCdkContext(workspaceRoot);
        const cached = context[contextKey];
        
        if (cached && typeof cached === 'object' && 'exists' in cached) {
          // Use cached result from cdk.context.json
          accountExists = cached.exists === true;
          this.dependencies.logger.debug(
            `ApiGateway Account existence (from cdk.context.json): ${accountExists ? 'exists' : 'does not exist'} (region: ${region})`
          );
        }
      }
      
      // If not in cache, check AWS
      if (!context[contextKey] || !('exists' in context[contextKey])) {
        try {
          const apiGatewayModule = await import('@aws-sdk/client-api-gateway');
          const APIGatewayClient = apiGatewayModule.APIGatewayClient;
          const GetAccountCommand = apiGatewayModule.GetAccountCommand;
          const client = new APIGatewayClient({ region });
          const command = new GetAccountCommand({});
          await client.send(command);
          accountExists = true;
          
          // Update cdk.context.json
          if (workspaceRoot) {
            context[contextKey] = { exists: true };
            await writeCdkContext(workspaceRoot, context);
          }
          
          this.dependencies.logger.debug(
            `ApiGateway Account exists in AWS (region: ${region}). Cached to cdk.context.json. Checking template for Account resources...`
          );
        } catch (error: any) {
          // Account doesn't exist or error checking - this is fine, CDK can create it
          if (error.name === 'NotFoundException' || error.name === 'AccessDeniedException') {
            accountExists = false;
            
            // Update cdk.context.json
            if (workspaceRoot) {
              context[contextKey] = { exists: false };
              await writeCdkContext(workspaceRoot, context);
            }
            
            this.dependencies.logger.debug(
              `ApiGateway Account does not exist in AWS (region: ${region}). Cached to cdk.context.json. CDK can create it.`
            );
          } else {
            // Other error - don't cache (might be transient), but continue (non-fatal)
            this.dependencies.logger.debug(
              `Error checking ApiGateway Account (non-fatal): ${error.message || String(error)}`
            );
            // On error, assume Account doesn't exist (safer - we'll remove Account resources if they exist in template)
            accountExists = false;
          }
        }
      }

      // Read and parse template
      const templateContent = await fsp.readFile(templatePath, 'utf-8');
      const template = JSON.parse(templateContent);
      let apiGatewayResourcesRemoved = false;

      // Find and remove ApiGateway Account resources
      const accountResources = Object.keys(template.Resources || {}).filter(
        (key) => template.Resources[key].Type === 'AWS::ApiGateway::Account'
      );
      
      for (const resourceKey of accountResources) {
        // CRITICAL: Remove all references BEFORE deleting the resource
        // This includes DependsOn arrays and any GetAtt/Ref references in Properties/Outputs
        const dependsOnRemovedCount = this.removeDependsOnReferences(template, resourceKey);
        this.removeResourceReferences(template, resourceKey);
        
        delete template.Resources[resourceKey];
        apiGatewayResourcesRemoved = true;
        
        // Verify resource is deleted and no DependsOn references remain
        this.countDependsOnReferences(template, resourceKey);
      }

      // Find and remove CloudWatch Role resources that are referenced by ApiGateway Account
      // Look for IAM Roles with apigateway.amazonaws.com service principal
      const cloudWatchRoleResources = Object.keys(template.Resources || {}).filter((key) => {
        const resource = template.Resources[key];
        if (resource.Type === 'AWS::IAM::Role') {
          const principal =
            resource.Properties?.AssumeRolePolicyDocument?.Statement?.[0]?.Principal;
          return principal?.Service === 'apigateway.amazonaws.com';
        }
        return false;
      });
      
      for (const resourceKey of cloudWatchRoleResources) {
        // CRITICAL: Remove all references BEFORE deleting the resource
        // This includes DependsOn arrays and any GetAtt/Ref references in Properties/Outputs
        const dependsOnRemovedCount = this.removeDependsOnReferences(template, resourceKey);
        this.removeResourceReferences(template, resourceKey);
        
        delete template.Resources[resourceKey];
        apiGatewayResourcesRemoved = true;
        
        // Verify resource is deleted and no DependsOn references remain
        this.countDependsOnReferences(template, resourceKey);
      }

      if (!apiGatewayResourcesRemoved) {
        return { templateModified: false, manifestModified: false };
      }

      // Write modified template
      await fsp.writeFile(templatePath, JSON.stringify(template, null, 2), 'utf-8');

      // CRITICAL: Also remove references from manifest.json
      // CDK uses manifest.json to understand the assembly structure
      // If manifest references removed resources, Early Validation may still fail
      const manifestModified = await this.removeManifestReferences(assemblyDir, stackId);

      return {
        templateModified: true,
        manifestModified
      };
    } catch (error) {
      // ApiGateway Account doesn't exist or error checking - let CDK create it
      // Non-fatal: continue deployment
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.dependencies.logger.debug(
        `ApiGateway Account check failed (non-fatal): ${errorMessage}`
      );
      return { templateModified: false, manifestModified: false };
    }
  }

  /**
   * Remove DependsOn references to a resource from all other resources
   * 
   * CloudFormation supports DependsOn as either:
   * - A string (single dependency): "ResourceName"
   * - An array (multiple dependencies): ["Resource1", "Resource2"]
   * 
   * This method handles both formats.
   */
  private removeDependsOnReferences(template: any, resourceKey: string): number {
    let removedCount = 0;
    
    if (!template.Resources) {
      return removedCount;
    }
    
    for (const otherResourceKey of Object.keys(template.Resources)) {
      const otherResource = template.Resources[otherResourceKey];
      
      if (!otherResource || !otherResource.DependsOn) {
        continue;
      }
      
      // Handle string DependsOn
      if (typeof otherResource.DependsOn === 'string') {
        if (otherResource.DependsOn === resourceKey) {
          delete otherResource.DependsOn;
          removedCount++;
        }
      }
      // Handle array DependsOn
      else if (Array.isArray(otherResource.DependsOn)) {
        const originalLength = otherResource.DependsOn.length;
        otherResource.DependsOn = otherResource.DependsOn.filter(
          (dep: string) => dep !== resourceKey
        );
        // Check if any references were removed (only if array still exists)
        if (otherResource.DependsOn && otherResource.DependsOn.length < originalLength) {
          removedCount++;
        }
        // Remove DependsOn array if it's now empty
        if (otherResource.DependsOn && otherResource.DependsOn.length === 0) {
          delete otherResource.DependsOn;
        }
      }
    }
    
    return removedCount;
  }

  /**
   * Remove GetAtt and Ref references to a resource from Properties and Outputs
   * 
   * CloudFormation templates can reference resources via:
   * - Ref: { "Ref": "ResourceName" }
   * - GetAtt: { "Fn::GetAtt": ["ResourceName", "Attribute"] }
   * 
   * This method removes these references from all resource Properties and stack Outputs.
   */
  private removeResourceReferences(template: any, resourceKey: string): void {
    // Remove references from resource Properties
    if (!template.Resources) {
      return;
    }
    
    for (const otherResourceKey of Object.keys(template.Resources)) {
      const otherResource = template.Resources[otherResourceKey];
      if (otherResource && otherResource.Properties) {
        this.removeReferencesFromObject(otherResource.Properties, resourceKey);
      }
    }
    
    // Remove references from Outputs section
    if (template.Outputs) {
      for (const outputKey of Object.keys(template.Outputs)) {
        const output = template.Outputs[outputKey];
        if (output && output.Value) {
          this.removeReferencesFromObject(output.Value, resourceKey);
        }
      }
    }
  }

  /**
   * Recursively remove Ref and GetAtt references to a resource from an object
   * 
   * WARNING: Replacing with placeholders may still cause validation errors.
   * Instead, we should remove or nullify the entire property containing the reference.
   * For now, we log the replacement for debugging.
   */
  private removeReferencesFromObject(obj: any, resourceKey: string): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];
        // If item is a Ref or GetAtt to the deleted resource, remove it from the array
        if (item && typeof item === 'object') {
          if (item.Ref === resourceKey || 
              (item['Fn::GetAtt'] && Array.isArray(item['Fn::GetAtt']) && item['Fn::GetAtt'][0] === resourceKey)) {
            obj.splice(i, 1);
            i--; // Adjust index after removal
          } else {
            this.removeReferencesFromObject(item, resourceKey);
          }
        } else {
          this.removeReferencesFromObject(item, resourceKey);
        }
      }
      return;
    }
    
    // Handle Ref: { "Ref": "ResourceName" }
    if (obj.Ref === resourceKey) {
      // For Account resource, we can safely remove the Ref since Account doesn't produce outputs
      // that are commonly referenced. Set to null to indicate missing resource.
      delete obj.Ref;
    }
    
    // Handle GetAtt: { "Fn::GetAtt": ["ResourceName", "Attribute"] }
    if (obj['Fn::GetAtt'] && Array.isArray(obj['Fn::GetAtt']) && obj['Fn::GetAtt'][0] === resourceKey) {
      // For Account resource, GetAtt is typically used to get CloudWatchRoleArn.
      // Since we're deleting the Account, we should remove this GetAtt.
      delete obj['Fn::GetAtt'];
    }
    
    // Recursively process nested objects
    for (const key of Object.keys(obj)) {
      if (key !== 'Ref' && key !== 'Fn::GetAtt') {
        this.removeReferencesFromObject(obj[key], resourceKey);
      }
    }
  }

  /**
   * Count remaining DependsOn references to a resource (for verification)
   */
  private countDependsOnReferences(template: any, resourceKey: string): number {
    let count = 0;
    
    if (!template.Resources) {
      return count;
    }
    
    for (const otherResourceKey of Object.keys(template.Resources)) {
      const otherResource = template.Resources[otherResourceKey];
      
      if (!otherResource || !otherResource.DependsOn) {
        continue;
      }
      
      if (typeof otherResource.DependsOn === 'string' && otherResource.DependsOn === resourceKey) {
        count++;
      } else if (Array.isArray(otherResource.DependsOn)) {
        if (otherResource.DependsOn.includes(resourceKey)) {
          count += otherResource.DependsOn.filter((dep: string) => dep === resourceKey).length;
        }
      }
    }
    
    return count;
  }

  /**
   * Remove metadata references from manifest.json
   */
  private async removeManifestReferences(
    assemblyDir: string,
    stackId: string
  ): Promise<boolean> {
    try {
      const cdkManifestPath = path.join(assemblyDir, 'manifest.json');
      const manifestContent = await fsp.readFile(cdkManifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      let manifestModified = false;

      // Remove metadata entries for Account and CloudWatch Role resources
      const stackArtifact = manifest.artifacts?.[stackId];
      if (stackArtifact?.metadata) {
        // Remove Account metadata
        const accountMetadataKeys = Object.keys(stackArtifact.metadata).filter(
          (key) =>
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

      return manifestModified;
    } catch (manifestError) {
      // Non-fatal: continue even if we can't modify the manifest
      this.dependencies.logger.debug(
        `Failed to modify manifest (non-fatal): ${manifestError instanceof Error ? manifestError.message : String(manifestError)}`
      );
      return false;
    }
  }
}

