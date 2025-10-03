/**
 * Neptune Binder Strategy
 * Handles graph database bindings for Amazon Neptune
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
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