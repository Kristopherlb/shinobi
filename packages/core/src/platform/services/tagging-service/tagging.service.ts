/**
 * Tagging Service
 * 
 * Provides standardized tagging functionality for platform components and services.
 * Implements the Platform Tagging Standard v1.0.
 */

import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { GovernanceMetadata } from '../governance/index.js';

/**
 * Context information needed for building standard tags
 */
export interface TaggingContext {
  serviceName: string;
  serviceLabels?: Record<string, string>;
  componentName: string;
  componentType: string;
  environment: string;
  region?: string;
  accountId?: string;
  complianceFramework?: string;
  tags?: Record<string, string>;
  governance?: GovernanceMetadata;
  standardTagOverrides?: Record<string, string>;
}

/**
 * Tagging service interface
 */
export interface ITaggingService {
  buildStandardTags(context: TaggingContext): Record<string, string>;
  applyStandardTags(resource: IConstruct, context: TaggingContext, additionalTags?: Record<string, string>): void;
}

/**
 * Standard tagging service implementation
 */
export class TaggingService implements ITaggingService {
  /**
   * Build standard tags based on context
   * Implements Platform Tagging Standard v1.0
   */
  public buildStandardTags(context: TaggingContext): Record<string, string> {
    const now = new Date();
    const deploymentId = `deploy-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;

    const overrides = context.standardTagOverrides ?? {};
    const labels = context.serviceLabels ?? {};
    const tags = context.tags ?? {};
    const governance = context.governance;

    const complianceFrameworkValue = this.resolveString(
      overrides['compliance-framework'],
      labels['compliance-framework'],
      labels['complianceFramework'],
      tags['compliance-framework'],
      tags['complianceFramework'],
      context.complianceFramework,
      'none'
    );

    const dataClassification = governance?.dataClassification
      ?? this.resolveString(
        overrides['data-classification'],
        labels['data-classification'],
        labels['dataClassification'],
        tags['data-classification'],
        tags['dataClassification'],
        'internal'
      );

    const backupRequired = this.resolveBooleanString(
      overrides['backup-required'],
      governance ? (governance.backupRequired ? 'true' : 'false') : undefined,
      tags['backup-required'],
      true
    );

    const monitoringLevel = this.resolveString(
      overrides['monitoring-level'],
      governance?.monitoringLevel,
      labels['monitoring-level'],
      labels['monitoringLevel'],
      tags['monitoring-level'],
      tags['monitoringLevel'],
      'standard'
    );

    const retentionPeriod = this.resolveString(
      overrides['retention-period'],
      governance ? `${governance.logRetentionDays}-days` : undefined,
      labels['retention-period'],
      labels['retentionPeriod'],
      tags['retention-period'],
      tags['retentionPeriod'],
      '1-year'
    );

    const costCenter = this.resolveString(
      overrides['cost-center'],
      labels['cost-center'],
      labels['costCenter'],
      tags['cost-center'],
      tags['costCenter'],
      'platform'
    );

    const owner = this.resolveString(
      overrides['owner'],
      labels['owner'],
      tags['owner'],
      'platform-engineering'
    );

    const project = this.resolveString(
      overrides['project'],
      labels['project'],
      tags['project'],
      context.serviceName
    );

    return {
      // Core Service Tags
      'service-name': context.serviceName,
      'service-version': context.serviceLabels?.version || '1.0.0',
      'component-name': context.componentName,
      'component-type': context.componentType,

      // Environment Tags
      'environment': context.environment,
      'deployment-id': deploymentId,

      // AWS Tags
      'cloud-provider': 'aws',
      'cloud-region': context.region || 'us-east-1',
      'cloud-account': context.accountId || 'unknown',

      // Platform Tags
      'platform': 'cdk-lib',
      'platform-version': '1.0.0',
      'managed-by': 'platform-engineering',

      // Cost Management Tags
      'cost-center': costCenter,
      'project': project,
      'owner': owner,

      // Security Tags
      'data-classification': dataClassification,
      'encryption-required': 'true',
      'compliance-framework': complianceFrameworkValue,

      // Operational Tags
      'backup-required': backupRequired,
      'monitoring-level': monitoringLevel,
      'retention-period': retentionPeriod
    };
  }

  /**
   * Apply standard tags to a CDK construct
   */
  public applyStandardTags(resource: IConstruct, context: TaggingContext, additionalTags?: Record<string, string>): void {
    const standardTags = this.buildStandardTags(context);

    // Apply all standard tags
    Object.entries(standardTags).forEach(([key, value]) => {
      cdk.Tags.of(resource).add(key, value);
    });

    // Apply any additional component-specific tags
    if (additionalTags) {
      Object.entries(additionalTags).forEach(([key, value]) => {
        cdk.Tags.of(resource).add(key, value);
      });
    }
  }

  private resolveString(...values: Array<string | undefined>): string {
    for (const value of values) {
      if (value !== undefined && value !== null) {
        const trimmed = value.toString().trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }
    return '';
  }

  private resolveBooleanString(...values: Array<string | boolean | undefined>): string {
    for (const value of values) {
      if (value === undefined || value === null) {
        continue;
      }

      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }

      const normalized = value.toString().trim().toLowerCase();
      if (['true', '1', 'yes', 'enabled', 'required'].includes(normalized)) {
        return 'true';
      }
      if (['false', '0', 'no', 'disabled', 'optional', 'recommended'].includes(normalized)) {
        return 'false';
      }
    }

    return 'true';
  }
}

/**
 * Default tagging service instance
 */
export const defaultTaggingService = new TaggingService();
