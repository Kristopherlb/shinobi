"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceValidator = void 0;
/**
 * Pure service for reference and semantic validation
 * Responsibility: Stage 4 - Semantic & Reference Validation (AC-P4.1, AC-P4.2, AC-P4.3)
 */
class ReferenceValidator {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async validateReferences(manifest) {
        this.dependencies.logger.debug('Validating references and semantic rules');
        // Build component name index
        const componentNames = new Set();
        if (manifest.components) {
            manifest.components.forEach((component) => {
                if (component.name) {
                    componentNames.add(component.name);
                }
            });
        }
        // Validate binds references (AC-P4.2)
        if (manifest.components) {
            manifest.components.forEach((component, index) => {
                if (component.binds) {
                    component.binds.forEach((bind, bindIndex) => {
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
            manifest.governance.cdkNag.suppress.forEach((suppression, index) => {
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
    validateRefExpressions(obj, componentNames, path = 'root') {
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
    isValidDate(dateString) {
        // Enhanced date validation with strict ISO 8601 format
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!isoDateRegex.test(dateString)) {
            return false;
        }
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }
}
exports.ReferenceValidator = ReferenceValidator;
