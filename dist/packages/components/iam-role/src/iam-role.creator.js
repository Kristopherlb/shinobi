"use strict";
/**
 * IAM Role Component Creator Factory
 *
 * Factory class for creating IamRoleComponent instances.
 * Implements the Platform Component Creator pattern.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamRoleCreator = void 0;
const iam_role_component_1 = require("./iam-role.component");
/**
 * Factory for creating IamRoleComponent instances
 */
class IamRoleCreator {
    /**
     * Create a new IamRoleComponent instance
     */
    createComponent(spec, context) {
        return new iam_role_component_1.IamRoleComponent(context.scope, spec.name, context, spec);
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
        return 'iam-role';
    }
    /**
     * Validate that the component spec is compatible with this creator
     */
    validateSpec(spec) {
        return spec.type === 'iam-role' &&
            spec.config &&
            typeof spec.config === 'object' &&
            spec.config.role &&
            typeof spec.config.role === 'object';
    }
}
exports.IamRoleCreator = IamRoleCreator;
