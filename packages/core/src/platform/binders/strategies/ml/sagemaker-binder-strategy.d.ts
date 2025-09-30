/**
 * SageMaker Binder Strategy
 * Handles machine learning bindings for Amazon SageMaker
 */
import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
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