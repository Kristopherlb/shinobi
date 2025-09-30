import { Logger } from '../platform/logger/src';
export interface ManifestParserDependencies {
    logger: Logger;
}
/**
 * Pure service for parsing YAML manifests
 * Responsibility: Stage 1 - Parsing (AC-P1.1, AC-P1.2)
 */
export declare class ManifestParser {
    private dependencies;
    constructor(dependencies: ManifestParserDependencies);
    parseManifest(manifestPath: string): Promise<any>;
    /**
     * Validate that the manifest path is secure and doesn't attempt directory traversal
     * @param manifestPath The path to validate
     * @throws Error if path is insecure
     */
    private validatePathSecurity;
}
//# sourceMappingURL=manifest-parser.d.ts.map