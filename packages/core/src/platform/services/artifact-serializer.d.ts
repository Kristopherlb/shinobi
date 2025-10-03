/**
 * Artifact Serialization Service
 *
 * Handles serialization and deserialization of CLI command artifacts
 * with support for JSON, YAML, and other formats.
 */
import { BaseArtifact, ArtifactSerializer } from '../contracts/artifacts.ts';
export declare class JSONArtifactSerializer implements ArtifactSerializer {
    serialize(artifact: BaseArtifact): string;
    deserialize<T extends BaseArtifact>(data: string): T;
    writeToFile(artifact: any, filePath: string): Promise<void>;
    readFromFile<T extends BaseArtifact>(filePath: string): Promise<T>;
}
export declare class YAMLArtifactSerializer implements ArtifactSerializer {
    serialize(artifact: BaseArtifact): string;
    deserialize<T extends BaseArtifact>(data: string): T;
    writeToFile(artifact: any, filePath: string): Promise<void>;
    readFromFile<T extends BaseArtifact>(filePath: string): Promise<T>;
}
export declare class ArtifactSerializerFactory {
    static create(format: 'json' | 'yaml'): ArtifactSerializer;
}
//# sourceMappingURL=artifact-serializer.d.ts.map