/**
 * Step Functions Binder Strategy
 * Handles workflow orchestration bindings for AWS Step Functions
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
export declare class StepFunctionsBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToStateMachine;
    private bindToExecution;
    private bindToActivity;
    private configureSecureStateMachineAccess;
}
//# sourceMappingURL=step-functions-binder-strategy.d.ts.map