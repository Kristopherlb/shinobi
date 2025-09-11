/**
 * Abstract Factory Provider for Component Factories
 * Enables compliance-aware component creation
 */
import { IComponentFactory, IComponentRegistry, ComponentSpec, ComponentContext, IComponent, IComponentCreator } from '@platform/contracts';
/**
 * Abstract Factory Provider - creates the appropriate factory for compliance framework
 */
export declare class ComponentFactoryProvider {
    static createFactory(complianceFramework: string): IComponentFactory;
}
/**
 * Base component registry with plugin-based component discovery
 */
export declare class ComponentRegistry implements IComponentRegistry {
    private complianceFramework;
    private creators;
    constructor(complianceFramework: string);
    register(type: string, creator: IComponentCreator): void;
    createComponent(spec: ComponentSpec, context: ComponentContext): IComponent;
    getSupportedTypes(): string[];
    /**
     * Auto-discover and register component packages
     * This would scan for @platform/* component packages and register them
     */
    discoverAndRegisterComponents(): Promise<void>;
}
