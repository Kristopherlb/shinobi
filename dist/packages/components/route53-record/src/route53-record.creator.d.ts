/**
 * Route 53 Record Component Creator Factory
 *
 * Factory class for creating Route53RecordComponent instances.
 * Implements the Platform Component Creator pattern.
 */
import { IComponentCreator, IComponent, ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';
/**
 * Factory for creating Route53RecordComponent instances
 */
export declare class Route53RecordCreator implements IComponentCreator {
    /**
     * Create a new Route53RecordComponent instance
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
