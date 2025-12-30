/**
 * Creator for IamRoleComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 */

import {
  ComponentContext,
  ComponentSpec,
  IComponent,
  IComponentCreator
} from '@platform/contracts';
import { IamRoleComponent } from './iam-role.component.ts';
import { IamRoleConfig, IAM_ROLE_CONFIG_SCHEMA } from './iam-role.builder.ts';

export class IamRoleComponentCreator implements IComponentCreator {
  public readonly componentType = 'iam-role';
  public readonly displayName = 'IAM Role';
  public readonly description = 'Provision a hardened IAM role with compliance-aware defaults.';
  public readonly category = 'security';
  public readonly awsService = 'IAM';
  public readonly tags = ['iam-role', 'security', 'aws', 'iam'];
  public readonly configSchema = IAM_ROLE_CONFIG_SCHEMA;

  public createComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    const id = spec.name;
    return new IamRoleComponent(context.scope, id, context, spec);
  }

  public processComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    return this.createComponent(spec, context);
  }

  public validateSpec(spec: ComponentSpec, context: ComponentContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as IamRoleConfig | undefined;

    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }

    if (context.environment === 'prod') {
      if (!config?.monitoring?.enabled) {
        errors.push('Monitoring must be enabled in production environment');
      }
      if (!config?.logging?.audit?.enabled) {
        errors.push('Audit logging must be enabled in production environment');
      }
      if (!config?.controls?.trustPolicies?.enforceMfa) {
        errors.push('MFA enforcement must be enabled in production environment');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['iam:assumeRole', 'iam:instance-profile'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return ['role', 'instanceProfile', 'accessLogGroup', 'auditLogGroup', 'sessionAlarm'];
  }
}
