/**
 * Artifact Serialization Service
 * 
 * Handles serialization and deserialization of CLI command artifacts
 * with support for JSON, YAML, and other formats.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { BaseArtifact, ArtifactSerializer } from '../contracts/artifacts.ts';

export class JSONArtifactSerializer implements ArtifactSerializer {
  serialize(artifact: BaseArtifact): string {
    return JSON.stringify(artifact, null, 2);
  }

  deserialize<T extends BaseArtifact>(data: string): T {
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      throw new Error(`Failed to deserialize JSON artifact: ${error}`);
    }
  }

  async writeToFile(artifact: any, filePath: string): Promise<void> {
    const content = JSON.stringify(artifact, null, 2);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf8');
  }

  async readFromFile<T extends BaseArtifact>(filePath: string): Promise<T> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return this.deserialize<T>(content);
  }
}

export class YAMLArtifactSerializer implements ArtifactSerializer {
  serialize(artifact: BaseArtifact): string {
    return yaml.stringify(artifact, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0
    });
  }

  deserialize<T extends BaseArtifact>(data: string): T {
    try {
      return yaml.parse(data) as T;
    } catch (error) {
      throw new Error(`Failed to deserialize YAML artifact: ${error}`);
    }
  }

  async writeToFile(artifact: any, filePath: string): Promise<void> {
    const content = yaml.stringify(artifact, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0
    });
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf8');
  }

  async readFromFile<T extends BaseArtifact>(filePath: string): Promise<T> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return this.deserialize<T>(content);
  }
}

export class ArtifactSerializerFactory {
  static create(format: 'json' | 'yaml'): ArtifactSerializer {
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
