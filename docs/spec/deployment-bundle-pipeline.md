Deployment Bundle Pipeline (BDL) Implementation Plan
Objectives and Overview
The Deployment Bundle Pipeline (BDL) is a platform component responsible for producing a portable, immutable, signed deployment bundle (also called a deployment bundle artifact) for a service. This bundle encapsulates everything needed to deploy and audit a release, including infrastructure definitions and comprehensive supply-chain metadata. Key objectives and requirements include:
Comprehensive Bundle Contents: Each bundle contains the CDK infrastructure output (e.g. synthesized CloudFormation templates or plans), compiled artifacts and test results, SBOMs (Software Bill of Materials), security scan reports, compliance reports, provenance attestations, and deployment metadata
GitHub
. In short, the bundle is a one-stop artifact capturing the application build and its infrastructure as code, along with all evidence needed for audit and compliance.
Immutable, Content-Addressed Artifact: The bundle is stored as an OCI-compliant artifact in a registry (e.g. Artifactory or ECR) and is content-addressed by digest (no mutable “latest” tags) to support deterministic deployments and rollbacks by digest reference
GitHub
GitHub
. Once created and signed, the bundle is immutable and can be retrieved or promoted by its digest or immutable tag.
Built-In Deployment Logic: The artifact includes (or is associated with) the deployment logic itself. In practice, the pipeline that creates the bundle is implemented as a Dagger function (pipeline as code), meaning the steps to build, verify, and even deploy the bundle are defined in code and can be executed in a portable environment. This ensures the deployment process is self-contained: the same logic used to build the bundle (and captured in provenance) can later be used to apply the infrastructure or verify it, enabling auditable and reproducible deployments.
Security & Compliance by Design: The pipeline and resulting bundle enforce platform security standards. All bundles are cryptographically signed (using Sigstore Cosign) and include SLSA provenance attestations to ensure integrity
GitHub
. The pipeline generates SBOMs (via Syft) and runs vulnerability scans (via Grype), embedding the results in the bundle
GitHub
. It also performs compliance checks (e.g., against FedRAMP, ISO27001 controls) and includes the compliance assessment reports. These measures ensure the bundle meets FedRAMP-High and other framework requirements (e.g., using FIPS-approved crypto, strict vulnerability policies, audit logging)
GitHub
GitHub
.
Dual-Mode Signing (OIDC & KMS): The solution supports two signing modes via Cosign: (1) keyless OIDC signing using ephemeral keys tied to CI/CD OIDC identities – ideal for automated pipelines, and (2) KMS-backed signing using an official AWS KMS key for regulated environments that require use of managed HSM keys
GitHub
GitHub
. In keyless mode, the pipeline interacts with Sigstore’s Fulcio (for certificates) and Rekor (transparency log); in KMS mode, it uses a designated AWS KMS key URI to sign the artifact. Both modes ensure the signature and provenance can be verified independently.
Observability and Logging: The pipeline includes structured logging and OpenTelemetry hooks aligned with platform observability standards
GitHub
. Every step emits structured JSON logs (with service name, stage, and context) and traces/metrics (e.g., timing for each stage, sizes of artifacts) to the platform’s telemetry system. This allows real-time monitoring of pipeline runs and ensures all actions are traceable (important for FedRAMP audit). Standard platform tagging is applied to any resources or logs produced, and the component adheres to platform IAM policies when accessing resources (e.g., using least-privilege roles for registry push, KMS signing, etc.).
Platform Integration: BDL is designed as a first-class component in the internal developer platform. It respects platform configuration layering (component config, environment, global, compliance overrides)
GitHub
 and uses the platform’s feature flags and standards. It leverages the Dagger Engine Pool infrastructure to execute pipelines in an isolated, reusable environment, rather than using ad-hoc CI runners. The bundle generation can be invoked via the standard CLI commands (svc plan, svc up) and integrates with svc audit for verification and evidence gathering. It also fits into external CI/CD workflows (GitLab CI, CircleCI, etc.) seamlessly, as the pipeline runs in containers and can utilize OIDC tokens from those systems for signing
GitHub
.
The following sections detail the architecture, design, and implementation plan for BDL, covering its architecture, AWS CDK constructs, signing and compliance steps, observability integration, testing, and open questions.
Architecture and Components


Figure: High-level architecture of the Deployment Bundle Pipeline. A Dagger Engine Pool (secure CI runners) executes the pipeline stages (build, test, scan, bundle, sign, etc.). The resulting signed bundle (OCI artifact) is pushed to an artifact registry. Deployment and audit processes later pull this bundle via its digest to apply infrastructure changes or verify compliance. Component Architecture: The BDL component itself is implemented as a custom L3 construct in the platform’s AWS CDK codebase (extending the base Component class). However, unlike typical infrastructure components, the BDL does not directly create cloud resources in its synth(); instead, it orchestrates the bundle creation process. The heavy lifting is done by the Dagger pipeline (running within the Dagger Engine Pool), rather than by AWS services like CodeBuild. This design gives portability and ensures the same process can run in any environment (dev, CI, or even air-gapped) with the same outcome, since it’s containerized. Dagger Engine Pool: The platform already includes a Dagger Engine Pool component, which provisions a private fleet of Dagger runners (e.g., EC2 instances with Dagger daemons behind an internal NLB) to execute pipelines securely
GitHub
. BDL leverages this: when a developer runs the bundle pipeline (via CLI or CI trigger), a Dagger engine from the pool pulls the service’s source code and executes the defined pipeline function. The Engine Pool is hardened for compliance (FIPS-enabled AMIs, mTLS, isolated network)
GitHub
, aligning with FedRAMP requirements. It also provides a persistent storage backend (encrypted S3 or EBS) for any caching or artifact needs of Dagger runs
GitHub
 (though BDL primarily pushes final artifacts to the registry). Bundle Artifact Storage: Deployment bundles are stored in an OCI-compliant artifact registry (e.g., Artifactory or Amazon ECR). The pipeline uses ORAS (OCI Registry As Storage) to push a bundle as a manifest with attached blobs. We define a custom OCI artifact type (e.g., application/vnd.org.dbl for "deployment bundle") for the bundle layer. The push returns a digest which uniquely identifies the content
GitHub
. All metadata (bundle manifest JSON, SBOM files, etc.) are either embedded in the bundle or pushed as referrer artifacts (OCI references) linked to the bundle digest. COSIGN Signing: After pushing the bundle, the pipeline invokes Cosign to sign the artifact in-place in the registry. For keyless signing, Cosign uses the ambient OIDC token (from the CI environment or a web identity in the Engine Pool) to obtain a signing certificate (Fulcio) and then uploads the signature and certificate to the Sigstore transparency log (Rekor)
GitHub
GitHub
. For KMS signing, the pipeline will call Cosign with the KMS key reference (the Engine Pool nodes have permissions to use the configured KMS key) – Cosign will sign the artifact using KMS and store the signature in the registry. In both cases, the signature and any attestations are stored as OCI artifact referrers to the bundle (so they can be fetched/audited later). The choice of mode is configurable per deployment or by compliance framework (e.g., FedRAMP-High mandates KMS signing, while default may use keyless)
GitHub
. OpenTelemetry & Logging: The pipeline’s runtime (the container image executing steps) includes OpenTelemetry instrumentation. It forwards traces and metrics to the platform’s collector (the Engine Pool runners are configured with an OTLP endpoint). Each pipeline stage is traced, and key metrics (e.g., "bundle_creation_duration", "vulnerabilities_found", "bundle_size_bytes") are emitted
GitHub
GitHub
. Logs from each step are structured (JSON) and include correlation IDs or trace IDs so they can be tied into platform-wide logging. The BDL component uses the platform’s logging library for any logs printed in the control plane (the DeploymentBundlePipelineComponent class uses this.getLogger() to log errors or info)
GitHub
GitHub
. All resources or processes carry standard platform tags (service name, environment, owner, compliance level, etc.) per policy – for example, the bundle manifest includes identifying tags like service and environment
GitHub
, and any AWS resources indirectly used (like an S3 bucket from Engine Pool or KMS key) are tagged by those components
GitHub
. Integration with Platform CLI: The component is integrated such that svc plan will execute the pipeline in a dry-run mode (producing an infrastructure plan and listing what will be in the bundle without pushing it), and svc up will execute the full pipeline to produce and publish the bundle. Because the BDL is a component in the service manifest (e.g., in service.yml configuration), the platform CLI knows to invoke its synth() which triggers the Dagger pipeline. The output of svc plan or svc up surfaces the bundle’s metadata – for example, after running, the component registers capabilities like the bundle digest, OCI reference, SBOM, and reports
GitHub
. These become accessible to other platform components or commands. For instance, the bundle:digest and bundle:reference capabilities can be used by a deployment orchestrator to pull and deploy that specific bundle in an environment
GitHub
. The svc audit command can use the bundle reference to fetch attached signatures, attestations, SBOMs, and verify them (ensuring the bundle is valid and compliant before promotion).
AWS CDK Constructs and Integration
Although the BDL component primarily performs actions via the pipeline, it is designed and implemented following the platform’s CDK pattern for components:
CDK L3 Construct: DeploymentBundlePipelineComponent extends the base BaseComponent class. It implements the required interface (IComponent) with methods like getType() and synth()
GitHub
GitHub
. This means it fits into the CDK app and can be instantiated as part of the overall service stack. In synth(), instead of defining AWS resources, it orchestrates the pipeline run (see Pipeline Workflow below). It still calls this.applyStandardTags(this) at the end of synth
GitHub
 to satisfy the tagging contract (tagging the component construct itself or any constructs it would create – in this case, it's more of a formality since actual cloud constructs are managed in the Engine Pool).
No Direct AWS Resources: The BDL component does not create persistent AWS resources on its own. All AWS infrastructure needed (e.g., for running the pipeline) is provided by other components:
Dagger Engine Pool: provisions EC2 instances, NLB, security groups, IAM roles, etc., to host the Dagger runtime
GitHub
.
Artifact Storage: the artifact registry (Artifactory) is external or provided by the platform (accessible via credentials).
KMS Key: for signing, an AWS KMS key may be provisioned separately (the platform likely has a pre-provisioned KMS key for signing, or one can be referenced in config). The BDL component will not create a KMS key itself; it uses the key via its ARN/URI (ensuring appropriate IAM permissions are in place for the Engine Pool instances to use it).
CDK Constructs Reuse: If needed, the BDL component could reuse some platform constructs for auxiliary tasks. For example, if the pipeline needed to store intermediate files, it could leverage an S3 bucket and KMS key provided by the Dagger Engine Pool (exposed via capabilities like storage:artifacts and security:kms from that component)
GitHub
GitHub
. This avoids duplicating secure storage resources. Another example is using the Engine Pool’s endpoint (capability dagger:endpoint) to direct Dagger clients; however, the current design assumes the CLI or platform internally knows how to route the pipeline to the Engine Pool.
CloudFormation Outputs/Metadata: Even though no resources are created, the component can still produce a component plan artifact (a JSON manifest of what the component would do). In fact, as part of compliance, an OSCAL (Open Security Controls Assessment Language) metadata JSON for this component is generated and stored (under audit/ directory)
GitHub
. This includes declarative info about the component’s compliance controls implemented (mapping to NIST controls like SA-11, SC-7, etc., which are listed in the documentation
GitHub
). Generating this is part of the pipeline’s compliance stage.
Feature Flags in CDK: The platform’s feature flag system can influence the component’s behavior. For example, certain advanced features can be toggled off globally until ready. If a feature flag to disable SLSA attestations is off, the pipeline could skip generating or attaching provenance. Implementation-wise, the component’s config builder can read feature flag values (from context or environment) and adjust defaults. E.g., a flag might control bundle.includeCoverage default or whether to run an extra scan. The Dagger Engine Pool itself uses feature flags for enabling ECR caching, etc.
GitHub
GitHub
; similarly, BDL can have feature-flag-guarded options like generating coverage reports or extra compliance checks (those could be disabled in early rollout). This ensures we can roll out capabilities like SLSA Level 3 support or enhanced coverage reporting gradually and only enable them for certain projects to test, without changing code.
Pipeline Workflow and Stages
When the deployment-bundle-pipeline component runs (via synth() in CLI or triggered in CI), it executes a multi-stage Dagger pipeline that builds the software and assembles the bundle. The stages and their functions are as follows
GitHub
GitHub
:
Build and Test: Compile the service’s code, run all tests, and synthesize the infrastructure. This stage ensures we have the application artifacts and the IaC (CDK) output. For example, it may run a build (e.g. pnpm build or compile TypeScript), then run unit and integration tests with coverage, producing junit XML and coverage reports, and finally run cdk synth (or the platform’s equivalent svc plan) to generate an infrastructure plan (CloudFormation templates or diff)
GitHub
GitHub
. The outputs include compiled binaries (if any), test reports, coverage data, and a cdk.out directory or plan.json describing the infrastructure changes.
Build Container Images (Optional): If the service includes deployable container images (e.g., a Dockerfile for a microservice), this stage builds those images. It uses Dagger to execute docker builds and can push images to an OCI registry (like a company container registry) tagged with the service version
GitHub
. The image digests and references are noted for inclusion in the SBOM and provenance. (If no images are defined, this stage is skipped.)
Generate Security Artifacts: Produce SBOMs and run vulnerability scans. The pipeline runs Syft to generate SBOMs for both the source workspace (covering application dependencies) and any produced container images
GitHub
GitHub
. Next, it runs Grype to scan for known vulnerabilities in both the application dependencies (scanning the workspace SBOM or source directory) and the container images
GitHub
GitHub
. The scans are configured according to policy – e.g., fail on critical vulnerabilities, or require fixes for all findings depending on settings
GitHub
. The output of this stage includes SBOM files (in SPDX JSON format) and vulnerability reports (as JSON). If any scan fails the policy (e.g., a critical CVE is found and failOnCritical=true), the pipeline will error out, preventing an insecure bundle.
Compliance Checks: Validate the infrastructure and software against compliance rules. This can involve running policy-as-code checks (e.g., OPA/Rego policies) on the synthesized infrastructure or configuration to ensure it meets frameworks like FedRAMP, ISO 27001, etc. For example, rules might verify that encryption is enabled, or no public resources are present if complianceFramework=fedramp-high. The pipeline might invoke a set of Rego policies (packaged with the component) against the CDK output or the environment config
GitHub
. It then generates a compliance report (could be a JSON or CSV listing controls passed/failed)
GitHub
GitHub
. Additionally, an OSCAL document fragment can be produced to update the system security plan. If serious compliance violations are found, the stage can fail (or mark the bundle as non-compliant).
Bundle Creation: Collect all outputs from previous stages and package them into the deployment bundle OCI artifact. The pipeline creates a bundle directory structure and copies in: the infrastructure templates/plan, test reports, coverage data, SBOMs, security reports, and compliance reports
GitHub
GitHub
. It also generates a bundle manifest (e.g., manifest.json) with metadata about the build: service name, version, environment, timestamps, git commit, builder ID, etc.
GitHub
GitHub
. Using ORAS, it then pushes this directory as an OCI artifact to the configured ociRepoBundles, with an immutable tag (like the version or a build ID)
GitHub
. The ORAS push outputs a content digest for the artifact. At this point, the bundle exists in the registry, identified by something like ociRepoBundles:1.2.3 and ociRepoBundles@sha256:.... The component will treat this as the subject for signing.
Signing and Attestation: Immediately after pushing, the pipeline cryptographically signs the bundle and attaches attestations. Using Cosign, it signs the bundle OCI artifact in the registry
GitHub
:
Keyless: If configured for keyless, the Dagger runner uses an OIDC token (from environment) and Cosign contacts Fulcio to get a signing certificate, then records the signature in Rekor (transparency log)
GitHub
. No private key is directly used by the pipeline (the trust is delegated to OIDC and Fulcio).
KMS: If using KMS, Cosign is pointed at the AWS KMS key (COSIGN_KEY=kms://...) and the pipeline has AWS credentials (injected as needed) to authorize signing
GitHub
. Cosign signs the artifact via KMS and stores the signature object in the registry.
In both cases, the signature artifact is stored alongside the bundle (OCI referrer). The pipeline then generates a SLSA Provenance attestation (in JSON format following SLSA v0.2 or in-toto schema) capturing the build process – it includes the builder ID, build invocation ID, source repository, and digest of materials (e.g., source commit, image digests)
GitHub
GitHub
. This provenance JSON is then attached to the bundle in the registry as an attestation (using cosign attest)
GitHub
GitHub
. Additionally, Cosign is used to attach the SBOM files to the bundle as OCI references (with proper media types)
GitHub
. At the end of this stage, the bundle in the registry has: the image layer (with all artifacts), a signed signature, a provenance attestation, and SBOM references. The component records the signature and attestation digests as part of its outputs.
Verification and Promotion: (Post-build or as the final stage) The pipeline (or subsequent platform step) verifies that everything was signed and attached correctly. Cosign’s verify step can be run to ensure the signature is valid and matches the expected identity or KMS key. Policy checks can ensure the provenance meets SLSA requirements (e.g., is non-forgeable). If all looks good, the bundle can be promoted – e.g., the pipeline could mark an image tag as “verified” or notify the CD deployment system that a new bundle is ready for deployment to an environment
GitHub
. Promotion might simply be moving the artifact’s reference to a “stable” channel in Artifactory, or updating a manifest in a GitOps repo with the new digest. This stage essentially gates the artifact from deployment until verification passes. Once complete, the pipeline finishes, and the bundle is now available for use.
Throughout these stages, if any error or policy violation occurs, the pipeline will abort and the failure is logged clearly (with logs and reports preserved for debugging). For example, test failures in Stage 1 or critical CVEs in Stage 3 will prevent an insecure or unverified bundle from being created.
Security, Signing, and Compliance Measures
Security and compliance are central to BDL’s design. This section highlights how the implementation meets those requirements:
Cosign Signing (Keyless & KMS): BDL uses Cosign for signing the bundle OCI artifact. Configuration allows either keyless signing (default for convenience and CI integration) or KMS signing for stricter compliance
GitHub
GitHub
. In keyless mode, no long-lived keys are required; the identity of the build (e.g., GitLab runner OIDC token or a web identity from the Engine Pool’s IAM role) is used to obtain a short-lived certificate. In KMS mode, we specify a URI like kms://arn:aws:kms:us-east-1:1234:key/abcd-efgh and Cosign will use AWS SDK to sign. The pipeline code sets environment variables for Cosign accordingly (e.g., COSIGN_EXPERIMENTAL=1, COSIGN_KEY for KMS, or FULCIO_URL/REKOR_URL if custom endpoints are needed)
GitHub
. The result is that every bundle is signed and can be verified independently of the build pipeline. The signature, along with the public certificate or bundle of trust (for keyless, this includes certificate with OIDC email/issuer embedded), is stored so that svc audit or any verifier can later run cosign verify against the bundle digest.
SLSA Provenance Attestation: To achieve supply chain integrity, the pipeline generates a provenance attestation in the SLSA format (Supply Chain Levels for Software Artifacts). This includes details like who ran the build (builder ID), how (the Dagger Engine Pool, version of pipeline), what sources and inputs went into it (e.g., git commit SHA, base builder image digest), and when
GitHub
GitHub
. The provenance is attached to the artifact using cosign attest so that it’s available in the OCI registry alongside the bundle. This attestation helps fulfill requirements like SLSA Level 3 (ensuring scripts can verify the build process) and certain NIST 800-53 controls (CM-2, SA-12 for supply chain protection)
GitHub
GitHub
. An external auditor or an automated policy (e.g., in svc audit) can fetch this and check for tampering or compliance (e.g., ensure the builder ID is our official Engine Pool and not an untrusted machine).
SBOM Generation: Using Syft to generate SBOMs provides a detailed inventory of software components for both application code and container images. These SBOMs (in SPDX or CycloneDX format, here using SPDX JSON) are included in the bundle
GitHub
. Moreover, Cosign attaches them as SBOM artifacts in the OCI registry
GitHub
 so they are easily discoverable (e.g., cosign download sbom <bundle_digest> can retrieve them). This addresses supply chain transparency requirements (e.g., NTIA SBOM mandates, and FedRAMP SR-11 for developer security testing evidence).
Vulnerability Scanning & Policy Enforcement: The pipeline’s use of Grype for scanning both source dependencies and built images ensures any known vulnerabilities (CVEs) are identified
GitHub
GitHub
. The security config allows tuning strictness: by default, fail on critical vulns is true
GitHub
, meaning any critical CVE will break the pipeline. For high compliance modes, it might also enforce onlyFixed: true (ignore vulnerabilities without available fixes) to avoid noise
GitHub
. The scanning results are saved (JSON reports) and also summarized in the compliance report. This helps fulfill controls like RA-5 (vulnerability monitoring) and SI-2 (flaw remediation) by ensuring no deployment artifact goes out with unmitigated critical flaws
GitHub
. Additionally, the pipeline could integrate policy gates – for example, an OPA policy that checks the Grype output to enforce no criticals or more than X highs. We have Rego policy stubs in audit/rego/ (e.g., bundle_security_policies.rego) to codify these rules.
Compliance Framework Enforcement: Depending on the complianceFramework setting (e.g., "fedramp-high" vs "commercial"), the pipeline adjusts its behavior to enforce the necessary controls
GitHub
GitHub
. For example:
FedRAMP-High: The runner image is switched to FIPS mode (OpenSSL FIPS, etc.), only KMS signing is allowed (no keyless), vulnerability scanning is extra strict (onlyFixed=true), and more verbose audit logging is enabled
GitHub
. Also, additional compliance checks run (ensuring things like multi-factor auth on pipeline if applicable, etc.). The pipeline emits an audit log of its own actions (each step, tools versions, checks performed) which can be archived.
FedRAMP-Moderate: Similar to High but slightly less stringent (e.g., FedRAMP Moderate might allow keyless with certain constraints, but still use FIPS images)
GitHub
.
ISO 27001, SOC 2: The pipeline can include specific reports or mappings for these (perhaps generating a different compliance report artifact). The component documentation outlines differences like ISO and SOC2 focusing on certain scanning and reporting modes
GitHub
.
By encoding these differences in config defaults or conditional logic, we ensure that when a service is marked as FedRAMP-High, the bundle pipeline automatically gates anything not compliant. This approach satisfies various compliance controls (for instance, FedRAMP’s CA-2 security assessments and continuous monitoring controls are met by the pipeline’s scanning and reporting)
GitHub
.
Content Integrity & Immutability: The bundle’s content-addressable nature means any change in inputs will produce a different digest. This is critical for integrity: if someone altered a template or binary after signing, the digest would change and the signature verification would fail. By using digest references for deployment (bundle:digest capability
GitHub
), we guarantee that what gets deployed is exactly what was built and signed. Rollback is also straightforward – since previous versions remain in the registry by digest, an earlier digest can be fetched and deployed if needed (provided it’s still trusted). All deployments are essentially locked to a specific bundle content, preventing “drift” or tampering.
Access Control & IAM: The pipeline uses the platform’s IAM policies – for example, the Engine Pool instances likely assume an IAM role that grants minimal required permissions (push to artifact registry, read/write to a particular S3 bucket if needed, use the KMS key for signing, and emit logs/metrics). No broad credentials are embedded; if running in an external CI, OIDC federation is used to assume a role in the platform to run the pipeline. All artifact registry operations are done over secure channels, and the artifact registry itself can require authentication (the pipeline would be provided a token or use a service account). These measures align with least privilege and FedRAMP AC-3 (access enforcement) controls
GitHub
.
In summary, the BDL pipeline employs multiple open-source tools (Syft, Grype, Cosign, ORAS, OPA) in concert to achieve a strong security posture for each deployment artifact. It automates the creation of audit artifacts and ensures that any bundle promoted to deployment is verifiably secure and compliant.
Observability and Logging
The BDL component and pipeline are instrumented for observability to meet both operational needs and compliance (audit logging) needs:
Structured Logging: All logs emitted during the pipeline execution are in a structured JSON format (consistent with the platform's logging standard)
GitHub
. The Dagger runner image includes the platform’s logging libraries, so any script or tool can log to stdout in JSON (with predefined fields for timestamp, level, service name, etc.). The component’s TypeScript code uses logger.info()/logger.error() with contextual data (e.g., component: deployment-bundle-pipeline, stage name)
GitHub
GitHub
. These logs are forwarded to the central logging system (e.g., CloudWatch via the Engine Pool’s log group or directly via Otel) where they are retained (the Engine Pool config might set log retention to 1 year for audit purposes)
GitHub
.
Metrics: Key performance and outcome metrics are collected. For example, metrics include pipeline duration (overall and per stage), bundle size, number of vulnerabilities found, number of compliance checks passed/failed, etc.
GitHub
GitHub
. The pipeline can emit custom metrics via OpenTelemetry or push metrics to CloudWatch (the Engine Pool might run an Otel Collector that translates Otel metrics to CloudWatch EMF). These metrics feed into dashboards that give the Platform Engineering team visibility into CI health and compliance status (e.g., a dashboard showing how many bundles were built today, how many had vulnerabilities, etc.).
Tracing: OpenTelemetry tracing is integrated such that each pipeline run has a trace with spans for each stage. For instance, Stage 1 (Build & Test) is a span, inside which sub-spans for "Compile", "Test", "CDK Synth" might exist. This helps troubleshoot performance (e.g., if bundle creation is slow, you can see which step took longest) and is also useful for auditing the sequence of actions. The trace ID could be logged in each log line for correlation
GitHub
. If the platform has a distributed tracing backend (Jaeger/Tempo/XS-Ray), these traces would appear there.
Alerts and Monitoring: The platform’s observability standards likely define some alerts. We will configure alerts such as:
Pipeline failures: an alarm if any bundle creation fails (perhaps for prod environment or after X retries)
GitHub
.
Signing failures: alarm on Cosign error events (since a signing failure might indicate a misconfiguration or a security issue)
GitHub
.
Critical vulnerabilities found: could trigger a security alert if a bundle fails due to a critical CVE (so that security team is aware)
GitHub
.
Compliance failures: alarm if compliance stage fails (indicating a possible misconfiguration or drift from compliance requirements)
GitHub
.
These can be implemented via CloudWatch Alarms on specific log patterns or metrics (e.g., a metric for "bundle_failure_count"). The Engine Pool’s CloudWatch Log Group could have subscription filters or we push events to an SNS topic for audit alerts.
Tagging and Metadata: All logs/metrics include standard tags like service, environment, version, etc., allowing easy filtering and search. The bundle artifact itself carries metadata in its manifest (service name, env, build timestamp, etc. as fields)
GitHub
. Also, when the bundle is pushed to Artifactory or ECR, we ensure it’s labeled appropriately (some registries allow setting labels/annotations on artifacts; if so, we add tags like compliance=fedramp-high or built-by=platform-pipeline). This helps with later discovery and access control (e.g., a proxy could prevent pulling artifacts not labeled as compliant).
Audit Logging: For FedRAMP High especially, audit logs must capture any administrative or security-relevant actions. The BDL pipeline’s operations (build, scan, push, sign) are considered CI/CD actions and are logged. Because everything runs in the platform-controlled environment, we have an immutable record in logs. Additionally, if any step calls AWS (e.g., KMS signing, pushing to S3 or ECR), those actions are recorded in AWS CloudTrail. We ensure CloudTrail is enabled for the relevant services (KMS, ECR, S3) and that logs are aggregated per FedRAMP requirements (AU-2, AU-3 controls)
GitHub
. The presence of the OSCAL metadata (component’s OSCAL JSON) means we document which controls are covered by this component and where evidence (logs, reports) can be found for each.
In summary, the design integrates with the platform’s observability stack so that building a deployment bundle is a transparent process with full traceability. Operations teams can monitor it like any production service, and compliance officers can get the data needed to prove controls are met.
Integration with CI/CD and Deployment Processes
CI/CD Pipeline Integration: The deployment bundle pipeline is designed to run in various CI/CD systems with minimal friction. A team can trigger the bundle build from GitLab CI or CircleCI by invoking the platform CLI or API that starts the pipeline (for example, running svc up on a merge to main). Thanks to keyless signing with OIDC, no secrets need to be stored in CI for signing – GitLab’s OIDC JWT or GitHub Actions OIDC can be trusted by our platform’s Fulcio instance (or Sigstore’s public Fulcio) to sign the bundle
GitHub
. The pipeline’s containerized nature (using the platform runner image) means the CI job doesn’t need to have all tools installed – it simply needs Dagger or the CLI which communicates with the Engine Pool. We also provide integration snippets for popular CI systems (e.g., a GitLab CI YAML template that checks out code and calls the platform CLI to build the bundle). The result is that developers can incorporate bundle creation in their existing pipelines easily, and the output (bundle digest, etc.) can be passed to subsequent stages (like a deployment stage). Gated Deployments with Bundles: The ultimate goal is that deployments to environments (dev/staging/prod) consume these bundles. Instead of directly deploying from source, an environment promotion process would fetch the bundle by digest (bundle:reference), verify its signature, and then apply the contained infrastructure. The deployment logic included in the bundle refers to either the CloudFormation templates (which can be deployed by AWS CDK or CloudFormation in the target account) or even a self-contained Dagger plan for deployment. One approach is to include a small Dagger function or script in the bundle that knows how to deploy the infrastructure (perhaps running cdk deploy or Terraform apply as needed). The platform could spin up a Dagger job to execute that deployment function, meaning the bundle can essentially deploy itself when invoked. This ensures the exact IaC that was approved is what gets deployed (fulfilling immutable infrastructure principle). svc audit Integration: The platform’s svc audit command can be used after a bundle is built (or before deployment) to audit the artifact. This command would retrieve the bundle’s signature and verify it against the expected public keys or Sigstore roots, retrieve the SLSA attestation and validate its fields (e.g., ensure the builder was our Engine Pool, etc.), and perhaps scan the SBOM again for any newly disclosed CVEs (in case time passed between build and deploy). It also can compile an evidence package for external auditors – for instance, bundling the SBOM, vulnerability report, compliance report, and attestations into a human-readable report or uploading them to an audit system. This automates a lot of FedRAMP documentation: at any time, we can prove what was in a deployment and that it was built in accordance with our SDLC controls. Multi-Environment and Rollback: Because bundles are content-addressable, deploying version X in staging and then promoting the same bundle to prod is straightforward – you just reference the same digest. If an issue is found, you can roll back by deploying the previous bundle’s digest
GitHub
GitHub
. The platform’s release orchestration can keep track of which bundle digest is deployed where (and perhaps even store that in a parameter or tag in the environment). The BDL component’s outputs (capabilities) make it easy for other components to retrieve the necessary info. For example, a downstream “Deployer” component could bind to bundle:reference and get the exact OCI URL to deploy
GitHub
. This separation of build and deploy allows strict separation of concerns (build pipeline vs. runtime environment), aiding compliance (SC- separation of environments concerns). Cross-Platform Use: Additionally, since the bundle is an OCI artifact, even external tools (like Oras CLI or even Docker pull if we use an image format) could download it. This means other organizations or air-gapped environments could utilize the bundles if they have the signing keys. For example, if sharing artifacts with a government integrator, they can be given access to the Artifactory repository and the public keys to verify the bundle, and they have everything needed to deploy our system in their environment without needing our CI/CD pipeline – truly portable infrastructure deliverables. Feature Flag Rollout: Initially, some advanced features (full SLSA attestations, extended compliance scans, etc.) will be behind feature flags. We will deploy the BDL component with basic functionality enabled (signing, SBOM, basic tests) and gradually enable heavier checks like dynamic security tests or additional attestations. The platform feature flag system can target specific services or environments for these features. This ensures the pipeline remains stable and fast for most users while new capabilities are tested. Over time, as features mature, the flags can be removed or default to on. Documentation in the component README will note which features are behind flags and how to enable them for early adopters. CI/CD Systems Support: We will provide example configurations for various CI systems in the documentation (e.g., how to configure OIDC in GitHub Actions to use keyless signing, how to mount necessary Docker sockets if needed for Dagger, etc.). The goal is to make adoption in CI/CD pipelines straightforward, thus encouraging teams to use the deployment bundle for every release (which in turn enforces compliance on all releases).
Testing Strategy
To ensure the Deployment Bundle Pipeline works as intended and is robust, we will implement a comprehensive testing strategy:
Unit Tests (Component Logic): We will write unit tests for the DeploymentBundlePipelineComponent class methods. These will mostly ensure that configuration building (the Builder) works with various inputs (e.g., required fields, default values for optional fields, feature flag overrides). For instance, a test will verify that if complianceFramework is set to fedramp-high, then the generated config has signing.keyless=false and runner.fipsMode=true by default. Another unit test will simulate the synth() flow with a mocked pipeline execution to ensure that capabilities like bundle:digest and bundle:reference get registered when synth completes
GitHub
. We will also test that errors in any stage are properly caught and cause synth() to throw, and that the logger.error is called with appropriate context
GitHub
.
Dagger Pipeline Unit Tests: Since the pipeline is defined in code (likely in a dagger.ts using the Dagger SDK), we can unit-test individual stage functions in isolation by mocking the Dagger API. For example, test that calling generateSecurityArtifacts with a dummy directory and image list results in the correct sequence of syft and grype commands being added (we can inspect the DAG or the final directory outputs). We can also simulate inputs: e.g., feed a Directory with a known vulnerable package and ensure that the grype command includes --fail-on critical if config says so.
Integration Tests (Local): Using Dagger’s ability to run pipelines locally, we will write integration tests that run the full pipeline on a small sample project. For example, include a simple Node.js service in the repository (or generate one on the fly in a temp dir) with a package.json and maybe a Dockerfile. The test will execute the real buildAndTest, generateSecurityArtifacts, etc., to produce a bundle (pushing to a local OCI registry stub or using the oras CLI to push to a local registry container). After execution, the test will verify:
A bundle file was created and has the expected files (we can use oras pull to fetch it back).
The manifest.json inside has correct fields (service name, version, etc.).
If we intentionally introduce a critical vulnerability in the sample project (e.g., use a library version with a known CVE), the pipeline fails at the scan stage.
If we toggle config like includeCoverage: false, then no coverage folder is present in the bundle.
Signing and attestation: For integration tests, we might use a dry-run mode (Cosign can sign with a local key pair instead of real Fulcio). Alternatively, we configure Cosign to use a local OCI registry without actual Fulcio. We verify that after pipeline, cosign verify --local (or similar) succeeds on the bundle (meaning the signature is attached and matches).
The bundle:digest output from the component matches the digest of the pulled bundle.
Mocked CI Environment Tests: We can simulate running in both keyless and KMS modes. For keyless, we might mock the presence of an OIDC token environment and point FULCIO_URL to the public or a staging Fulcio (Sigstore has a staging environment) for tests. For KMS, we can use AWS KMS integration tests (possibly using a real AWS KMS key in a sandbox account or LocalStack’s KMS if available). These tests ensure the signing flows actually work in practice and that errors are handled (e.g., wrong KMS key ARN should produce a clear error).
Performance Tests: We will also test how the pipeline performs with larger inputs. For example, a project with many dependencies (to produce a large SBOM) or large CDK output, to ensure ORAS can handle pushing it and that timeouts are reasonable. We may adjust resource settings (like give Dagger more memory or compute) if needed. Metrics from these runs will help tune default timeouts and parallelism (for instance, scanning multiple images in parallel if there are many).
Regression Tests for Compliance: Create known scenarios to test compliance rules. For example, a CDK stack that intentionally has an S3 bucket without encryption – our compliance Rego should catch that (if targeting S3 encryption requirement), and the test expects the compliance report to mark it as failed. This ensures our policy-as-code is effective. Similarly test FedRAMP-High mode: spin up pipeline with fedramp-high config and ensure the outputs (FIPS mode on, etc.) and reports include the FedRAMP required checks.
CLI Integration Test: Use the platform CLI in a dry-run context to ensure svc plan does not actually push/sign. This might be done by setting a flag in config (like planOnly) or by running a subset of stages. We verify that svc plan outputs a component.plan.json (which is the machine-readable plan)
GitHub
 and perhaps a summary that lists what would be done. Then svc up actually does it. We can simulate svc up in a non-production environment and then use svc audit to verify the bundle. This end-to-end test proves the integration of component with CLI commands.
Fault Injection Tests: We will simulate failures at various points to ensure the system handles them gracefully. For example, make the oras push fail (simulate registry down) and confirm the error is caught and surfaced properly, and no capabilities are registered (so that a partially complete bundle isn’t considered valid). Another test could revoke the OIDC token mid-run to see if Cosign keyless fails and ensure that fails the pipeline (and doesn’t produce an unsigned bundle).
Security Tests: Since this pipeline deals with security, we also consider testing for unexpected scenarios:
Ensure that secrets (like any credentials in environment for registry or AWS) are not accidentally included in the bundle artifacts or logs.
Ensure a malicious project cannot break out: e.g., what if a repository has a Dockerfile that tries to access the host? The Engine Pool uses container isolation and has no socket access except what we allow. We test that the Dagger environment is indeed isolated (no internet unless allowed, etc.) to prevent exfiltration during bundle build. These may be more platform tests, but relevant to mention.
Finally, all tests will be integrated into the CI of the platform itself, so that any change to BDL’s code or config triggers these tests. We will also do periodic audit of the bundle output (as part of security reviews) to ensure it remains compliant with evolving standards (for example, if new FedRAMP controls come out or SLSA changes levels, update tests accordingly).
Open Questions & Future Considerations
During this design, a few open questions and areas for future work have been identified:
Deployment Execution from Bundle: How exactly the deployment of infrastructure will be triggered using the bundle is an open area. We assume the presence of a deployment tool that consumes bundle:digest and applies the CloudFormation templates within. We need to decide if the bundle itself should carry an automated deploy script (e.g., a Dagger plan that does cdk deploy using the templates and perhaps applies any runtime configuration), or if the platform’s deployment engine will handle that externally. Including the deploy logic in the bundle could be powerful (self-deploying artifact) but also poses security considerations (we must ensure the bundle’s deploy code is trustworthy and deterministic). For now, the design includes the IaC output and relies on external orchestration to perform the actual deploy using that output.
Bundle Size Management: These bundles could become large (SBOMs for big projects, test reports, etc.). Pushing large OCI layers might strain the artifact storage. We should evaluate chunking or splitting layers (ORAS supports multiple files). Currently, the plan is one layer for everything (bundle/ directory tarball)
GitHub
. We might consider splitting code vs reports into separate layers or using compression. This is tunable and might be adjusted if performance suffers.
Inclusion of Secrets or Sensitive Data: We need to ensure that no sensitive information makes it into the bundle. For example, test reports or logs should not contain secrets (we should scrub or avoid logging secrets in pipeline). Also, the SBOM might include dependency paths that reveal internal repo structure; generally okay, but something to be aware of for supply chain transparency (could be sensitive in some cases). We might implement a scrubber for known sensitive patterns in artifacts before bundling.
Revocation and Key Management: With signing comes the question of key revocation. For OIDC keyless, if a signing event is later found unauthorized, we rely on Rekor log entries for transparency, but we can’t revoke those easily – we would instead mark the artifact as not trusted. For KMS signing, if the KMS key is compromised or rotated, how do we handle validating old signatures? Likely by keeping old KMS keys enabled for verification or using key versioning. We should document a process for rotating signing keys or certificates and how that affects verification of existing bundles (perhaps an svc audit check that bundle X was signed with retired key Y triggers a warning).
Support for Additional Artifact Types: Currently we focus on CDK (CloudFormation) output and container images. In future, the pipeline might need to handle other artifact types (e.g., Terraform plans, Lambda code bundles, etc.). The design is fairly extensible (just add stages). We should ensure the manifest is flexible enough to note additional materials (for instance, list multiple image digests, multiple IaC templates). The current manifest includes fields for images and their digests
GitHub
 – we should confirm if we need to add fields for other materials.
Scaling and Parallelism: Running all these steps sequentially might increase build time for large projects. Dagger allows parallel execution, so we might parallelize independent steps (e.g., run security scans in parallel with building images, if they don’t depend on each other). The current plan is sequential for simplicity
GitHub
, but we may revisit for performance optimization. This is more an execution detail, but noted for future improvements.
Engine Pool Load and Caching: The Dagger Engine Pool will be executing potentially many pipelines (if multiple teams use BDL). We should monitor its capacity and possibly add a caching layer for dependencies (for example, Node package cache or Docker layer cache). We have a feature flag idea for shared EFS cache in the engine pool
GitHub
, which could drastically speed up builds by reusing layers. We’ll evaluate turning that on once we measure performance. Also, if many concurrent runs happen, auto-scaling the Engine Pool (min 1, max N instances) should be tested to ensure new engines spin up quickly to handle the load.
Federation and External Verification: In line with Zero Trust, an interesting future goal is enabling anyone (with the right access) to verify a bundle without our internal systems. We might provide a metadata file or API that publishes the expected signing certificate identities for bundles, so an external party can use cosign verify --certificate-identity <our CI identity> to validate. We should ensure our implementation of keyless signing uses identifiable OIDC claims (like an issuer and audience that we can communicate to others). For now, this is more of a documentation task (e.g., documenting that “our bundles are signed by issuer X, subject matching pattern Y”).
Maintenance of Open-Source Tooling: Using Syft, Grype, etc., means we should keep them up-to-date to catch new vulnerabilities and formats. We need a process to update the runner image with new versions of these tools regularly (perhaps via a nightly build or dependabot alerts in our repository). Also, any custom Rego policies need maintenance as compliance regimes evolve.
Error Handling and Retries: Currently, a failure in any stage fails the pipeline. We might consider if certain failures could be auto-retried or recovered. For instance, a temporary network glitch pushing to registry could be retried once before failing. Or if a non-critical test fails, maybe allow proceeding (perhaps not, since that undermines quality – better to fail fast). For now, fail-fast is acceptable, but we should document this behavior and possibly allow an override (like a flag --force-bundle that would create the bundle even if some tests fail, for special cases, storing the failure status in the manifest).
This implementation plan covers the current scope and approach for the Deployment Bundle Pipeline. Addressing the above open questions will further refine the design, ensuring the BDL component not only meets the immediate requirements of secure, auditable deployments but is also robust and adaptable for future needs. By leveraging proven open-source tools and aligning with platform standards, this solution will provide high confidence in our deployment artifacts and pave the way for smoother audits and safer releases
GitHub
GitHub
. The next steps would be to review this plan with security and compliance stakeholders, incorporate their feedback (especially on the open questions), and then proceed with iterative implementation and testing. With this in place, the platform will achieve a significant advancement toward end-to-end deployment pipeline security and infrastructure immutability, as required for operating in high-trust environments like FedRAMP High.
Citations
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L7-L15
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L27-L35
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L186-L194
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L19-L26
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L22-L25
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L166-L171
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L160-L169
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L34-L38
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L244-L252
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/dagger-engine-pool/README.md#L7-L14
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/dagger-engine-pool/README.md#L11-L19
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/dagger-engine-pool/README.md#L92-L100
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L257-L265
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L289-L298
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L307-L315
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L160-L168
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L266-L274
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L280-L284
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts#L52-L60
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts#L68-L76
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L239-L248
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/dagger-engine-pool/README.md#L124-L132
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts#L19-L27
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts#L21-L29
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts#L48-L52
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/dagger-engine-pool/README.md#L80-L89
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/dagger-engine-pool/README.md#L100-L108
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L325-L333
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L332-L340
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/dagger-engine-pool/README.md#L14-L16
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/dagger-engine-pool/README.md#L36-L40
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L205-L214
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L219-L227
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts#L76-L84
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L72-L80
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L99-L108
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L124-L132
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L130-L138
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L139-L147
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L156-L164
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L140-L148
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L327-L334
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L170-L178
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L181-L188
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L231-L240
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L232-L240
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L237-L246
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L247-L255
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L299-L305
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L316-L325
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L320-L328
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L350-L358
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/dagger.ts#L353-L361
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L237-L241
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L343-L350
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L130-L138
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L166-L169
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L340-L348
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L172-L180
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L334-L343
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/dagger-engine-pool/README.md#L70-L78
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L272-L278
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L274-L278
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L248-L255
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/README.md#L188-L194
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts#L45-L53
GitHub
https://github.com/Kristopherlb/shinobi/blob/3b586541e56ff42fb82fe7cb0d4bb57e641b3b75/packages/components/deployment-bundle-pipeline/src/types.ts#L114-L122
All Sources