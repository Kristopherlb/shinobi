/**
 * EMR Binder Strategy
 * Handles big data processing bindings for Amazon EMR
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
export declare class EmrBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToCluster;
    private bindToStep;
    private bindToNotebook;
    private configureSecureClusterAccess;
}
//# sourceMappingURL=emr-binder-strategy.d.ts.map