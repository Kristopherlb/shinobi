"use strict";
/**
 * Platform Tagging Standard v1.0
 * Automatic governance and compliance tagging for all AWS resources
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformTagging = void 0;
class PlatformTagging {
    context;
    constructor(context) {
        this.context = context;
    }
    /**
     * Generate standard platform tags that are automatically applied to all resources
     */
    generateStandardTags() {
        const now = new Date().toISOString();
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
            'compliance:classification': this.getComplianceClassification(),
            'compliance:retention-period': this.getRetentionPeriod(),
            'governance:backup-policy': this.getBackupPolicy(),
            'governance:monitoring-level': this.getMonitoringLevel()
        };
    }
    /**
     * Merge standard tags with custom tags, with validation
     */
    mergeTags(customTags = {}) {
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
    getComplianceClassification() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 'high';
            case 'fedramp-moderate':
            case 'pci-dss':
            case 'hipaa':
                return 'moderate';
            case 'fedramp-low':
                return 'low';
            default:
                return 'internal';
        }
    }
    /**
     * Get retention period based on compliance requirements
     */
    getRetentionPeriod() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return '7-years';
            case 'fedramp-moderate':
            case 'pci-dss':
                return '3-years';
            case 'hipaa':
                return '6-years';
            default:
                return '1-year';
        }
    }
    /**
     * Get backup policy based on compliance requirements
     */
    getBackupPolicy() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 'daily-cross-region';
            case 'fedramp-moderate':
            case 'pci-dss':
            case 'hipaa':
                return 'daily-local';
            default:
                return 'weekly';
        }
    }
    /**
     * Get monitoring level based on compliance requirements
     */
    getMonitoringLevel() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 'comprehensive';
            case 'fedramp-moderate':
            case 'pci-dss':
            case 'hipaa':
                return 'enhanced';
            default:
                return 'standard';
        }
    }
}
exports.PlatformTagging = PlatformTagging;
