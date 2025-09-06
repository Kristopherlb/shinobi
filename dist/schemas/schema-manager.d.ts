export declare class SchemaManager {
    /**
     * Get the master schema for manifest validation (AC-P2.2)
     * Dynamically composed from base schema and component schemas
     */
    getMasterSchema(): Promise<any>;
}
