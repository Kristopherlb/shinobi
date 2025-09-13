#!/usr/bin/env node
/**
 * Dagger Engine Pool - Deployment Bundle (DBL) Pipeline
 * 
 * End-to-end pipeline for building, testing, signing, and publishing
 * immutable deployment bundles to Artifactory OCI registry.
 * 
 * Features:
 * - Build & test with FIPS/STIG compliance
 * - SBOM generation (SPDX/CycloneDX)
 * - Cosign signing (keyless OIDC or KMS)
 * - SLSA provenance attestations
 * - OCI artifact publishing to Artifactory
 * - Immutable deployment by digest
 */

import { dag, Container, Directory, Secret } from "@dagger.io/dagger";

// FIPS/STIG-pinned runner image
const RUNNER_IMAGE = "registry/org/platform-runner:1.5.0";
const NODE_VERSION = "20.12.2";

type DaggerPipelineConfig = {
  service: string;
  env: string;
  artifactoryHost: string;
  ociRepoBundles: string; // e.g. registry/org/bundles
  ociRepoImages?: string; // e.g. registry/org/images
  versionTag: string;     // semver or build-id
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  fipsMode: boolean;
};

function baseToolbox(src: Directory): Container {
  return dag
    .container()
    .from(RUNNER_IMAGE)
    .withMountedDirectory("/src", src)
    .withWorkdir("/src")
    .withExec(["bash", "-lc", `node -v || true`]); // sanity check
}

/** 1) Build & Test with Compliance Validation */
export async function buildAndTest(
  source: Directory,
  cfg: DaggerPipelineConfig
): Promise<{ outDir: Directory; testReports: Directory; complianceReport: Directory }> {
  const c = baseToolbox(source)
    // Install dependencies with frozen lockfile
    .withExec(["bash", "-lc", "pnpm i --frozen-lockfile"])

    // Build the component
    .withExec(["bash", "-lc", "pnpm -w build"])

    // Run tests with JUnit output
    .withExec(["bash", "-lc", "mkdir -p reports"])
    .withExec(["bash", "-lc", "pnpm -w test --reporter=junit --reporter-options output=reports/junit.xml"])

    // Generate coverage report
    .withExec(["bash", "-lc", "pnpm -w test:coverage --reporter=json --reporter-options output=reports/coverage.json"])

    // Run compliance audit
    .withExec(["bash", "-lc", "mkdir -p compliance"])
    .withExec(["bash", "-lc", `node tools/svc-audit-static.mjs packages/components/${cfg.service} > compliance/audit-report.json`])

    // Generate infrastructure plan
    .withExec(["bash", "-lc", "mkdir -p out"])
    .withExec(["bash", "-lc", `node tools/svc-plan.mjs ${cfg.service} ${cfg.complianceFramework} > out/plan.json`])

    // Synthesize CDK output
    .withExec(["bash", "-lc", "pnpm -w synth --output out/cdk.out"]);

  return {
    outDir: c.directory("out"),
    testReports: c.directory("reports"),
    complianceReport: c.directory("compliance")
  };
}

/** 2) Build Container Images (if any) */
export async function buildImages(
  source: Directory,
  cfg: DaggerPipelineConfig
): Promise<{ imageRefs: string[] }> {
  if (!cfg.ociRepoImages) return { imageRefs: [] };

  // Build Dagger Engine Pool container image
  const imageRef = `${cfg.ociRepoImages}/${cfg.service}:${cfg.versionTag}`;

  const image = await dag
    .container()
    .build(source.file("Dockerfile")) // Assumes Dockerfile in component root
    .publish(imageRef);

  return { imageRefs: [imageRef] };
}

/** 3) Generate SBOMs (Software Bill of Materials) */
export async function generateSboms(
  source: Directory,
  images: string[],
  cfg: DaggerPipelineConfig
): Promise<Directory> {
  let c = baseToolbox(source)
    .withExec(["bash", "-lc", "mkdir -p artifacts/sbom"]);

  // SBOM for workspace (source code)
  c = c.withExec([
    "bash", "-lc",
    `syft dir:/src -o spdx-json > artifacts/sbom/workspace.spdx.json`
  ]);

  // SBOM for each container image
  for (const ref of images) {
    const safe = ref.replace(/[/:]/g, "_");
    c = c.withExec([
      "bash", "-lc",
      `syft ${ref} -o spdx-json > artifacts/sbom/${safe}.spdx.json`
    ]);
  }

  // Generate CycloneDX format as well
  c = c.withExec([
    "bash", "-lc",
    `syft dir:/src -o cyclonedx-json > artifacts/sbom/workspace.cyclonedx.json`
  ]);

  return c.directory("artifacts");
}

/** 4) Security Scanning with Grype */
export async function securityScan(
  source: Directory,
  images: string[],
  cfg: DaggerPipelineConfig
): Promise<Directory> {
  let c = baseToolbox(source)
    .withExec(["bash", "-lc", "mkdir -p artifacts/security"]);

  // Scan workspace for vulnerabilities
  c = c.withExec([
    "bash", "-lc",
    `grype dir:/src -o json > artifacts/security/workspace-vulns.json`
  ]);

  // Scan each container image
  for (const ref of images) {
    const safe = ref.replace(/[/:]/g, "_");
    c = c.withExec([
      "bash", "-lc",
      `grype ${ref} -o json > artifacts/security/${safe}-vulns.json`
    ]);
  }

  // Generate SARIF report for CI/CD integration
  c = c.withExec([
    "bash", "-lc",
    `grype dir:/src -o sarif > artifacts/security/workspace-vulns.sarif`
  ]);

  return c.directory("artifacts");
}

/** 5) Create Deployment Bundle (DBL) as OCI Artifact */
export async function createDeploymentBundle(
  source: Directory,
  outDir: Directory,
  testReports: Directory,
  complianceReport: Directory,
  artifacts: Directory,
  cfg: DaggerPipelineConfig
): Promise<{ subjectRef: string; digest: string }> {
  const c = baseToolbox(source)
    .withMountedDirectory("/out", outDir)
    .withMountedDirectory("/reports", testReports)
    .withMountedDirectory("/compliance", complianceReport)
    .withMountedDirectory("/artifacts", artifacts)

    // Create bundle structure
    .withExec(["bash", "-lc", "mkdir -p bundle/{cdk.out,sbom,reports,compliance,security,policy}"])

    // Copy all artifacts to bundle
    .withExec(["bash", "-lc", "cp -R /out/* bundle/ && cp -R /reports bundle/reports && cp -R /compliance bundle/compliance && cp -R /artifacts/* bundle/"])

    // Generate bundle manifest
    .withExec(["bash", "-lc", `cat > bundle/manifest.json << EOF
{
  "schema": "v1",
  "service": "${cfg.service}",
  "version": "${cfg.versionTag}",
  "environment": "${cfg.env}",
  "compliance_framework": "${cfg.complianceFramework}",
  "fips_mode": ${cfg.fipsMode},
  "build_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "notes": "Deployment Bundle for ${cfg.service} - FIPS/STIG compliant"
}
EOF`])

    // Create bundle tarball
    .withExec(["bash", "-lc", "tar -C bundle -czf bundle.tgz ."])

    // Push bundle as OCI artifact using ORAS
    .withExec(["bash", "-lc", `oras push ${cfg.ociRepoBundles}:${cfg.versionTag} \
      --artifact-type application/vnd.org.dbl \
      bundle/manifest.json:application/json \
      bundle.tgz:application/vnd.org.dbl.layer+gzip`])

    // Get the digest
    .withExec(["bash", "-lc", `oras discover -o json ${cfg.ociRepoBundles}:${cfg.versionTag} > /tmp/ref.json && jq -r '.descriptor.digest' /tmp/ref.json > /tmp/digest`]);

  const digest = await c.file("/tmp/digest").contents();
  const subjectRef = `${cfg.ociRepoBundles}@${digest.trim()}`;

  return { subjectRef, digest: digest.trim() };
}

/** 6) Sign & Attest (Cosign + SLSA Provenance) */
export async function signAndAttest(
  source: Directory,
  subjectRef: string,
  images: string[],
  cfg: DaggerPipelineConfig,
  cosignKey?: Secret           // For KMS: kms://aws-kms/alias/<key>
): Promise<void> {
  let c = baseToolbox(source);

  // Configure Cosign (keyless OIDC or KMS)
  if (cosignKey) {
    // KMS-based signing
    c = c.withSecretVariable("COSIGN_KEY", cosignKey)
      .withSecretVariable("AWS_REGION", cosignKey) // Assume same region
      .withExec(["bash", "-lc", "export COSIGN_EXPERIMENTAL=0"]);
  } else {
    // Keyless OIDC signing
    c = c.withExec(["bash", "-lc", "export COSIGN_EXPERIMENTAL=1"]);
  }

  // 6a) Sign container images (if any)
  for (const ref of images) {
    c = c.withExec(["bash", "-lc", `cosign sign --yes ${ref}`]);
  }

  // 6b) Sign the DBL subject
  c = c.withExec(["bash", "-lc", `cosign sign --yes ${subjectRef}`]);

  // 6c) Attach SBOMs as referrers
  c = c.withExec(["bash", "-lc", `cosign attach sbom --sbom bundle/sbom/workspace.spdx.json --type spdx ${subjectRef}`]);

  // 6d) Generate and attach SLSA provenance
  c = c.withExec([
    "bash", "-lc",
    `cosign attest --predicate <(./scripts/gen-provenance.sh ${subjectRef} ${cfg.service} ${cfg.versionTag} ${cfg.complianceFramework}) --type slsaprovenance ${subjectRef}`
  ]);

  await c.stdout();
}

/** 7) Policy Verification & Channel Promotion */
export async function verifyAndPromote(
  source: Directory,
  subjectRef: string,
  cfg: DaggerPipelineConfig
): Promise<void> {
  const c = baseToolbox(source)
    // Verify signatures and provenance
    .withExec(["bash", "-lc", `cosign verify ${subjectRef}`])
    .withExec(["bash", "-lc", `cosign verify-attestation --type slsaprovenance ${subjectRef}`])

    // Run policy checks (REGO policies from component audit)
    .withExec(["bash", "-lc", `opa test bundle/policy/*.rego`])

    // Promote to environment channel
    .withExec(["bash", "-lc", `oras copy ${subjectRef} ${cfg.ociRepoBundles}:${cfg.versionTag}-${cfg.env}-ready`]);

  await c.stdout();
}

/** 8) Complete Pipeline - End-to-End */
export async function runCompletePipeline(
  source: Directory,
  cfg: DaggerPipelineConfig,
  cosignKey?: Secret
): Promise<{ subjectRef: string; digest: string; evidence: any }> {
  console.log(`🚀 Starting Dagger Engine Pool DBL pipeline for ${cfg.service}@${cfg.versionTag}`);

  // Step 1: Build & Test
  console.log("📦 Building and testing...");
  const { outDir, testReports, complianceReport } = await buildAndTest(source, cfg);

  // Step 2: Build Images
  console.log("🐳 Building container images...");
  const { imageRefs } = await buildImages(source, cfg);

  // Step 3: Generate SBOMs
  console.log("📋 Generating SBOMs...");
  const artifacts = await generateSboms(source, imageRefs, cfg);

  // Step 4: Security Scanning
  console.log("🔒 Running security scans...");
  const securityArtifacts = await securityScan(source, imageRefs, cfg);

  // Step 5: Create Bundle
  console.log("📦 Creating deployment bundle...");
  const { subjectRef, digest } = await createDeploymentBundle(
    source, outDir, testReports, complianceReport, artifacts, cfg
  );

  // Step 6: Sign & Attest
  console.log("✍️ Signing and attesting...");
  await signAndAttest(source, subjectRef, imageRefs, cfg, cosignKey);

  // Step 7: Verify & Promote
  console.log("✅ Verifying and promoting...");
  await verifyAndPromote(source, subjectRef, cfg);

  // Generate evidence
  const evidence = {
    subjectRef,
    digest,
    service: cfg.service,
    version: cfg.versionTag,
    environment: cfg.env,
    complianceFramework: cfg.complianceFramework,
    fipsMode: cfg.fipsMode,
    images: imageRefs,
    timestamp: new Date().toISOString(),
    artifacts: {
      bundle: subjectRef,
      sboms: `${subjectRef}/sbom`,
      provenance: `${subjectRef}/provenance`,
      signatures: `${subjectRef}/signature`
    }
  };

  console.log("🎉 DBL pipeline completed successfully!");
  console.log(`📦 Bundle: ${subjectRef}`);
  console.log(`🔑 Digest: ${digest}`);

  return { subjectRef, digest, evidence };
}
