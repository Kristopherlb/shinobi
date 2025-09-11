/**
 * Schema Validator Service - Single responsibility for JSON Schema validation
 * Implements Principle 4: Single Responsibility Principle
 */
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Logger } from '../platform/logger/src/index';
import { SchemaManager } from '../schemas/schema-manager';
import { SchemaErrorFormatter } from './schema-error-formatter';

export interface SchemaValidatorDependencies {
  logger: Logger;
  schemaManager: SchemaManager;
}

/**
 * Pure service for JSON Schema validation
 * Responsibility: Stage 2 - Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)
 */
export class SchemaValidator {
  private ajv: Ajv;

  constructor(private dependencies: SchemaValidatorDependencies) {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
  }

  async validateSchema(manifest: any): Promise<void> {
    this.dependencies.logger.debug('Validating manifest schema');

    // Get the base schema (dynamically composed)
    const schema = await this.dependencies.schemaManager.getBaseSchema();
    
    const validate = this.ajv.compile(schema);
    const valid = validate(manifest);

    if (!valid) {
      const errors = validate.errors || [];
      
      // Use the enhanced error formatter for better developer experience
      const errorReport = SchemaErrorFormatter.generateErrorReport(errors);
      
      this.dependencies.logger.error('Schema validation failed', {
        errors: errors,
        formattedReport: errorReport
      });
      
      throw new Error(errorReport);
    }

    // Schema validation handles all required field checks
    // Manual field validation removed - JSON Schema is the single source of truth

    this.dependencies.logger.debug('Schema validation completed successfully');
  }
}