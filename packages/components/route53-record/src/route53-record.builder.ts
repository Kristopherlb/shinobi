/**
 * Configuration Builder for Route53RecordComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext, ComponentConfigSchema } from '@shinobi/core';
import schemaJson from '../Config.schema.json' with { type: 'json' };

/**
 * Configuration interface for Route53RecordComponent component
 */
export interface Route53RecordConfig {
  /** Component name (optional, will be auto-generated) */
  name?: string;
  
  /** Component description */
  description?: string;
  
  /** Route 53 record configuration */
  record: {
    /** DNS record name (e.g., 'api.example.com') */
    recordName: string;
    
    /** DNS record type (A, AAAA, CNAME, MX, TXT, etc.) */
    recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'SRV' | 'PTR';
    
    /** Hosted zone name (e.g., 'example.com.') */
    zoneName: string;
    
    /** Optional hosted zone ID for test scenarios (uses fromHostedZoneAttributes instead of fromLookup) */
    hostedZoneId?: string;
    
    /** Target value for the DNS record */
    target: string | string[];
    
    /** Time to live in seconds */
    ttl?: number;
    
    /** Comment for the record set */
    comment?: string;
    
    /** Whether to evaluate target health */
    evaluateTargetHealth?: boolean;
    
    /** Weight for weighted routing */
    weight?: number;
    
    /** Set identifier for routing policies */
    setIdentifier?: string;
    
    /** Geographic location for geolocation routing */
    geoLocation?: {
      continent?: string;
      country?: string;
      subdivision?: string;
    };
    
    /** Failover configuration */
    failover?: 'PRIMARY' | 'SECONDARY';
    
    /** Latency-based routing region */
    region?: string;
  };
  
  
  /** Tagging configuration (Route 53 records don't support tags, but for documentation) */
  tags?: Record<string, string>;
  
  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
}

/**
 * JSON Schema for Route53RecordComponent configuration validation
 */
export const ROUTE53_RECORD_CONFIG_SCHEMA: ComponentConfigSchema = schemaJson as ComponentConfigSchema;

/**
 * Configuration Builder for Route53RecordComponent
 * 
 * Extends the abstract ConfigBuilder to provide Route 53 record-specific configuration
 * with 5-layer precedence chain and compliance-aware defaults.
 */
export class Route53RecordConfigBuilder extends ConfigBuilder<Route53RecordConfig> {
  
  constructor(context: ConfigBuilderContext) {
    super(context, ROUTE53_RECORD_CONFIG_SCHEMA);
  }

  /**
   * Provide component-specific hardcoded fallbacks.
   * These are the absolute, safest, most minimal defaults possible.
   * 
   * Layer 1 (Priority 5 - Lowest): Hardcoded Fallbacks
   */
  protected getHardcodedFallbacks(): Record<string, any> {
    return {
      record: {
        recordName: 'default.example.com', // Safe default name
        recordType: 'A', // Most common record type
        zoneName: 'example.com.', // Safe default zone
        target: '127.0.0.1', // Safe default target (localhost)
        ttl: 300, // 5 minutes - reasonable default
        comment: 'Created by platform',
        evaluateTargetHealth: false, // Disabled by default for safety
        weight: undefined, // No weight by default
        setIdentifier: undefined, // No set identifier by default
        geoLocation: undefined, // No geo location by default
        failover: undefined, // No failover by default
        region: undefined // No region by default
      },
      tags: {
        'Component': 'route53-record',
        'ManagedBy': 'platform',
        'RecordType': 'A'
      }
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
   * Note: Route53 records are DNS routing resources with minimal security configuration.
   * For high-risk environments, we recommend using evaluateTargetHealth for health checks,
   * but this should be configured per record type based on actual requirements.
   */
  protected getComplianceFrameworkDefaults(): Partial<Route53RecordConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<Route53RecordConfig> | undefined;
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
    
    if (isHighRisk) {
      // Apply enhanced defaults for high-risk environments
      // These defaults align with FedRAMP Moderate/High requirements when highRiskEnvironment is set
      return {
        record: {
          recordName: '', // Will be overridden by user config
          recordType: 'A', // Required property
          zoneName: '', // Will be overridden by user config
          target: '', // Will be overridden by user config
          // Enable health checks for high-risk environments to ensure failover
          evaluateTargetHealth: true,
          // Lower TTL for faster failover (can be overridden per record)
          ttl: 60 // 1 minute for faster DNS propagation during failover
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }
}
