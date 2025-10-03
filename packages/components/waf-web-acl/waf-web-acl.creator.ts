import { Construct } from 'constructs';

import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator
} from '@shinobi/core';

import { WafWebAclComponent } from './waf-web-acl.component.ts';
import {
  WafWebAclComponentConfig,
  WAF_WEB_ACL_CONFIG_SCHEMA
} from './waf-web-acl.builder.ts';

export class WafWebAclComponentCreator implements IComponentCreator {
  public readonly componentType = 'waf-web-acl';
  public readonly displayName = 'WAF Web ACL';
  public readonly description = 'AWS WAF Web Application Firewall with managed and custom rule support.';
  public readonly category = 'security';
  public readonly awsService = 'WAFV2';
  public readonly tags = ['waf', 'security', 'wafv2'];
  public readonly configSchema = WAF_WEB_ACL_CONFIG_SCHEMA;

  public createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): WafWebAclComponent {
    return new WafWebAclComponent(scope, spec.name, context, spec);
  }

  public validateSpec(spec: ComponentSpec, _context: ComponentContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<WafWebAclComponentConfig> | undefined;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, or underscores.');
    }

    if (config?.managedRuleGroups) {
      const priorities = config.managedRuleGroups.map((group) => group.priority);
      const duplicatePriority = priorities.find((priority, index) => priorities.indexOf(priority) !== index);
      if (duplicatePriority !== undefined) {
        errors.push(`Managed rule groups must have unique priorities (duplicate: ${duplicatePriority}).`);
      }
    }

    if (config?.customRules) {
      const priorities = config.customRules.map((rule) => rule.priority);
      const duplicatePriority = priorities.find((priority, index) => priorities.indexOf(priority) !== index);
      if (duplicatePriority !== undefined) {
        errors.push(`Custom rules must have unique priorities (duplicate: ${duplicatePriority}).`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['security:waf-web-acl', 'waf:web-acl', 'monitoring:waf-web-acl', 'protection:web-application'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return ['main', 'webAcl', 'logGroup', 'loggingConfiguration'];
  }
}
