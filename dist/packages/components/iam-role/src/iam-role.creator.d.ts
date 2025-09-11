/**
 * IAM Role Component Creator Factory
 *
 * Factory class for creating IamRoleComponent instances.
 * Implements the Platform Component Creator pattern.
 */
import { IComponentCreator, IComponent, ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';
/**
 * Factory for creating IamRoleComponent instances
 */
export declare class IamRoleCreator implements IComponentCreator {
    /**
     * Create a new IamRoleComponent instance
     */
    createComponent(spec: ComponentSpec, context: ComponentContext): IComponent;
    /**
     * Process component (alias for createComponent)
     */
    processComponent(spec: ComponentSpec, context: ComponentContext): IComponent;
    /**
     * Get the component type this creator handles
     */
    getComponentType(): string;
    /**
     * Validate that the component spec is compatible with this creator
     */
    validateSpec(spec: ComponentSpec): boolean;
}
