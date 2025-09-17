/**
 * Shared Binding Context Interface
 * Used by all binding strategies to standardize binding configuration
 */

import { IComponent } from './component-interfaces';

export interface BindingContext {
  sourceComponent: IComponent;
  targetComponent: IComponent;
  capability: string;
  access: 'read' | 'write' | 'readwrite' | 'admin';
  customEnvVars?: Record<string, string>;
  options?: Record<string, any>;
}