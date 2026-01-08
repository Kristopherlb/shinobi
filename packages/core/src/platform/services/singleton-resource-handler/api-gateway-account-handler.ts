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
import type { Logger } from '../../logger/src/index.js';

export interface ApiGatewayAccountHandlerDependencies {
  logger: Logger;
}

export interface PostProcessResult {
  templateModified: boolean;
  manifestModified: boolean;
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
      // Check if ApiGateway Account exists
      const apiGatewayModule = await import('@aws-sdk/client-api-gateway');
      const apigatewayClient = new apiGatewayModule.APIGatewayClient({ region });
      const accountResponse = await apigatewayClient.send(new apiGatewayModule.GetAccountCommand({}));
      
      if (!accountResponse.cloudwatchRoleArn) {
        // ApiGateway Account doesn't exist - let CDK create it
        return { templateModified: false, manifestModified: false };
      }

      this.dependencies.logger.debug(
        `ApiGateway Account exists in region ${region}, removing from template`
      );

      // Read and parse template
      const templateContent = await fsp.readFile(templatePath, 'utf-8');
      const template = JSON.parse(templateContent);
      let apiGatewayResourcesRemoved = false;

      // Find and remove ApiGateway Account resources
      const accountResources = Object.keys(template.Resources || {}).filter(
        (key) => template.Resources[key].Type === 'AWS::ApiGateway::Account'
      );
      
      for (const resourceKey of accountResources) {
        delete template.Resources[resourceKey];
        apiGatewayResourcesRemoved = true;

        // CRITICAL: Remove references to Account resource from DependsOn arrays
        // Other resources (like ApiGateway Stage) may depend on the Account resource
        this.removeDependsOnReferences(template, resourceKey);
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
        delete template.Resources[resourceKey];
        apiGatewayResourcesRemoved = true;

        // CRITICAL: Remove references to CloudWatch Role from DependsOn arrays
        this.removeDependsOnReferences(template, resourceKey);
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
      this.dependencies.logger.debug(
        `ApiGateway Account check failed (non-fatal): ${error instanceof Error ? error.message : String(error)}`
      );
      return { templateModified: false, manifestModified: false };
    }
  }

  /**
   * Remove DependsOn references to a resource from all other resources
   */
  private removeDependsOnReferences(template: any, resourceKey: string): void {
    for (const otherResourceKey of Object.keys(template.Resources || {})) {
      const otherResource = template.Resources[otherResourceKey];
      if (otherResource.DependsOn && Array.isArray(otherResource.DependsOn)) {
        otherResource.DependsOn = otherResource.DependsOn.filter(
          (dep: string) => dep !== resourceKey
        );
        // Remove DependsOn array if it's now empty
        if (otherResource.DependsOn.length === 0) {
          delete otherResource.DependsOn;
        }
      }
    }
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

