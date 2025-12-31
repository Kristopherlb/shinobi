/**
 * Base Binder Strategy Interface
 * Defines the contract for all binder strategies
 */

import { ComponentBinding, BindingRuntimeContext } from '../types.js';
import { ComponentBinding, BindingRuntimeContext } from '../../types.js';

export interface IBinderStrategy {
  readonly supportedCapabilities: string[];

  bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingRuntimeContext
  ): Promise<void>;
}
