/**
 * Kinesis Binder Strategy
 * Handles real-time data streaming bindings for Amazon Kinesis
 */
import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
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