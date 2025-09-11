export declare class FileDiscovery {
    /**
     * Discover service.yml by searching from current directory upwards to git root
     * FR-CLI-2: Configuration Discovery
     */
    findManifest(startDir?: string): Promise<string | null>;
    /**
     * Check if a service.yml file exists at the given path
     */
    manifestExists(filePath: string): Promise<boolean>;
}
