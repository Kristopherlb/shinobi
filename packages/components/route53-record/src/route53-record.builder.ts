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
}
