/**
 * EventBridge Binder Strategy
 * Handles event-driven architecture bindings for Amazon EventBridge
 */
import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
export declare class EventBridgeBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToEventBus;
    private bindToRule;
    private bindToConnection;
    private configureSecureEventBusAccess;
}
//# sourceMappingURL=eventbridge-binder-strategy.d.ts.map