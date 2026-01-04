/**
 * Resource Validator
 * 
 * Validates IAM policy resource ARNs to prevent over-privileged access.
 * Requires explicit ARNs for sensitive services; rejects wildcard resources.
 * 
 * SECURITY: This validator prevents privilege escalation by ensuring
 * sensitive services require explicit resource ARNs.
 * 
 * Features:
 * - Rejects wildcard resources (['*']) for sensitive services
 * - Allows wildcards only for org-wide services (Organizations, CloudTrail)
 * - Validates resource ARN format
 */

import type { PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * List of sensitive services that require explicit ARNs
 * Wildcard resources are not allowed for these services
 */
const SENSITIVE_SERVICES = [
  'iam',
  'kms',
  's3',
  'secretsmanager',
  'ssm', // Systems Manager Parameter Store
  'secretsmanager',
  'rds',
  'dynamodb',
  'lambda',
  'ec2', // For security groups, instances, etc.
  'sts' // Security Token Service
] as const;

/**
 * List of org-wide services where wildcards are allowed
 * These services operate at the organization level
 */
const ORG_WIDE_SERVICES = [
  'organizations',
  'cloudtrail',
  'config',
  'cloudformation' // Stack-level operations
] as const;

/**
 * Validation error for resource validation failures
 */
export class ResourceValidationError extends Error {
  constructor(
    public readonly service: string,
    public readonly resources: string[],
    message: string
  ) {
    super(message);
    this.name = 'ResourceValidationError';
  }
}

/**
 * Extract service prefix from an IAM action or resource ARN
 * 
 * @param actionOrArn - IAM action (e.g., 's3:GetObject') or resource ARN
 * @returns Service prefix (e.g., 's3', 'iam', 'kms')
 */
export function extractServicePrefix(actionOrArn: string): string | null {
  // For actions: 'service:Action' -> 'service'
  if (actionOrArn.includes(':')) {
    return actionOrArn.split(':')[0].toLowerCase();
  }
  
  // For ARNs: 'arn:aws:service:...' -> 'service'
  if (actionOrArn.startsWith('arn:aws:')) {
    const parts = actionOrArn.split(':');
    if (parts.length >= 3) {
      return parts[2].toLowerCase();
    }
  }
  
  return null;
}

/**
 * Check if a service is sensitive and requires explicit ARNs
 * 
 * @param service - Service prefix (e.g., 's3', 'iam', 'kms')
 * @returns True if service is sensitive
 */
export function isSensitiveService(service: string): boolean {
  return SENSITIVE_SERVICES.includes(service.toLowerCase() as any);
}

/**
 * Check if a service is org-wide and allows wildcards
 * 
 * @param service - Service prefix (e.g., 'organizations', 'cloudtrail')
 * @returns True if service is org-wide
 */
export function isOrgWideService(service: string): boolean {
  return ORG_WIDE_SERVICES.includes(service.toLowerCase() as any);
}

/**
 * Check if resources array contains wildcards
 * 
 * @param resources - Array of resource ARNs or '*'
 * @returns True if any resource is a wildcard
 */
function containsWildcard(resources: string[]): boolean {
  return resources.some(resource => resource === '*' || resource === 'arn:aws:*:*:*:*');
}

/**
 * Extract service prefix from policy statement actions
 * 
 * @param statement - IAM policy statement
 * @returns Service prefix (e.g., 's3', 'iam', 'kms') or null if cannot determine
 */
function extractServiceFromStatement(statement: PolicyStatement): string | null {
  const actions = statement.actions || [];
  
  if (actions.length === 0) {
    return null;
  }
  
  // Extract service from first action (all actions should be same service)
  const firstAction = actions[0];
  if (typeof firstAction === 'string' && firstAction.includes(':')) {
    return firstAction.split(':')[0].toLowerCase();
  }
  
  return null;
}

/**
 * Validate resources for a policy statement
 * 
 * @param statement - IAM policy statement
 * @param defaultServicePrefix - Default service prefix if cannot extract from statement (e.g., 's3', 'iam', 'kms')
 * @throws ResourceValidationError if validation fails
 */
export function validateResources(statement: PolicyStatement, defaultServicePrefix?: string): void {
  const resources = statement.resources || [];
  
  // Extract service from statement actions, fallback to default
  const servicePrefix = extractServiceFromStatement(statement) || defaultServicePrefix;
  
  if (!servicePrefix) {
    // Cannot determine service - log warning but don't fail
    console.warn(
      `[SECURITY] Cannot determine service prefix for resource validation. ` +
      `Statement actions: ${statement.actions?.join(', ') || 'none'}`
    );
    return;
  }
  
  // Check if resources contain wildcards
  if (containsWildcard(resources)) {
    // Check if service is org-wide (wildcards allowed)
    if (isOrgWideService(servicePrefix)) {
      return; // Wildcards allowed for org-wide services
    }
    
    // Check if service is sensitive (wildcards not allowed)
    if (isSensitiveService(servicePrefix)) {
      throw new ResourceValidationError(
        servicePrefix,
        resources,
        `Wildcard resources are not allowed for sensitive service '${servicePrefix}'. ` +
        `Explicit resource ARNs are required. ` +
        `Found wildcard resources: ${resources.filter(r => r === '*' || r.includes('*')).join(', ')}. ` +
        `Please specify explicit ARNs for all resources. ` +
        `Actions: ${statement.actions?.join(', ') || 'none'}`
      );
    }
    
    // For non-sensitive, non-org-wide services, log a warning
    console.warn(
      `[SECURITY] Wildcard resources detected for service '${servicePrefix}'. ` +
      `Consider using explicit ARNs for better security.`
    );
  }
  
  // Validate ARN format for non-wildcard resources
  for (const resource of resources) {
    if (resource === '*') {
      continue; // Already handled above
    }
    
    // Basic ARN format validation
    if (!resource.startsWith('arn:aws:')) {
      console.warn(
        `[SECURITY] Resource does not appear to be a valid ARN: ${resource}. ` +
        `Expected format: arn:aws:service:region:account:resource`
      );
    }
  }
}

/**
 * Validate resources for multiple policy statements
 * 
 * @param statements - Array of IAM policy statements
 * @param defaultServicePrefix - Default service prefix if cannot extract from statements (e.g., 's3', 'iam', 'kms')
 * @throws ResourceValidationError if validation fails
 */
export function validateResourcesForStatements(
  statements: PolicyStatement[],
  defaultServicePrefix?: string
): void {
  for (const statement of statements) {
    validateResources(statement, defaultServicePrefix);
  }
}

/**
 * Get list of sensitive services
 * 
 * @returns Array of sensitive service prefixes
 */
export function getSensitiveServices(): readonly string[] {
  return SENSITIVE_SERVICES;
}

/**
 * Get list of org-wide services
 * 
 * @returns Array of org-wide service prefixes
 */
export function getOrgWideServices(): readonly string[] {
  return ORG_WIDE_SERVICES;
}

