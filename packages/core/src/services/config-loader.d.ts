export interface TemplateConfig {
    templates: {
        service_base: string;
        lambda_api_with_db: string;
        worker_with_queue: string;
        empty_service: string;
    };
    source_files: {
        api_lambda: string;
        worker_lambda: string;
        basic_handler: string;
    };
    gitignore_template: string;
    patches_stub: string;
}
/**
 * Pure utility for loading externalized configuration
 * Role: Stateless Utility - No dependencies, only static behavior
 */
export declare class ConfigLoader {
    private static _templateConfig;
    private static logger;
    /**
     * Load template configuration from external YAML file
     * Implements caching to avoid repeated file I/O
     * Supports environment variable override for config path
     */
    static getTemplateConfig(): Promise<TemplateConfig>;
    /**
     * Validate that the config path is secure and doesn't attempt directory traversal
     * @param configPath The path to validate
     * @throws Error if path is insecure
     */
    private static validatePathSecurity;
    /**
     * Reset cached configuration (useful for testing)
     */
    static resetCache(): void;
}
//# sourceMappingURL=config-loader.d.ts.map