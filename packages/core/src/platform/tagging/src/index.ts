/**
 * Platform Tagging Standard v1.0
 * Automatic governance and compliance tagging for all AWS resources
 */

export interface StandardTags {
  // Standard platform tags that are automatically applied
  'platform:managed-by': string;
  'platform:component-type': string;
  'platform:component-name': string;
  'platform:environment': string;
  'platform:cost-center': string;
  'platform:owner': string;
  'platform:created-by': string;
  'platform:created-date': string;
  
  // Compliance and governance tags
  'compliance:framework': string;
  'compliance:classification': string;
  'compliance:retention-period': string;
  'governance:backup-policy': string;
  'governance:monitoring-level': string;
}

export interface CustomTags {
  [key: string]: string;
}

export interface TaggingContext {
  environment: string;
  costCenter: string;
  owner: string;
  complianceFramework?: string;
  componentType: string;
  componentName: string;
  metadata?: {
    classification?: string;
    dataClassification?: string;
    retentionPeriod?: string;
    logsRetention?: string;
    backupPolicy?: string;
    monitoringLevel?: string;
  };
}

export class PlatformTagging {
  private readonly context: TaggingContext;

  constructor(context: TaggingContext) {
    this.context = context;
  }

  /**
   * Generate standard platform tags that are automatically applied to all resources
   */
  generateStandardTags(): StandardTags {
    const now = new Date().toISOString();
    
    const classification = this.resolveString(
      this.context.metadata?.classification,
      this.context.metadata?.dataClassification,
      'internal'
    );

    const retentionPeriod = this.resolveString(
      this.context.metadata?.retentionPeriod,
      this.context.metadata?.logsRetention,
      '1-year'
    );

    const backupPolicy = this.resolveString(
      this.context.metadata?.backupPolicy,
      'standard'
    );

    const monitoringLevel = this.resolveString(
      this.context.metadata?.monitoringLevel,
      'standard'
    );

    return {
      'platform:managed-by': 'platform-cdk',
      'platform:component-type': this.context.componentType,
      'platform:component-name': this.context.componentName,
      'platform:environment': this.context.environment,
      'platform:cost-center': this.context.costCenter,
      'platform:owner': this.context.owner,
      'platform:created-by': 'platform-automation',
      'platform:created-date': now,
      'compliance:framework': this.context.complianceFramework || 'none',
      'compliance:classification': classification,
      'compliance:retention-period': retentionPeriod,
      'governance:backup-policy': backupPolicy,
      'governance:monitoring-level': monitoringLevel
    };
  }

  /**
   * Merge standard tags with custom tags, with validation
   */
  mergeTags(customTags: CustomTags = {}): Record<string, string> {
    const standardTags = this.generateStandardTags();
    
    // Validate custom tags don't override standard platform tags
    for (const key of Object.keys(customTags)) {
      if (key.startsWith('platform:') || key.startsWith('compliance:') || key.startsWith('governance:')) {
        throw new Error(`Custom tag "${key}" cannot override standard platform tags`);
      }
    }

    return {
      ...standardTags,
      ...customTags
    };
  }

  /**
   * Get compliance classification based on framework
   */
  private resolveString(...values: Array<string | undefined>): string {
    for (const value of values) {
      if (value !== undefined && value !== null) {
        const normalized = value.toString().trim();
        if (normalized.length > 0) {
          return normalized;
        }
      }
    }
    return '';
  }
}
