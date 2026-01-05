/**
 * Binding Directive Validator
 * 
 * Validates binding directives in service manifests to catch errors early.
 * Validates:
 * - Compatibility (source type → target capability)
 * - Access level validity
 * - Action profiles existence
 * - Directive structure (options, env)
 * - Unknown keys in options/env
 * 
 * This complements DirectiveSchemaValidator by providing manifest-level validation
 * before synthesis/deployment.
 */

import type { IUnifiedBinderStrategy, CompatibilityEntry } from '../platform/contracts/platform-binding-trigger-spec.js';
import type { UnifiedBinderRegistry } from '../platform/binders/registry/unified-binder-registry.js';
import { resolveActionProfile, loadActionProfiles } from '../platform/binders/action-profiles.js';
import { DirectiveSchemaValidator, DirectiveValidationError } from '../platform/contracts/directive-schema-validator.js';
import type { ComplianceFramework } from '../platform/contracts/bindings.js';
import type { ValidationError } from './enhanced-schema-validator.js';

export interface BindingDirectiveValidatorDependencies {
  binderRegistry: UnifiedBinderRegistry;
  complianceFramework: ComplianceFramework;
}

/**
 * Validator for binding directives in service manifests
 */
export class BindingDirectiveValidator {
  constructor(private dependencies: BindingDirectiveValidatorDependencies) {}

  /**
   * Validate all binding directives in a manifest
   * 
   * @param manifest - Service manifest containing components with binds
   * @returns Array of validation errors
   */
  async validateBindingDirectives(manifest: any): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!manifest.components || !Array.isArray(manifest.components)) {
      return errors;
    }

    // Build a map of component names to types for quick lookup
    const componentMap = new Map<string, string>();
    for (const component of manifest.components) {
      if (component.name && component.type) {
        componentMap.set(component.name, component.type);
      }
    }

    // Validate binds in each component
    for (let componentIndex = 0; componentIndex < manifest.components.length; componentIndex++) {
      const component = manifest.components[componentIndex];
      if (!component.binds || !Array.isArray(component.binds)) {
        continue;
      }

      const sourceType = component.type;
      const sourceName = component.name || `component[${componentIndex}]`;

      for (let bindIndex = 0; bindIndex < component.binds.length; bindIndex++) {
        const bind = component.binds[bindIndex];
        const bindPath = `components[${componentIndex}].binds[${bindIndex}]`;

        // Validate required fields
        if (!bind.capability) {
          errors.push({
            path: `${bindPath}.capability`,
            message: 'Binding capability is required',
            rule: 'required',
            severity: 'error',
            componentType: sourceType,
            componentName: sourceName
          });
          continue;
        }

        if (!bind.access) {
          errors.push({
            path: `${bindPath}.access`,
            message: 'Binding access level is required',
            rule: 'required',
            severity: 'error',
            componentType: sourceType,
            componentName: sourceName
          });
          continue;
        }

        // Resolve target component if 'to' is specified
        let targetType: string | undefined;
        if (bind.to) {
          targetType = componentMap.get(bind.to);
          if (!targetType) {
            errors.push({
              path: `${bindPath}.to`,
              message: `Target component '${bind.to}' not found in manifest`,
              rule: 'reference-validation',
              severity: 'error',
              componentType: sourceType,
              componentName: sourceName
            });
            continue;
          }
        }

        // Validate compatibility (source type → capability)
        const strategy = this.dependencies.binderRegistry.findStrategyForBinding(
          sourceType,
          bind.capability
        );

        if (!strategy) {
          // Try to find what capabilities are available for this source type
          const availableCapabilities = this.dependencies.binderRegistry
            .getRegisteredCapabilities()
            .filter(cap => {
              const s = this.dependencies.binderRegistry.findStrategyForBinding(sourceType, cap);
              return s !== null;
            });

          const suggestion = availableCapabilities.length > 0
            ? ` Available capabilities for ${sourceType}: ${availableCapabilities.join(', ')}`
            : '';

          const message = availableCapabilities.length > 0
            ? `No binder found for ${sourceType} -> ${bind.capability}. Available capabilities for ${sourceType}: ${availableCapabilities.join(', ')}`
            : `No binder found for ${sourceType} -> ${bind.capability}. This source type may not support binding to this capability.`;
          
          errors.push({
            path: `${bindPath}`,
            message,
            rule: 'compatibility-validation',
            severity: 'error',
            componentType: sourceType,
            componentName: sourceName,
            allowedValues: availableCapabilities
          });
          continue;
        }

        // Validate access level against compatibility matrix
        const compatibilityErrors = this.validateAccessLevel(
          bind,
          strategy,
          bindPath,
          sourceType,
          sourceName
        );
        errors.push(...compatibilityErrors);

        // Validate action profiles
        if (bind.actions) {
          const actionErrors = this.validateActionProfiles(
            bind.actions,
            bind.capability,
            bindPath,
            sourceType,
            sourceName
          );
          errors.push(...actionErrors);
        }

        // Validate directive structure (options, env) using DirectiveSchemaValidator
        const directiveErrors = this.validateDirectiveStructure(
          bind,
          bind.capability,
          bindPath,
          sourceType,
          sourceName
        );
        errors.push(...directiveErrors);
      }
    }

    return errors;
  }

  /**
   * Validate access level against compatibility matrix
   */
  private validateAccessLevel(
    bind: any,
    strategy: IUnifiedBinderStrategy,
    bindPath: string,
    sourceType: string,
    sourceName: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const compatibility = strategy.getCompatibilityMatrix();

    // Find matching compatibility entry
    const matchingEntry = compatibility.find(
      entry => entry.sourceType === sourceType && entry.capability === bind.capability
    );

    // Determine allowed access levels (prefer specific entry, fall back to general)
    const validAccessLevels = ['read', 'write', 'readwrite', 'admin'];
    const allowed = matchingEntry?.supportedAccess ?? validAccessLevels;

    if (!allowed.includes(bind.access)) {
      errors.push({
        path: `${bindPath}.access`,
        message: `Invalid access level '${bind.access}' for capability '${bind.capability}'. Allowed: ${allowed.join(', ')}`,
        rule: 'access-level-validation',
        value: bind.access,
        allowedValues: allowed,
        severity: 'error',
        componentType: sourceType,
        componentName: sourceName
      });
    }

    return errors;
  }

  /**
   * Validate action profiles
   */
  private validateActionProfiles(
    actions: string | string[],
    capability: string,
    bindPath: string,
    sourceType: string,
    sourceName: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const actionList = Array.isArray(actions) ? actions : [actions];

    for (let i = 0; i < actionList.length; i++) {
      const action = actionList[i];
      
      // Check if it's a profile (contains '-' but not ':')
      // Profiles look like 'sqs-consumer', actions look like 'sqs:ReceiveMessage'
      if (action.includes('-') && !action.includes(':')) {
        const profile = resolveActionProfile(action, this.dependencies.complianceFramework);
        
        if (!profile) {
          // Try to find similar profiles
          const allProfiles = this.getAllActionProfiles();
          const similarProfiles = allProfiles.filter(p => 
            p.toLowerCase().includes(action.toLowerCase().split('-')[0])
          );

          const suggestion = similarProfiles.length > 0
            ? ` Similar profiles: ${similarProfiles.slice(0, 3).join(', ')}`
            : '';

          // Extract service prefix from capability for action suggestions (e.g., 'sqs:queue' -> 'sqs')
          const servicePrefix = capability.includes(':') ? capability.split(':')[0] : capability;
          const exampleAction = `${servicePrefix}:DescribeThing`;
          
          const profileMessage = similarProfiles.length > 0
            ? `Unknown action profile '${action}' for capability '${capability}' in ${this.dependencies.complianceFramework} framework. Did you mean: ${similarProfiles.slice(0, 3).join(', ')}? Use a valid profile or specific actions like '${exampleAction}'`
            : `Unknown action profile '${action}' for capability '${capability}' in ${this.dependencies.complianceFramework} framework. Use specific actions (e.g., '${exampleAction}') or check available profiles in config/${this.dependencies.complianceFramework}.yml`;
          
          errors.push({
            path: `${bindPath}.actions${Array.isArray(actions) ? `[${i}]` : ''}`,
            message: profileMessage,
            rule: 'action-profile-validation',
            value: action,
            allowedValues: similarProfiles,
            severity: 'error',
            componentType: sourceType,
            componentName: sourceName
          });
        }
      } else if (action.includes(':')) {
        // Validate action format (service:Action)
        const parts = action.split(':');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          errors.push({
            path: `${bindPath}.actions${Array.isArray(actions) ? `[${i}]` : ''}`,
            message: `Invalid action format '${action}'. Expected format: 'service:Action' (e.g., 'sqs:ReceiveMessage')`,
            rule: 'action-format-validation',
            value: action,
            severity: 'error',
            componentType: sourceType,
            componentName: sourceName
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate directive structure (options, env) using DirectiveSchemaValidator
   */
  private validateDirectiveStructure(
    bind: any,
    capability: string,
    bindPath: string,
    sourceType: string,
    sourceName: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
      // Use DirectiveSchemaValidator to validate options and env
      DirectiveSchemaValidator.validate(bind, capability);
    } catch (error) {
      if (error instanceof DirectiveValidationError) {
        // Convert DirectiveValidationError to ValidationError format
        for (const directiveError of error.errors) {
          errors.push({
            path: `${bindPath}.${directiveError.path}`,
            message: directiveError.message,
            rule: 'directive-schema-validation',
            severity: 'error',
            componentType: sourceType,
            componentName: sourceName
          });
        }
      } else {
        // Unexpected error
        errors.push({
          path: bindPath,
          message: `Directive validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          rule: 'directive-validation',
          severity: 'error',
          componentType: sourceType,
          componentName: sourceName
        });
      }
    }

    return errors;
  }

  /**
   * Get all available action profiles for the current framework
   */
  private getAllActionProfiles(): string[] {
    try {
      const frameworkProfiles = loadActionProfiles(this.dependencies.complianceFramework);
      return Object.keys(frameworkProfiles);
    } catch (error) {
      // If we can't load profiles, return empty array
      return [];
    }
  }
}

