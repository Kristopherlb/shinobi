/**
 * Neptune Binder Strategy
 * Handles graph database bindings for Amazon Neptune
 */
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
export declare class NeptuneBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToCluster;
    private bindToInstance;
    private bindToQuery;
    private configureSecureClusterAccess;
    private configureSecureQueryAccess;
}
//# sourceMappingURL=neptune-binder-strategy.d.ts.map