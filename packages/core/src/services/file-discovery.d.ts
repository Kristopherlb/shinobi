export declare class FileDiscovery {
    /**
     * Discover service.yml by searching from current directory upwards to git root
     * FR-CLI-2: Configuration Discovery
     */
    findManifest(startDir?: string, options?: { silentOnMissing?: boolean }): Promise<string | null>;
    /**
     * Check if a service.yml file exists at the given path
     */
    manifestExists(filePath: string): Promise<boolean>;
    /**
     * Validate that the file path is secure and doesn't attempt directory traversal
     * @param filePath The path to validate
     * @throws Error if path is insecure
     */
    private validatePathSecurity;
}
//# sourceMappingURL=file-discovery.d.ts.map