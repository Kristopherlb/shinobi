/**
 * Reference Validator Service - Single responsibility for semantic validation
 * Implements Principle 4: Single Responsibility Principle
 */
import { Logger } from '../platform/logger/src';
export interface ReferenceValidatorDependencies {
    logger: Logger;
}
/**
 * Pure service for reference and semantic validation
 * Responsibility: Stage 4 - Semantic & Reference Validation (AC-P4.1, AC-P4.2, AC-P4.3)
 */
export declare class ReferenceValidator {
    private dependencies;
    constructor(dependencies: ReferenceValidatorDependencies);
    validateReferences(manifest: any): Promise<void>;
    /**
     * Recursively validate ${ref:...} expressions throughout the manifest
     * Implements AC-P4.1: Complete cross-component reference validation
     */
    private validateRefExpressions;
    private isValidDate;
}
//# sourceMappingURL=reference-validator.d.ts.map