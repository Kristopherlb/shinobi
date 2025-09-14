/**
 * Binding Context
 * Context information for component binding operations
 */

export interface BindingContext {
  region: string;
  accountId: string;
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  environment?: string;
  tags?: Record<string, string>;
}
