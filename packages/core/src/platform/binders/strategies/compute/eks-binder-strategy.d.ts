/**
 * EKS Binder Strategy
 * Handles Kubernetes service bindings for Amazon EKS clusters
 */
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
export declare class EksBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToCluster;
    private bindToNodeGroup;
    private bindToPod;
    private bindToService;
    private configureServiceMeshAccess;
}
//# sourceMappingURL=eks-binder-strategy.d.ts.map