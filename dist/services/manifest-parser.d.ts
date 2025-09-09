import { Logger } from '../utils/logger';
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
}
