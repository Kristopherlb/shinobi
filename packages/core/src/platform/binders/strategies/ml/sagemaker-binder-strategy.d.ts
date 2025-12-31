/**
 * SageMaker Binder Strategy
 * Handles machine learning bindings for Amazon SageMaker
 */
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
export declare class SageMakerBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToNotebook;
    private bindToModel;
    private bindToEndpoint;
    private bindToTrainingJob;
    private configureSecureNotebookAccess;
}
//# sourceMappingURL=sagemaker-binder-strategy.d.ts.map