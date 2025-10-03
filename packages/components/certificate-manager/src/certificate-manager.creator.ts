import { Construct } from 'constructs';
import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator
} from '@shinobi/core';
import {
  CertificateManagerComponent
} from './certificate-manager.component.js';
import {
  CertificateManagerConfig,
  CERTIFICATE_MANAGER_CONFIG_SCHEMA
} from './certificate-manager.builder.js';

export class CertificateManagerComponentCreator implements IComponentCreator {
  public readonly componentType = 'certificate-manager';
  public readonly displayName = 'Certificate Manager Component';
  public readonly description = 'Provision and manage ACM certificates with platform policy';
  public readonly category = 'security';
  public readonly awsService = 'CERTIFICATEMANAGER';
  public readonly tags = ['certificate-manager', 'security', 'acm'];
  public readonly configSchema = CERTIFICATE_MANAGER_CONFIG_SCHEMA;

  public createComponent(spec: ComponentSpec, context: ComponentContext): CertificateManagerComponent {
    if (!context.scope) {
      throw new Error('ComponentContext.scope is required to create components');
    }
    this.assertValidSpec(spec);
    return new CertificateManagerComponent(context.scope as Construct, spec.name, context, spec);
  }

  public processComponent(spec: ComponentSpec, context: ComponentContext): CertificateManagerComponent {
    return this.createComponent(spec, context);
  }

  public validateSpec(spec: ComponentSpec): { valid: boolean; errors: string[] } {
    const errors = this.collectValidationErrors(spec);
    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['certificate:acm'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return ['main', 'certificate', 'hostedZone', 'expirationAlarm', 'statusAlarm'];
  }

  private assertValidSpec(spec: ComponentSpec): void {
    const errors = this.collectValidationErrors(spec);
    if (errors.length > 0) {
      throw new Error(`Invalid certificate-manager specification: ${errors.join('; ')}`);
    }
  }

  private collectValidationErrors(spec: ComponentSpec): string[] {
    const errors: string[] = [];
    const config = spec.config as Partial<CertificateManagerConfig>;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, or underscores');
    }

    if (!config?.domainName) {
      errors.push('certificate-manager requires config.domainName');
    }

    if (config?.validation?.method === 'EMAIL') {
      if (!config.validation.validationEmails || config.validation.validationEmails.length === 0) {
        errors.push('Email validation requires at least one validation email');
      }
    }

    return errors;
  }
}
