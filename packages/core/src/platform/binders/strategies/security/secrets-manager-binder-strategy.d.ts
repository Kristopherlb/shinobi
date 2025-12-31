/**
 * Secrets Manager Binder Strategy
 * Handles secrets management bindings for AWS Secrets Manager
 */
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
export declare class SecretsManagerBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToSecret;
    private bindToRotation;
    private configureSecureSecretAccess;
}
//# sourceMappingURL=secrets-manager-binder-strategy.d.ts.map