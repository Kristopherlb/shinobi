/**
 * Test Metadata Validator
 * Validates test metadata against Platform Testing Standard v1.0 schema
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface TestMetadata {
  id: string;
  level: 'unit' | 'integration' | 'e2e';
  capability: string;
  oracle: 'exact' | 'snapshot' | 'property' | 'contract' | 'metamorphic' | 'trace';
  invariants: string[];
  fixtures: string[];
  inputs: {
    shape: string;
    notes: string;
  };
  risks: string[];
  dependencies: string[];
  evidence: string[];
  compliance_refs: string[];
  ai_generated: boolean;
  human_reviewed_by: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class TestMetadataValidator {
  private ajv: Ajv;
  private schema: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
  }

  async loadSchema(): Promise<void> {
    const schemaPath = path.resolve(__dirname, 'test-metadata-schema.json');
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    this.schema = JSON.parse(schemaContent);
  }

  validateMetadata(metadata: TestMetadata): ValidationResult {
    if (!this.schema) {
      throw new Error('Schema not loaded. Call loadSchema() first.');
    }

    const validate = this.ajv.compile(this.schema);
    const valid = validate(metadata);

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!valid && validate.errors) {
      for (const error of validate.errors) {
        const errorMessage = `${error.instancePath || 'root'}: ${error.message}`;
        errors.push(errorMessage);
      }
    }

    // Additional business logic validation
    this.validateBusinessRules(metadata, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateBusinessRules(
    metadata: TestMetadata,
    errors: string[],
    warnings: string[]
  ): void {
    // Rule: If ai_generated=true, human_reviewed_by must be non-empty
    if (metadata.ai_generated && !metadata.human_reviewed_by.trim()) {
      errors.push('human_reviewed_by is required when ai_generated is true');
    }

    // Rule: ID format validation
    if (!metadata.id.match(/^TP-[a-z0-9-]+-[a-z0-9-]+-[0-9]{3}$/)) {
      errors.push(`ID format invalid: ${metadata.id}. Expected format: TP-<service>-<feature>-<NNN>`);
    }

    // Rule: Oracle consistency
    if (metadata.oracle === 'snapshot' && !metadata.fixtures.some(f => f.includes('snapshot'))) {
      warnings.push('Snapshot oracle used but no snapshot fixtures declared');
    }

    // Rule: Level consistency
    if (metadata.level === 'e2e' && metadata.fixtures.some(f => f.includes('mock'))) {
      warnings.push('E2E test using mock fixtures - consider integration level');
    }

    // Rule: Compliance references
    if (metadata.compliance_refs.length === 0 && metadata.capability.includes('compliance')) {
      warnings.push('Compliance-related test has no compliance_refs');
    }
  }

  async validateTestFile(filePath: string): Promise<ValidationResult> {
    const content = await fs.readFile(filePath, 'utf8');

    // Extract metadata from test file
    const metadataMatch = content.match(/const testMetadata = ({[\s\S]*?});/);
    if (!metadataMatch) {
      return {
        valid: false,
        errors: ['No test metadata found in file'],
        warnings: []
      };
    }

    try {
      // Parse metadata (this is a simplified parser - in practice, use proper AST parsing)
      const metadataJson = metadataMatch[1]
        .replace(/(\w+):/g, '"$1":')  // Add quotes to keys
        .replace(/'/g, '"');          // Replace single quotes with double quotes

      const metadata = JSON.parse(metadataJson);
      return this.validateMetadata(metadata);
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to parse metadata: ${error}`],
        warnings: []
      };
    }
  }

  async validateAllTestFiles(testDir: string): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    try {
      const files = await fs.readdir(testDir);
      const testFiles = files.filter(file => file.endsWith('.test.ts'));

      for (const file of testFiles) {
        const filePath = path.join(testDir, file);
        const result = await this.validateTestFile(filePath);
        results.set(file, result);
      }
    } catch (error) {
      console.error(`Error validating test files in ${testDir}:`, error);
    }

    return results;
  }
}
