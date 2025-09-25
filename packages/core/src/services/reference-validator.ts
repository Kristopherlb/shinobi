/**
 * Reference Validator Service - Single responsibility for semantic validation
 * Implements Principle 4: Single Responsibility Principle
 */
import { Logger } from '../platform/logger/src';

export interface ReferenceValidatorDependencies {
  logger: Logger;
}

/**
 * Pure service for reference and semantic validation
 * Responsibility: Stage 4 - Semantic & Reference Validation (AC-P4.1, AC-P4.2, AC-P4.3)
 */
export class ReferenceValidator {
  constructor(private dependencies: ReferenceValidatorDependencies) { }

  async validateReferences(manifest: any): Promise<void> {
    this.dependencies.logger.debug('Validating references and semantic rules');

    // Build component name index
    const componentNames = new Set<string>();
    if (manifest.components) {
      manifest.components.forEach((component: any) => {
        if (component.name) {
          componentNames.add(component.name);
        }
      });
    }

    // Validate binds references (AC-P4.2)
    if (manifest.components) {
      manifest.components.forEach((component: any, index: number) => {
        if (component.binds) {
          component.binds.forEach((bind: any, bindIndex: number) => {
            if (bind.to && !componentNames.has(bind.to)) {
              throw new Error(`Reference to non-existent component '${bind.to}' in components[${index}].binds[${bindIndex}]`);
            }
          });
        }
      });
    }

    // Validate ${ref:...} references (AC-P4.1) - Critical enhancement
    this.validateRefExpressions(manifest, componentNames);

    // Validate governance suppressions (AC-P4.3)
    if (manifest.governance?.cdkNag?.suppress) {
      manifest.governance.cdkNag.suppress.forEach((suppression: any, index: number) => {
        const requiredFields = ['id', 'justification', 'owner', 'expiresOn'];
        requiredFields.forEach(field => {
          if (!suppression[field]) {
            throw new Error(`Missing required field '${field}' in governance.cdkNag.suppress[${index}]`);
          }
        });

        // Validate expiresOn format
        if (suppression.expiresOn && !this.isValidDate(suppression.expiresOn)) {
          throw new Error(`Invalid date format for expiresOn in governance.cdkNag.suppress[${index}]. Expected ISO date format.`);
        }
      });
    }

    this.dependencies.logger.debug('Reference validation completed');
  }

  /**
   * Recursively validate ${ref:...} expressions throughout the manifest
   * Implements AC-P4.1: Complete cross-component reference validation
   */
  private validateRefExpressions(obj: any, componentNames: Set<string>, path: string = 'root'): void {
    if (typeof obj === 'string') {
      // Check for ${ref:componentName.capability.attribute} pattern
      const refMatches = obj.match(/\$\{ref:([^}]+)\}/g);
      if (refMatches) {
        refMatches.forEach(match => {
          const refContent = match.slice(6, -1); // Remove ${ref: and }
          const componentName = refContent.split('.')[0]; // Extract component name

          if (!componentNames.has(componentName)) {
            throw new Error(`Reference to non-existent component '${componentName}' in ${refContent} at ${path}`);
          }
        });
      }
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.validateRefExpressions(item, componentNames, `${path}[${index}]`);
      });
      return;
    }

    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        this.validateRefExpressions(value, componentNames, `${path}.${key}`);
      }
    }
  }

  private isValidDate(dateString: string): boolean {
    // Enhanced date validation with strict ISO 8601 format
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDateRegex.test(dateString)) {
      return false;
    }
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}