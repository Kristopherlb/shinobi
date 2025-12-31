/**
 * App Runner Binder Strategy
 * Handles containerized web application bindings for AWS App Runner
 */
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
export declare class AppRunnerBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToService;
    private bindToConnection;
    private configureSecureNetworking;
}
//# sourceMappingURL=app-runner-binder-strategy.d.ts.map