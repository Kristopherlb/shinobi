"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceValidator = void 0;
/**
 * Pure service for reference and semantic validation
 * Responsibility: Stage 4 - Semantic & Reference Validation (AC-P4.1, AC-P4.2, AC-P4.3)
 */
class ReferenceValidator {
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
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }
}
exports.ReferenceValidator = ReferenceValidator;
