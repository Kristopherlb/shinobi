/**
 * Compliance violation details
 * 
 * Represents a compliance violation detected during binding validation.
 * Used by the unified binder strategy system for compliance reporting.
 */
export interface ComplianceViolation {
  type: 'security' | 'network' | 'iam' | 'monitoring' | 'data_protection';
  severity: 'error' | 'warning' | 'info';
  description: string;
  ruleId: string;
  framework?: string;
  remediation: string;
  context?: Record<string, any>;
}

