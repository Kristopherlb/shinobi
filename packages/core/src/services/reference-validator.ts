/**
 * Reference Validator Service - Single responsibility for semantic validation
 * 
 * Implements Principle 4: Single Responsibility Principle.
 * See docs/architecture/design-principles.md for the complete set of architectural principles.
 */
import { Logger } from '../platform/logger/src/index.js';

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

    // Validate component reference ordering (AC-P4.4)
    // Components using @component: references must have dependencies defined before them
    this.validateComponentReferenceOrdering(manifest, componentNames);

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

  /**
   * Validate component reference ordering
   * 
   * Components using @component:component-name references must have their
   * dependencies defined before them in the manifest, since components
   * are synthesized in manifest order.
   * 
   * This prevents synthesis-time errors when a component tries to resolve
   * a reference to a component that hasn't been synthesized yet.
   * 
   * @param manifest - Service manifest
   * @param componentNames - Set of all component names
   */
  private validateComponentReferenceOrdering(manifest: any, componentNames: Set<string>): void {
    if (!manifest.components || !Array.isArray(manifest.components)) {
      return;
    }

    // Build component name to index map for ordering checks
    const componentIndexMap = new Map<string, number>();
    manifest.components.forEach((component: any, index: number) => {
      if (component.name) {
        componentIndexMap.set(component.name, index);
      }
    });

    // Check each component for @component: references
    manifest.components.forEach((component: any, componentIndex: number) => {
      const componentName = component.name;
      if (!componentName) {
        return;
      }

      // Extract all @component: references from component config
      const componentReferences = this.extractComponentReferences(component.config || {});

      // Validate each reference
      componentReferences.forEach((referencedName: string, path: string) => {
        // Check if referenced component exists
        if (!componentNames.has(referencedName)) {
          throw new Error(
            `Component '${componentName}' references non-existent component '${referencedName}' ` +
            `via @component: reference at ${path}. ` +
            `Available components: ${Array.from(componentNames).join(', ')}`
          );
        }

        // Check if referenced component is defined before this component
        const referencedIndex = componentIndexMap.get(referencedName);
        if (referencedIndex === undefined) {
          // Shouldn't happen if componentNames check passed, but defensive
          return;
        }

        if (referencedIndex >= componentIndex) {
          throw new Error(
            `Component '${componentName}' (at index ${componentIndex}) references component '${referencedName}' ` +
            `(at index ${referencedIndex}) via @component: reference at ${path}. ` +
            `Components are synthesized in manifest order, so dependencies must be defined first. ` +
            `Move '${referencedName}' before '${componentName}' in service.yml.`
          );
        }
      });
    });
  }

  /**
   * Recursively extract all @component: references from a configuration object
   * 
   * @param obj - Configuration object to search
   * @param path - Current path in the object (for error messages)
   * @param references - Map of component names to their paths
   * @returns Map of component names to their paths in the config
   */
  private extractComponentReferences(
    obj: any,
    path: string = 'config',
    references: Map<string, string> = new Map()
  ): Map<string, string> {
    if (typeof obj === 'string') {
      // Check for @component:component-name pattern
      if (obj.startsWith('@component:')) {
        const componentName = obj.replace('@component:', '');
        if (componentName) {
          references.set(componentName, path);
        }
      }
      return references;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.extractComponentReferences(item, `${path}[${index}]`, references);
      });
      return references;
    }

    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        this.extractComponentReferences(value, `${path}.${key}`, references);
      }
      return references;
    }

    return references;
  }
}