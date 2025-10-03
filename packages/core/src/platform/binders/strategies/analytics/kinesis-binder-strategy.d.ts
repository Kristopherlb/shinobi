/**
 * Kinesis Binder Strategy
 * Handles real-time data streaming bindings for Amazon Kinesis
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
export declare class KinesisBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToStream;
    private bindToAnalytics;
    private bindToFirehose;
    private configureSecureStreamAccess;
    private configureSecureFirehoseAccess;
}
//# sourceMappingURL=kinesis-binder-strategy.d.ts.map