/**
 * Binder Types
 * Type definitions for component binding operations
 */

/**
 * Component Binding
 * Defines a binding relationship between components
 */
export interface ComponentBinding {
  from: string;
  to: string;
  capability: string;
  access: string[];
  env?: Record<string, string>;
  options?: Record<string, any>;
}

/**
 * Binding Runtime Context
 * Runtime context information for component binding operations
 * Used by binder strategies to construct ARNs, apply tags, etc.
 */
export interface BindingRuntimeContext {
  region: string;
  accountId: string;
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  environment?: string;
  tags?: Record<string, string>;
}

