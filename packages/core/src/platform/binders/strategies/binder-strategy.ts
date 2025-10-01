/**
 * Base Binder Strategy Interface
 * Defines the contract for all binder strategies
 */

import { BindingContext } from '../binding-context.js';
import { ComponentBinding } from '../component-binding.js';

export interface IBinderStrategy {
  readonly supportedCapabilities: string[];

  bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void>;
}
