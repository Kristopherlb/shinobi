/**
 * Step Functions Binder Strategy
 * Handles workflow orchestration bindings for AWS Step Functions
 */
import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
export declare class StepFunctionsBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToStateMachine;
    private bindToExecution;
    private bindToActivity;
    private configureSecureStateMachineAccess;
}
//# sourceMappingURL=step-functions-binder-strategy.d.ts.map