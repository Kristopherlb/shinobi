export declare class SchemaManager {
    private logger;
    constructor();
    /**
     * Get the base schema for manifest validation (AC-P2.2)
     *
     * This service has a single responsibility: to load and provide the authoritative
     * base schema from the version-controlled JSON file. Dynamic schema composition
     * (merging component-specific schemas) is handled by the SchemaValidator service.
     */
    getBaseSchema(): Promise<any>;
}
