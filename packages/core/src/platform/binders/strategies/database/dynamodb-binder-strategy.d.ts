/**
 * DynamoDB Binder Strategy
 * Handles NoSQL database bindings for Amazon DynamoDB
 */
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
export declare class DynamoDbBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToTable;
    private bindToIndex;
    private bindToStream;
    private configureSecureTableAccess;
}
//# sourceMappingURL=dynamodb-binder-strategy.d.ts.map