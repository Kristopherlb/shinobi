#!/usr/bin/env tsx
/**
 * Shinobi Platform Dagger Pipeline
 * 
 * Provides a consistent, containerized CI/CD pipeline for the Shinobi platform
 * that can be executed across different CI providers with hermetic execution
 * and compliance guarantees.
 */

import { dag, Container, Directory, Secret } from "@dagger.io/dagger";

// Pipeline configuration interface
interface PipelineConfig {
  // Source code directory
  source: Directory;

  // Environment configuration
  environment: string;
  complianceFramework: "commercial" | "fedramp-moderate" | "fedramp-high";

  // Security and compliance settings
  useFipsCompliantImages: boolean;
  enableMtls: boolean;

  // Pipeline steps to execute
  steps: {
    validate: boolean;
    test: boolean;
    audit: boolean;
    plan: boolean;
    deploy: boolean;
  };

  // Output configuration
  outputFormat: "json" | "yaml" | "pretty";

  // Secrets for deployment
  secrets?: {
    awsAccessKeyId?: Secret;
    awsSecretAccessKey?: Secret;
    awsRegion?: string;
    githubToken?: Secret;
  };
}

// Base image selection based on compliance requirements
function getBaseImage(config: PipelineConfig): string {
  if (config.useFipsCompliantImages) {
    return "public.ecr.aws/aws-distroless/nodejs20-fips:latest";
  }
  return "node:20-alpine";
}

// Create the platform container with all dependencies
function createPlatformContainer(config: PipelineConfig): Container {
  const baseImage = getBaseImage(config);

  let container = dag
    .container()
    .from(baseImage)
    .withWorkdir("/workspace")
    .withMountedDirectory("/workspace", config.source)

    // Install system dependencies
    .withExec(["apk", "add", "--no-cache", "git", "curl", "jq", "yq"])

    // Install Node.js dependencies
    .withExec(["npm", "ci", "--only=production"])
    .withExec(["npm", "run", "build"]);

  // Add compliance-specific configurations
  if (config.complianceFramework !== "commercial") {
    container = container
      .withEnvVariable("COMPLIANCE_FRAMEWORK", config.complianceFramework)
      .withEnvVariable("FIPS_COMPLIANCE_REQUIRED", "true");
  }

  // Add mTLS configuration if enabled
  if (config.enableMtls) {
    container = container
      .withEnvVariable("DAGGER_MTLS_ENABLED", "true")
      .withEnvVariable("DAGGER_ENGINE_POOL_ENDPOINT", "tcp://dagger-engine-pool:8080");
  }

  return container;
}

// Validation step
async function runValidation(container: Container, config: PipelineConfig): Promise<Container> {
  console.log("🔍 Running platform validation...");

  let cmd = ["npm", "run", "svc", "validate"];
  if (config.outputFormat === "json") {
    cmd.push("--json");
  }
  if (config.environment) {
    cmd.push("--env", config.environment);
  }

  return container.withExec(cmd);
}

// Testing step
async function runTests(container: Container, config: PipelineConfig): Promise<Container> {
  console.log("🧪 Running platform tests...");

  const testCmd = [
    "npm", "test",
    "--", "--coverage",
    "--testTimeout=30000"
  ];

  return container.withExec(testCmd);
}

// Audit step
async function runAudit(container: Container, config: PipelineConfig): Promise<Container> {
  console.log("🔒 Running compliance audit...");

  let auditCmd = ["npm", "run", "audit:all"];
  if (config.outputFormat === "json") {
    auditCmd.push("--format", "json");
  } else {
    auditCmd.push("--format", "pretty");
  }

  return container.withExec(auditCmd);
}

// Planning step
async function runPlanning(container: Container, config: PipelineConfig): Promise<Container> {
  console.log("📋 Generating deployment plan...");

  let planCmd = ["npm", "run", "svc", "plan"];
  if (config.outputFormat === "json") {
    planCmd.push("--json");
  }
  if (config.environment) {
    planCmd.push("--env", config.environment);
  }

  return container.withExec(planCmd);
}

// Deployment step
async function runDeployment(
  container: Container,
  config: PipelineConfig
): Promise<Container> {
  console.log("🚀 Running deployment...");

  if (!config.secrets?.awsAccessKeyId || !config.secrets?.awsSecretAccessKey) {
    throw new Error("AWS credentials required for deployment");
  }

  // Configure AWS credentials
  container = container
    .withSecretVariable("AWS_ACCESS_KEY_ID", config.secrets.awsAccessKeyId)
    .withSecretVariable("AWS_SECRET_ACCESS_KEY", config.secrets.awsSecretAccessKey)
    .withEnvVariable("AWS_DEFAULT_REGION", config.secrets.awsRegion || "us-east-1");

  let deployCmd = ["npm", "run", "svc", "up"];
  if (config.environment) {
    deployCmd.push("--env", config.environment);
  }

  return container.withExec(deployCmd);
}

// Main pipeline execution
export async function runPlatformPipeline(config: PipelineConfig): Promise<Container> {
  console.log("🥷 Starting Shinobi Platform Pipeline...");
  console.log(`Environment: ${config.environment}`);
  console.log(`Compliance: ${config.complianceFramework}`);
  console.log(`Steps: ${JSON.stringify(config.steps)}`);

  // Create the base container
  let container = createPlatformContainer(config);

  // Execute pipeline steps in sequence
  if (config.steps.validate) {
    container = await runValidation(container, config);
  }

  if (config.steps.test) {
    container = await runTests(container, config);
  }

  if (config.steps.audit) {
    container = await runAudit(container, config);
  }

  if (config.steps.plan) {
    container = await runPlanning(container, config);
  }

  if (config.steps.deploy) {
    container = await runDeployment(container, config);
  }

  console.log("✅ Pipeline completed successfully!");
  return container;
}

// CLI interface for direct execution
// Note: This is handled by the test-pipeline.ts script instead
// to avoid import.meta issues with Jest
