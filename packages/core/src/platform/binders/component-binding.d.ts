/**
 * Component Binding
 * Defines a binding relationship between components
 */
export interface ComponentBinding {
    from: string;
    to: string;
    capability: string;
    access: string[];
    env?: Record<string, string>;
    options?: Record<string, any>;
}
//# sourceMappingURL=component-binding.d.ts.map