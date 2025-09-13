/**
 * Type definitions for the Deployment Bundle Pipeline component
 */

export interface DeploymentBundleConfig {
  /** Service name for the bundle */
  service: string;

  /** Environment (dev, staging, prod) */
  environment: string;

  /** Version tag (semver or build-id) */
  versionTag: string;

  /** Artifactory host URL */
  artifactoryHost: string;

  /** OCI repository for bundles */
  ociRepoBundles: string;

  /** OCI repository for container images (optional) */
  ociRepoImages?: string;

  /** Compliance framework (commercial, fedramp-moderate, fedramp-high) */
  complianceFramework?: string;

  /** Signing configuration */
  signing?: {
    /** Use keyless signing (OIDC) */
    keyless?: boolean;
    /** KMS key for keyed signing */
    kmsKeyId?: string;
    /** Fulcio URL for keyless signing */
    fulcioUrl?: string;
    /** Rekor URL for transparency log */
    rekorUrl?: string;
  };

  /** Security scanning configuration */
  security?: {
    /** Fail on critical vulnerabilities */
    failOnCritical?: boolean;
    /** Only report fixed vulnerabilities */
    onlyFixed?: boolean;
    /** Add CPEs if none found */
    addCpesIfNone?: boolean;
  };

  /** Bundle contents configuration */
  bundle?: {
    /** Include CDK output */
    includeCdkOutput?: boolean;
    /** Include test reports */
    includeTestReports?: boolean;
    /** Include coverage reports */
    includeCoverage?: boolean;
    /** Include policy reports */
    includePolicyReports?: boolean;
  };

  /** Runner image configuration */
  runner?: {
    /** Base runner image */
    image?: string;
    /** Node.js version */
    nodeVersion?: string;
    /** Enable FIPS mode */
    fipsMode?: boolean;
  };
}

export interface BundleArtifacts {
  /** CDK synthesis output directory */
  cdkOutput: string;

  /** Infrastructure plan JSON */
  planJson: string;

  /** Test reports directory */
  testReports: string;

  /** Coverage reports directory */
  coverageReports: string;

  /** SBOM files */
  sboms: {
    workspace: string;
    images: string[];
  };

  /** Vulnerability scan results */
  vulnReports: string[];

  /** Policy compliance reports */
  policyReports: string[];

  /** SLSA provenance predicate */
  provenance: string;
}

export interface BundleManifest {
  schema: string;
  version: string;
  service: string;
  environment: string;
  versionTag: string;
  complianceFramework: string;
  buildTimestamp: string;
  gitCommit: string;
  gitBranch: string;
  builderId: string;
  builderVersion: string;
  daggerVersion: string;
  runnerImage: string;
  runnerDigest: string;
  imageRefs: string[];
  imageDigests: string[];
  bundleDigest: string;
  signatureDigest: string;
  attestationDigest: string;
  notes: string;
}

export interface SecurityScanResult {
  /** Scan tool used */
  tool: string;

  /** Scan timestamp */
  timestamp: string;

  /** Total vulnerabilities found */
  totalVulnerabilities: number;

  /** Critical vulnerabilities */
  critical: number;

  /** High vulnerabilities */
  high: number;

  /** Medium vulnerabilities */
  medium: number;

  /** Low vulnerabilities */
  low: number;

  /** Scan report file path */
  reportPath: string;

  /** Whether scan passed policy gates */
  passed: boolean;
}

export interface ComplianceReport {
  /** Compliance framework */
  framework: string;

  /** Report timestamp */
  timestamp: string;

  /** Total controls evaluated */
  totalControls: number;

  /** Controls passed */
  passed: number;

  /** Controls failed */
  failed: number;

  /** Controls not applicable */
  notApplicable: number;

  /** Report file path */
  reportPath: string;

  /** Whether compliance passed */
  compliant: boolean;
}

export interface ProvenancePredicate {
  buildType: string;
  buildInvocationID: string;
  buildStartTime: string;
  buildFinishTime: string;
  builder: {
    id: string;
    version: string;
  };
  buildConfig: {
    service: string;
    version: string;
    compliance_framework: string;
    dagger_version: string;
    runner_image: string;
  };
  metadata: {
    invocationId: string;
    startedOn: string;
    finishedOn: string;
    reproducible: boolean;
    completeness: {
      parameters: boolean;
      environment: boolean;
      materials: boolean;
    };
  };
  materials: Array<{
    uri: string;
    digest: {
      sha256?: string;
      gitCommit?: string;
    };
  }>;
}
