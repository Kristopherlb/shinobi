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
    /**
     * Load template configuration from external YAML file
     * Implements caching to avoid repeated file I/O
     */
    static getTemplateConfig(): Promise<TemplateConfig>;
    /**
     * Reset cached configuration (useful for testing)
     */
    static resetCache(): void;
}
