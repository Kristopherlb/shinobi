/**
 * Configuration Builder for NetworkRulesStackComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '@shinobi/core';
import NETWORK_RULES_STACK_CONFIG_SCHEMA_JSON from '../Config.schema.json' with { type: 'json' };

/**
 * Configuration interface for NetworkRulesStackComponent component
 */
export interface NetworkRulesStackConfig {
  /** Component name (optional, will be auto-generated) */
  name?: string;

  /** Component description */
  description?: string;

  /** SSM Parameter Store path prefix for network rules */
  ssmPathPrefix?: string;

  /** Tagging configuration */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for NetworkRulesStackComponent configuration validation
 */
export const NETWORK_RULES_STACK_CONFIG_SCHEMA = NETWORK_RULES_STACK_CONFIG_SCHEMA_JSON;

/**
 * Configuration Builder for NetworkRulesStackComponent
 * 
 * Extends the abstract ConfigBuilder to provide network-rules-stack-specific configuration
 * with 5-layer precedence chain and compliance-aware defaults.
 */
export class NetworkRulesStackConfigBuilder extends ConfigBuilder<NetworkRulesStackConfig> {

  constructor(context: ConfigBuilderContext) {
    super(context, NETWORK_RULES_STACK_CONFIG_SCHEMA);
  }

  /**
   * Provide component-specific hardcoded fallbacks.
   * These are the absolute, safest, most minimal defaults possible.
   * 
   * Layer 1 (Priority 5 - Lowest): Hardcoded Fallbacks
   */
  protected getHardcodedFallbacks(): Record<string, any> {
    return {
      ssmPathPrefix: '/shinobi/network-rules',
      description: 'Cross-stack security group rules from all services',
      tags: {
        'Component': 'network-rules-stack',
        'ManagedBy': 'shinobi',
        'Purpose': 'cross-stack-security-group-rules'
      }
    };
  }
}

