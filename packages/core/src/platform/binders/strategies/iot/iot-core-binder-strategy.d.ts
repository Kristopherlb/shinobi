/**
 * IoT Core Binder Strategy
 * Handles IoT device management bindings for AWS IoT Core
 */
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
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