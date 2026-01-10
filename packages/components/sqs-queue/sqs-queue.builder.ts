/**
 * Configuration Builder for SqsQueue Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 * 
 * @author Platform Team
 * @category messaging
 * @service SQS
 */

import { ConfigBuilder, ConfigBuilderContext, ComponentContext, ComponentSpec, ComponentConfigSchema } from '@shinobi/core';
import configSchema from './Config.schema.json' with { type: 'json' };

/**
 * Configuration interface for SqsQueue component
 */
export interface SqsQueueConfig {
  /** Queue name (optional, will be auto-generated from component name) */
  queueName?: string;
  
  /** Component description */
  description?: string;
  
  /** Visibility timeout in seconds */
  visibilityTimeoutSeconds?: number;
  
  /** Message retention period in days */
  messageRetentionDays?: number;
  
  /** Receive message wait time in seconds (for long polling) */
  receiveMessageWaitTimeSeconds?: number;
  
  /** Encryption configuration */
  encryption?: {
    enabled?: boolean;
    kmsKeyId?: string;
    enableKeyRotation?: boolean;
  };
  
  /** Dead letter queue configuration */
  deadLetterQueue?: {
    enabled?: boolean;
    maxReceiveCount?: number;
    retentionDays?: number;
  };
  
  /** Enable detailed monitoring */
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
    dashboard?: {
      enabled?: boolean;
      name?: string;
    };
    alarms?: {
      // TODO: Define component-specific alarm thresholds
    };
  };
  
  /** High risk environment flag - enables enhanced security defaults */
  highRiskEnvironment?: boolean;
  
  /** Tagging configuration */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for SqsQueue configuration validation
 * 
 * Schema is imported from Config.schema.json file per component standards.
 */
export const SQS_QUEUE_CONFIG_SCHEMA = configSchema as ComponentConfigSchema;

/**
 * ConfigBuilder for SqsQueueNew component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class SqsQueueConfigBuilder extends ConfigBuilder<SqsQueueConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, SQS_QUEUE_CONFIG_SCHEMA);
  }
  
  /**
   * Override buildSync to inject compliance framework defaults into the merge chain.
   * The base class doesn't call getComplianceFrameworkDefaults(), so we inject it here
   * between hardcoded fallbacks and component overrides.
   */
  public buildSync(): SqsQueueConfig {
    // Get all layers from parent
    const hardcodedFallbacks = this.getHardcodedFallbacks();
    const platformConfig = (this as any)._loadPlatformConfiguration();
    const environmentConfig = (this as any)._getEnvironmentConfiguration();
    const componentOverrides = this.builderContext.spec.config || {};
    const policyOverrides = (this as any)._getPolicyOverrides();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.builder.ts:96',message:'buildSync: layers before merge',data:{hardcodedEncryption:hardcodedFallbacks.encryption,componentOverrides:componentOverrides,hasHighRisk:!!componentOverrides.highRiskEnvironment},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Merge base layers first (hardcoded, platform, environment, component overrides, policy)
    const baseMerged = (this as any)._deepMergeConfigs(
      hardcodedFallbacks,
      platformConfig,
      environmentConfig,
      componentOverrides,
      policyOverrides
    );
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.builder.ts:103',message:'buildSync: base merged before compliance',data:{baseEncryption:baseMerged.encryption,baseDlq:baseMerged.deadLetterQueue,hasHighRisk:!!baseMerged.highRiskEnvironment},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Now get compliance defaults (which reads from componentOverrides to check highRiskEnvironment)
    // and merge them AFTER componentOverrides so they apply when highRiskEnvironment is set
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.builder.ts:110',message:'buildSync: complianceDefaults',data:{complianceEncryption:complianceDefaults.encryption,complianceDlq:complianceDefaults.deadLetterQueue},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Merge compliance defaults on top of base merged config
    // This ensures compliance defaults apply when highRiskEnvironment is set, but don't override explicit user settings
    const mergedConfig = (this as any)._deepMergeConfigs(
      baseMerged,
      complianceDefaults
    );
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.builder.ts:110',message:'buildSync: after merge',data:{mergedEncryption:mergedConfig.encryption,mergedDlq:mergedConfig.deadLetterQueue},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Resolve environment interpolations (${env:key} patterns)
    const resolvedConfig = (this as any)._resolveEnvironmentInterpolationsSync(mergedConfig);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.builder.ts:115',message:'buildSync: final resolved config',data:{resolvedEncryption:resolvedConfig.encryption,resolvedDlq:resolvedConfig.deadLetterQueue},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    return resolvedConfig as SqsQueueConfig;
  }
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<SqsQueueConfig> {
    return {
      visibilityTimeoutSeconds: 30,
      messageRetentionDays: 4,
      receiveMessageWaitTimeSeconds: 0,
      encryption: {
        enabled: false, // Safe default - enable via config layers
      },
      deadLetterQueue: {
        enabled: false,
        maxReceiveCount: 3,
        retentionDays: 14,
      },
      monitoring: {
        enabled: true,
        detailedMetrics: false
      },
      tags: {}
    };
  }
  
  /**
   * Layer 2: Compliance Framework Defaults
   * 
   * Provides sensible defaults based on risk assessment flags rather than framework checks.
   * High-risk environment defaults can be set via:
   * - Platform config files (`/config/{framework}.yml`) setting `highRiskEnvironment: true`
   * - Service-level configuration in `service.yml`
   * - Environment defaults
   * 
   * This ensures configuration is data-driven and risk-based, not framework-dependent.
   * 
   * Note: This method is called during the build process. The highRiskEnvironment flag
   * can be set in platform config files (which are loaded by the base class) or in
   * component config. We check the component spec config as a fallback, but platform
   * config files should be the primary source for this flag.
   */
  protected getComplianceFrameworkDefaults(): Partial<SqsQueueConfig> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.builder.ts:155',message:'getComplianceFrameworkDefaults entry',data:{specConfig:this.builderContext.spec.config,hasHighRisk:!!(this.builderContext.spec.config as any)?.highRiskEnvironment},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Check if highRiskEnvironment flag is set in component config or platform config
    // We need to check both because platform config is loaded separately
    const componentConfig = this.builderContext.spec.config as Partial<SqsQueueConfig> | undefined;
    let isHighRisk = componentConfig?.highRiskEnvironment ?? false;
    
    // Also check platform config if available (loaded by base class)
    try {
      const platformConfig = (this as any)._loadPlatformConfiguration();
      if (platformConfig?.highRiskEnvironment) {
        isHighRisk = true;
      }
    } catch {
      // Platform config might not be available in tests, ignore
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.builder.ts:167',message:'highRiskEnvironment check result',data:{isHighRisk,componentConfig},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (isHighRisk) {
      const result = {
        encryption: {
          enabled: true, // Mandatory encryption for high-risk environments
          enableKeyRotation: true, // Mandatory key rotation for high-risk environments
          // kmsKeyId will be auto-created if not provided
        },
        deadLetterQueue: {
          enabled: true, // Mandatory DLQ for high-risk operational resilience
          maxReceiveCount: 3, // Default from hardcoded fallbacks
          retentionDays: 14, // Default from hardcoded fallbacks
        },
        monitoring: {
          enabled: true, // Mandatory monitoring for high-risk environments
          detailedMetrics: true, // Mandatory detailed metrics for high-risk environments
        }
      };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.builder.ts:181',message:'returning high-risk defaults',data:result,timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return result;
    }
    
    // Standard/default environment - return empty to use hardcoded fallbacks
    // Platform config files can also set highRiskEnvironment: true to enable these defaults
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.builder.ts:195',message:'returning empty defaults',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return {};
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return SQS_QUEUE_CONFIG_SCHEMA;
  }
}