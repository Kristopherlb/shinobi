/**
 * Base Binder Strategy Interface
 * Defines the contract for all binder strategies
 */
import { BindingContext } from '../binding-context';
import { ComponentBinding } from '../component-binding';
export interface IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
}
//# sourceMappingURL=binder-strategy.d.ts.map