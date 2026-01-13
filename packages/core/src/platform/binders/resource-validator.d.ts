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
 * Validation error for resource validation failures
 */
export declare class ResourceValidationError extends Error {
    readonly service: string;
    readonly resources: string[];
    constructor(service: string, resources: string[], message: string);
}
/**
 * Extract service prefix from an IAM action or resource ARN
 *
 * @param actionOrArn - IAM action (e.g., 's3:GetObject') or resource ARN
 * @returns Service prefix (e.g., 's3', 'iam', 'kms')
 */
export declare function extractServicePrefix(actionOrArn: string): string | null;
/**
 * Check if a service is sensitive and requires explicit ARNs
 *
 * @param service - Service prefix (e.g., 's3', 'iam', 'kms')
 * @returns True if service is sensitive
 */
export declare function isSensitiveService(service: string): boolean;
/**
 * Check if a service is org-wide and allows wildcards
 *
 * @param service - Service prefix (e.g., 'organizations', 'cloudtrail')
 * @returns True if service is org-wide
 */
export declare function isOrgWideService(service: string): boolean;
/**
 * Validate resources for a policy statement
 *
 * @param statement - IAM policy statement
 * @param defaultServicePrefix - Default service prefix if cannot extract from statement (e.g., 's3', 'iam', 'kms')
 * @throws ResourceValidationError if validation fails
 */
export declare function validateResources(statement: PolicyStatement, defaultServicePrefix?: string): void;
/**
 * Validate resources for multiple policy statements
 *
 * @param statements - Array of IAM policy statements
 * @param defaultServicePrefix - Default service prefix if cannot extract from statements (e.g., 's3', 'iam', 'kms')
 * @throws ResourceValidationError if validation fails
 */
export declare function validateResourcesForStatements(statements: PolicyStatement[], defaultServicePrefix?: string): void;
/**
 * Get list of sensitive services
 *
 * @returns Array of sensitive service prefixes
 */
export declare function getSensitiveServices(): readonly string[];
/**
 * Get list of org-wide services
 *
 * @returns Array of org-wide service prefixes
 */
export declare function getOrgWideServices(): readonly string[];
//# sourceMappingURL=resource-validator.d.ts.map