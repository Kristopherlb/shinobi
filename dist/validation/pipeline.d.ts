export interface ValidationResult {
    manifest: any;
    warnings: string[];
}
export interface PlanResult {
    resolvedManifest: any;
    warnings: string[];
}
export declare class ValidationPipeline {
    private ajv;
    private schemaManager;
    constructor();
    /**
     * Stage 1-2: Parse and validate manifest (AC-P1.1, AC-P1.2, AC-P2.1, AC-P2.2, AC-P2.3)
     */
    validate(manifestPath: string): Promise<ValidationResult>;
    /**
     * Full pipeline: Parse, validate, hydrate, and resolve references (all 4 stages)
     */
    plan(manifestPath: string, environment: string): Promise<PlanResult>;
    private parseManifest;
    private validateSchema;
    private hydrateContext;
    private interpolateEnvironmentValues;
    private validateReferences;
}
