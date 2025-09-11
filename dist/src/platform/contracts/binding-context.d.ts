/**
 * Shared Binding Context Interface
 * Used by all binding strategies to standardize binding configuration
 */
export interface BindingContext {
    sourceComponent: Component;
    targetComponent: Component;
    capability: string;
    access: 'read' | 'write' | 'readwrite' | 'admin';
    customEnvVars?: Record<string, string>;
    options?: Record<string, any>;
}
