/**
 * Configuration Loader Utility - Principle 6: Separate Data from Logic
 * Implements Principle 7: Clear Class Roles - This is a "Stateless Utility"
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as YAML from 'yaml';

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
export class ConfigLoader {
  private static _templateConfig: TemplateConfig | null = null;

  /**
   * Load template configuration from external YAML file
   * Implements caching to avoid repeated file I/O
   */
  static async getTemplateConfig(): Promise<TemplateConfig> {
    if (this._templateConfig) {
      return this._templateConfig;
    }

    const configPath = path.join(__dirname, '../../config/templates.yaml');
    
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      this._templateConfig = YAML.parse(configContent) as TemplateConfig;
      return this._templateConfig;
    } catch (error) {
      throw new Error(`Failed to load template configuration from ${configPath}: ${error}`);
    }
  }

  /**
   * Reset cached configuration (useful for testing)
   */
  static resetCache(): void {
    this._templateConfig = null;
  }
}