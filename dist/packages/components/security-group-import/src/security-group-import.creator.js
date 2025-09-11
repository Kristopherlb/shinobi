"use strict";
/**
 * Security Group Import Component Creator Factory
 *
 * Factory class for creating SecurityGroupImportComponent instances.
 * Implements the Platform Component Creator pattern.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityGroupImportCreator = void 0;
const security_group_import_component_1 = require("./security-group-import.component");
/**
 * Factory for creating SecurityGroupImportComponent instances
 */
class SecurityGroupImportCreator {
    /**
     * Create a new SecurityGroupImportComponent instance
     */
    createComponent(spec, context) {
        return new security_group_import_component_1.SecurityGroupImportComponent(context.scope, spec.name, context, spec);
    }
    /**
     * Process component (alias for createComponent)
     */
    processComponent(spec, context) {
        return this.createComponent(spec, context);
    }
    /**
     * Get the component type this creator handles
     */
    getComponentType() {
        return 'security-group-import';
    }
    /**
     * Validate that the component spec is compatible with this creator
     */
    validateSpec(spec) {
        return spec.type === 'security-group-import' &&
            spec.config &&
            typeof spec.config === 'object' &&
            spec.config.securityGroup &&
            typeof spec.config.securityGroup === 'object' &&
            spec.config.securityGroup.ssmParameterName &&
            typeof spec.config.securityGroup.ssmParameterName === 'string';
    }
}
exports.SecurityGroupImportCreator = SecurityGroupImportCreator;
