/**
 * OpenFeature Standard Capability Interfaces
 * Platform Feature Flagging & Canary Deployment Standard v1.0
 */

/**
 * OpenFeature Provider capability - provides feature flagging backend infrastructure
 */
export interface OpenFeatureProviderCapability {
  /** The provider type (e.g., 'aws-appconfig', 'launchdarkly') */
  providerType: string;
  /** Provider-specific connection configuration */
  connectionConfig: Record<string, string>;
  /** Environment variables for OpenFeature SDK configuration */
  environmentVariables: Record<string, string>;
}

/**
 * Feature Flag capability - defines individual feature flags
 */
export interface FeatureFlagCapability {
  /** Feature flag name/key */
  flagKey: string;
  /** Flag type (boolean, string, number, object) */
  flagType: 'boolean' | 'string' | 'number' | 'object';
  /** Default value for the flag */
  defaultValue: any;
  /** Flag description for documentation */
  description?: string;
  /** Targeting rules or conditions */
  targetingRules?: Record<string, any>;
}

/**
 * Deployment Strategy Configuration for Progressive Delivery
 */
export interface DeploymentStrategy {
  /** Strategy type */
  type: 'canary' | 'linear' | 'blue-green';
  /** Configuration specific to the strategy type */
  config: CanaryDeploymentConfig | LinearDeploymentConfig | BlueGreenDeploymentConfig;
}

export interface CanaryDeploymentConfig {
  /** Initial traffic percentage for canary */
  initialTrafficPercentage: number;
  /** Duration to wait before promoting */
  promotionInterval: string; // e.g., "5m", "10m"
  /** Success criteria for automatic promotion */
  successCriteria?: {
    errorRate?: number;
    latency?: number;
    customMetrics?: Record<string, number>;
  };
}

export interface LinearDeploymentConfig {
  /** Traffic increment percentage */
  incrementPercentage: number;
  /** Interval between increments */
  incrementInterval: string; // e.g., "2m", "5m"
  /** Success criteria for each increment */
  successCriteria?: {
    errorRate?: number;
    latency?: number;
    customMetrics?: Record<string, number>;
  };
}

export interface BlueGreenDeploymentConfig {
  /** Duration to maintain both environments */
  switchDuration: string; // e.g., "5m", "10m"
  /** Whether to automatically rollback on failure */
  autoRollback: boolean;
  /** Health check configuration */
  healthCheck?: {
    path: string;
    interval: string;
    timeout: string;
  };
}