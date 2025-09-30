/**
 * Amplify Binder Strategy
 * Handles mobile/web development platform bindings for Amazon Amplify
 */
import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
export declare class AmplifyBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToApp;
    private bindToBranch;
    private bindToDomain;
    private configureSecureAppAccess;
}
//# sourceMappingURL=amplify-binder-strategy.d.ts.map