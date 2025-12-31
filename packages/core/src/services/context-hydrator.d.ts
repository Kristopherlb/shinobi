/**
 * Context Hydrator Service - Single responsibility for environment resolution
 * Implements Principle 4: Single Responsibility Principle
 */
import { Logger } from '../platform/logger/src/index.js';
export interface ContextHydratorDependencies {
    logger: Logger;
    manifestPath?: string;
}
/**
 * Pure service for context hydration and environment resolution
 * Responsibility: Stage 3 - Context Hydration (AC-P3.1, AC-P3.2, AC-P3.3)
 */
export declare class ContextHydrator {
    private dependencies;
    constructor(dependencies: ContextHydratorDependencies);
    hydrateContext(manifest: Record<string, any>, environment: string): Promise<Record<string, any>>;
    private interpolateEnvironmentValues;
    /**
     * Resolves $ref keywords in the environments block
     * Supports both top-level and environment-specific references
     */
    private resolveEnvironmentReferences;
    /**
     * Loads and parses a referenced configuration file
     * Implements security constraints to prevent path traversal
     */
    private loadReferencedFile;
    /**
     * Securely resolves a file path relative to the manifest location
     * Prevents path traversal attacks by constraining to service repository root
     */
    private resolveSecurePath;
    /**
     * Deep merge utility for combining configuration objects
     * Later objects override earlier ones, arrays are replaced entirely
     */
    private deepMerge;
}
//# sourceMappingURL=context-hydrator.d.ts.map