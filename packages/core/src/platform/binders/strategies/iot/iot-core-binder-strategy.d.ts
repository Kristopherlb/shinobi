/**
 * IoT Core Binder Strategy
 * Handles IoT device management bindings for AWS IoT Core
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
export declare class IoTCoreBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToThing;
    private bindToTopic;
    private bindToRule;
    private bindToCertificate;
    private configureSecureThingAccess;
}
//# sourceMappingURL=iot-core-binder-strategy.d.ts.map