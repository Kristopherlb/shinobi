// Types consumed by the component & builder. These are intentionally narrow and map 1:1 to the schema.

export type StigBaseline = 'RHEL8' | 'UBI9' | 'UBUNTU-20';

export interface Capacity { 
  min: number; 
  max: number; 
}

export interface EndpointConfig {
  nlbInternal?: boolean;
  hostname?: string;
  mtls?: { 
    acmPcaArn: string; 
    allowedClientArns?: string[]; 
  };
  allowedCidrs?: string[];
}

export interface StorageConfig {
  cache?: 'EBS' | 'EFS' | 'DISK';
  ebsGiB?: number;
  efs?: { 
    performance?: 'general' | 'maxIO'; 
  };
  s3ArtifactsBucketRef?: string; // optional ref; created if omitted
  kmsKeyRef?: string;            // optional ref; created if omitted
}

export interface ObservabilityConfig {
  otlpEndpoint?: string;         // from env hydration by default
  logRetentionDays?: number;     // defaults handled in builder
}

export interface FeatureFlags {
  sharedCacheEfs?: boolean;
  enableEcrMirror?: boolean;
}

export interface ComplianceConfig {
  forbidPublicExposure?: boolean;
  forbidNonFipsAmi?: boolean;
  forbidNoKms?: boolean;
}

export interface DaggerConfig {
  service?: string;
  env?: string;
  owner?: string;
  stigBaseline?: StigBaseline;
  fipsMode: boolean;
  capacity: Capacity;
  instanceType?: string;
  endpoint?: EndpointConfig;
  storage?: StorageConfig;
  observability?: ObservabilityConfig;
  featureFlags?: FeatureFlags;
  compliance?: ComplianceConfig;
}

export interface DaggerOutputs {
  endpointUrl: string;
  artifactBucketArn: string;
  kmsKeyArn: string;
  logGroup: string;
}

export interface DaggerEnginePoolProps {
  overrides?: Partial<DaggerConfig>;
}
