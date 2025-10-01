/**
 * Artifact Serialization Service
 *
 * Handles serialization and deserialization of CLI command artifacts
 * with support for JSON, YAML, and other formats.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
export class JSONArtifactSerializer {
    serialize(artifact) {
        return JSON.stringify(artifact, null, 2);
    }
    deserialize(data) {
        try {
            return JSON.parse(data);
        }
        catch (error) {
            throw new Error(`Failed to deserialize JSON artifact: ${error}`);
        }
    }
    async writeToFile(artifact, filePath) {
        const content = JSON.stringify(artifact, null, 2);
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, content, 'utf8');
    }
    async readFromFile(filePath) {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return this.deserialize(content);
    }
}
export class YAMLArtifactSerializer {
    serialize(artifact) {
        return yaml.stringify(artifact, {
            indent: 2,
            lineWidth: 120,
            minContentWidth: 0
        });
    }
    deserialize(data) {
        try {
            return yaml.parse(data);
        }
        catch (error) {
            throw new Error(`Failed to deserialize YAML artifact: ${error}`);
        }
    }
    async writeToFile(artifact, filePath) {
        const content = yaml.stringify(artifact, {
            indent: 2,
            lineWidth: 120,
            minContentWidth: 0
        });
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, content, 'utf8');
    }
    async readFromFile(filePath) {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return this.deserialize(content);
    }
}
export class ArtifactSerializerFactory {
    static create(format) {
        switch (format) {
            case 'json':
                return new JSONArtifactSerializer();
            case 'yaml':
                return new YAMLArtifactSerializer();
            default:
                throw new Error(`Unsupported artifact format: ${format}`);
        }
    }
}
//# sourceMappingURL=artifact-serializer.js.map