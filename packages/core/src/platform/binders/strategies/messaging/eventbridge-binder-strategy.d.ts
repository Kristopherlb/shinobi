/**
 * EventBridge Binder Strategy
 * Handles event-driven architecture bindings for Amazon EventBridge
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
export declare class EventBridgeBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToEventBus;
    private bindToRule;
    private bindToConnection;
    private configureSecureEventBusAccess;
}
//# sourceMappingURL=eventbridge-binder-strategy.d.ts.map