/**
 * KMS Binder Strategy
 * Handles Key Management Service bindings for AWS KMS
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
export declare class KmsBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToKey;
    private bindToAlias;
    private bindToGrant;
    private configureSecureKeyAccess;
}
//# sourceMappingURL=kms-binder-strategy.d.ts.map