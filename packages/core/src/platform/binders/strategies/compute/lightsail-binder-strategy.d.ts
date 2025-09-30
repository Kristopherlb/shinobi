/**
 * Lightsail Binder Strategy
 * Handles virtual private server bindings for Amazon Lightsail
 */
import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
export declare class LightsailBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToInstance;
    private bindToDatabase;
    private bindToLoadBalancer;
    private bindToContainerService;
    private configureSecureInstanceAccess;
    private configureSecureDatabaseAccess;
}
//# sourceMappingURL=lightsail-binder-strategy.d.ts.map