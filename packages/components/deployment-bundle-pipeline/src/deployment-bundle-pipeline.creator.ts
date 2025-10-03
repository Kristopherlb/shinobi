/**
 * Creator for Deployment Bundle Pipeline Component
 * 
 * Factory for creating and validating deployment bundle pipeline instances
 */

import { IComponentCreator } from '@platform/core';
import { DeploymentBundlePipelineComponent } from './deployment-bundle-pipeline.component.ts';
import { DeploymentBundleConfig } from './types.ts';

export class DeploymentBundlePipelineCreator implements IComponentCreator {

  createComponent(context: any, spec: any): DeploymentBundlePipelineComponent {
    return new DeploymentBundlePipelineComponent(context, spec);
  }

  validateSpec(spec: any): void {
    // Validate required fields
    if (!spec.service) {
      throw new Error('Service name is required in spec');
    }

    if (!spec.versionTag) {
      throw new Error('Version tag is required in spec');
    }

    // Validate service name format
    if (!/^[a-z0-9-]+$/.test(spec.service)) {
      throw new Error('Service name must contain only lowercase letters, numbers, and hyphens');
    }

    // Validate version tag format
    if (!/^[a-zA-Z0-9._-]+$/.test(spec.versionTag)) {
      throw new Error('Version tag contains invalid characters');
    }

    // Validate environment if provided
    if (spec.environment) {
      const validEnvironments = ['dev', 'staging', 'prod'];
      if (!validEnvironments.includes(spec.environment)) {
        throw new Error(`Invalid environment. Must be one of: ${validEnvironments.join(', ')}`);
      }
    }

    // Validate compliance framework if provided
    if (spec.complianceFramework) {
      const validFrameworks = ['commercial', 'fedramp-moderate', 'fedramp-high', 'iso27001', 'soc2'];
      if (!validFrameworks.includes(spec.complianceFramework)) {
        throw new Error(`Invalid compliance framework. Must be one of: ${validFrameworks.join(', ')}`);
      }
    }

    // Validate signing configuration if provided
    if (spec.signing) {
      if (spec.signing.keyless && spec.signing.kmsKeyId) {
        throw new Error('Cannot use both keyless and KMS-based signing');
      }

      if (!spec.signing.keyless && !spec.signing.kmsKeyId) {
        throw new Error('Must specify either keyless or KMS-based signing');
      }

      if (spec.signing.kmsKeyId && !spec.signing.kmsKeyId.startsWith('kms://')) {
        throw new Error('KMS key ID must start with kms://');
      }
    }

    // Validate security configuration if provided
    if (spec.security) {
      if (spec.security.failOnCritical !== undefined && typeof spec.security.failOnCritical !== 'boolean') {
        throw new Error('failOnCritical must be a boolean');
      }

      if (spec.security.onlyFixed !== undefined && typeof spec.security.onlyFixed !== 'boolean') {
        throw new Error('onlyFixed must be a boolean');
      }

      if (spec.security.addCpesIfNone !== undefined && typeof spec.security.addCpesIfNone !== 'boolean') {
        throw new Error('addCpesIfNone must be a boolean');
      }
    }

    // Validate bundle configuration if provided
    if (spec.bundle) {
      if (spec.bundle.includeCdkOutput !== undefined && typeof spec.bundle.includeCdkOutput !== 'boolean') {
        throw new Error('includeCdkOutput must be a boolean');
      }

      if (spec.bundle.includeTestReports !== undefined && typeof spec.bundle.includeTestReports !== 'boolean') {
        throw new Error('includeTestReports must be a boolean');
      }

      if (spec.bundle.includeCoverage !== undefined && typeof spec.bundle.includeCoverage !== 'boolean') {
        throw new Error('includeCoverage must be a boolean');
      }

      if (spec.bundle.includePolicyReports !== undefined && typeof spec.bundle.includePolicyReports !== 'boolean') {
        throw new Error('includePolicyReports must be a boolean');
      }
    }

    // Validate runner configuration if provided
    if (spec.runner) {
      if (spec.runner.image && typeof spec.runner.image !== 'string') {
        throw new Error('Runner image must be a string');
      }

      if (spec.runner.nodeVersion && typeof spec.runner.nodeVersion !== 'string') {
        throw new Error('Node version must be a string');
      }

      if (spec.runner.fipsMode !== undefined && typeof spec.runner.fipsMode !== 'boolean') {
        throw new Error('FIPS mode must be a boolean');
      }
    }

    // Validate Artifactory configuration if provided
    if (spec.artifactoryHost) {
      try {
        new URL(`https://${spec.artifactoryHost}`);
      } catch {
        throw new Error('Invalid Artifactory host URL');
      }
    }

    if (spec.ociRepoBundles && typeof spec.ociRepoBundles !== 'string') {
      throw new Error('OCI repository for bundles must be a string');
    }

    if (spec.ociRepoImages && typeof spec.ociRepoImages !== 'string') {
      throw new Error('OCI repository for images must be a string');
    }

    // Check for mutually exclusive configurations
    if (spec.signing?.keyless && spec.signing?.kmsKeyId) {
      throw new Error('Cannot use both keyless and KMS-based signing');
    }

    // Validate context requirements
    if (!context) {
      throw new Error('Context is required');
    }

    // Check for required context values based on compliance framework
    if (spec.complianceFramework === 'fedramp-moderate' || spec.complianceFramework === 'fedramp-high') {
      if (!context.account) {
        throw new Error('Account context is required for FedRAMP compliance');
      }

      if (!context.region) {
        throw new Error('Region context is required for FedRAMP compliance');
      }
    }

    // Validate that required tools are available in the environment
    this.validateEnvironmentRequirements(spec);
  }

  private validateEnvironmentRequirements(spec: any): void {
    // This would check that required tools are available
    // For now, we'll just log a warning about missing tools
    const requiredTools = ['cosign', 'oras', 'syft', 'grype', 'skopeo', 'jq'];

    // In a real implementation, this would check if tools are available
    // and throw an error if they're missing
    console.warn('Environment validation: Ensure the following tools are available:', requiredTools.join(', '));
  }

  getComponentType(): string {
    return 'deployment-bundle-pipeline';
  }

  getSupportedComplianceFrameworks(): string[] {
    return ['commercial', 'fedramp-moderate', 'fedramp-high', 'iso27001', 'soc2'];
  }

  getSupportedEnvironments(): string[] {
    return ['dev', 'staging', 'prod'];
  }

  getRequiredContext(): string[] {
    return ['account', 'region'];
  }

  getOptionalContext(): string[] {
    return ['environment', 'complianceFramework', 'buildId', 'gitCommit', 'gitBranch'];
  }

  getProvidedCapabilities(): string[] {
    return [
      'bundle:digest',
      'bundle:reference',
      'bundle:manifest'
    ];
  }
}
