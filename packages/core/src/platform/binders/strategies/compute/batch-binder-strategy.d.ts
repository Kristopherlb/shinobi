/**
 * Batch Binder Strategy
 * Handles batch computing workload bindings for AWS Batch
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
export declare class BatchBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToJobQueue;
    private bindToComputeEnvironment;
    private bindToJobDefinition;
    private bindToJob;
    private configureSecureJobEnvironment;
}
//# sourceMappingURL=batch-binder-strategy.d.ts.map