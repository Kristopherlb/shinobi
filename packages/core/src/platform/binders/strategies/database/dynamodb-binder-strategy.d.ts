/**
 * DynamoDB Binder Strategy
 * Handles NoSQL database bindings for Amazon DynamoDB
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
export declare class DynamoDbBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToTable;
    private bindToIndex;
    private bindToStream;
    private resolveIndexTarget;
    private pickIndex;
    private configureSecureTableAccess;
}
//# sourceMappingURL=dynamodb-binder-strategy.d.ts.map