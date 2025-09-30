/**
 * EFS Binder Strategy
 * Handles Elastic File System bindings for Amazon EFS
 */
import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
export declare class EfsBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToFileSystem;
    private bindToMountTarget;
    private bindToAccessPoint;
    private configureSecureFileSystemAccess;
}
//# sourceMappingURL=efs-binder-strategy.d.ts.map