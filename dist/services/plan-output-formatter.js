"use strict";
/**
 * Plan Output Formatter Service
 * Responsible for rendering synthesis results into user-friendly summaries
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanOutputFormatter = void 0;
/**
 * Service for formatting and rendering plan outputs
 */
class PlanOutputFormatter {
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    /**
     * Format synthesis results into comprehensive user-friendly output
     */
    formatPlanOutput(input) {
        const { synthesisResult, cdkDiff, environment, complianceFramework } = input;
        // Build user-friendly summary
        const summary = this.buildUserFriendlySummary(synthesisResult, cdkDiff, environment, complianceFramework);
        // Extract structured data for programmatic access
        const structuredData = this.buildStructuredData(synthesisResult, cdkDiff);
        // Generate recommendations based on analysis
        const recommendations = this.generateRecommendations(synthesisResult, complianceFramework);
        // Collect warnings from various sources
        const warnings = this.collectWarnings(synthesisResult, cdkDiff);
        return {
            userFriendlySummary: summary,
            structuredData,
            recommendations,
            warnings
        };
    }
    /**
     * Build comprehensive user-friendly summary
     */
    buildUserFriendlySummary(synthesisResult, cdkDiff, environment, complianceFramework) {
        const lines = [
            '=== Infrastructure Plan Summary ===',
            '',
            `Environment: ${environment}`,
            `Compliance Framework: ${complianceFramework}`,
            `Synthesis Time: ${synthesisResult.synthesisTime}ms`,
            ''
        ];
        // Component summary
        lines.push('--- Components ---');
        if (synthesisResult.components && synthesisResult.components.length > 0) {
            synthesisResult.components.forEach((component) => {
                lines.push(`  • ${component.spec.name} (${component.getType()})`);
                const capabilities = Object.keys(component.getCapabilities());
                if (capabilities.length > 0) {
                    lines.push(`    Capabilities: ${capabilities.join(', ')}`);
                }
                // Show construct handles
                const constructs = component.getAllConstructs();
                if (constructs.size > 0) {
                    const handles = Array.from(constructs.keys());
                    lines.push(`    Constructs: ${handles.join(', ')}`);
                }
            });
        }
        else {
            lines.push('  No components defined');
        }
        // Bindings summary
        lines.push('', '--- Component Bindings ---');
        if (synthesisResult.bindings && synthesisResult.bindings.length > 0) {
            synthesisResult.bindings.forEach((binding) => {
                lines.push(`  • ${binding.source} → ${binding.target} (${binding.capability})`);
                if (binding.result.iamPolicies && binding.result.iamPolicies.length > 0) {
                    const actions = binding.result.iamPolicies[0].actions;
                    lines.push(`    IAM Actions: ${actions.slice(0, 3).join(', ')}${actions.length > 3 ? '...' : ''}`);
                }
            });
        }
        else {
            lines.push('  No component bindings defined');
        }
        // CDK diff summary
        if (cdkDiff) {
            lines.push('', '--- Infrastructure Changes ---');
            if (cdkDiff.resources) {
                const added = Object.keys(cdkDiff.resources.added || {}).length;
                const modified = Object.keys(cdkDiff.resources.modified || {}).length;
                const removed = Object.keys(cdkDiff.resources.removed || {}).length;
                lines.push(`  Resources to add: ${added}`);
                lines.push(`  Resources to modify: ${modified}`);
                lines.push(`  Resources to remove: ${removed}`);
                if (added > 0) {
                    lines.push('', '  New Resources:');
                    Object.keys(cdkDiff.resources.added || {}).slice(0, 5).forEach(resource => {
                        lines.push(`    + ${resource}`);
                    });
                }
            }
        }
        // Patches summary
        if (synthesisResult.patchesApplied) {
            lines.push('', '--- Escape Hatch (Patches) ---');
            lines.push('  ⚠️  Custom patches detected and applied');
            lines.push('  📋 Review patches.ts for manual CDK modifications');
        }
        return lines.join('\n');
    }
    /**
     * Build structured data for programmatic access
     */
    buildStructuredData(synthesisResult, cdkDiff) {
        return {
            components: synthesisResult.components?.map((component) => ({
                name: component.spec.name,
                type: component.getType(),
                capabilities: component.getCapabilities(),
                constructs: Object.fromEntries(component.getAllConstructs())
            })) || [],
            bindings: synthesisResult.bindings || [],
            changes: cdkDiff || {},
            stacks: synthesisResult.stacks?.map((stack) => stack.stackName) || [],
            patchesApplied: synthesisResult.patchesApplied,
            synthesisTime: synthesisResult.synthesisTime
        };
    }
    /**
     * Generate framework-specific recommendations
     */
    generateRecommendations(synthesisResult, complianceFramework) {
        const recommendations = [];
        if (complianceFramework.startsWith('fedramp')) {
            recommendations.push('✓ FedRAMP compliance framework detected - enhanced security controls applied');
            if (complianceFramework === 'fedramp-high') {
                recommendations.push('🔒 FedRAMP High requires additional network isolation - verify VPC configuration');
            }
            // Check for encryption
            const hasUnencryptedResources = this.checkForUnencryptedResources(synthesisResult);
            if (hasUnencryptedResources) {
                recommendations.push('⚠️  Ensure all data at rest is encrypted for FedRAMP compliance');
            }
        }
        // Check for patches
        if (synthesisResult.patchesApplied) {
            recommendations.push('📋 Custom patches detected - ensure they maintain compliance requirements');
            recommendations.push('🧪 Test patches thoroughly in non-production environments first');
        }
        // Resource optimization
        const componentCount = synthesisResult.components?.length || 0;
        if (componentCount > 10) {
            recommendations.push('📊 Consider breaking large services into smaller, focused microservices');
        }
        return recommendations;
    }
    /**
     * Collect warnings from various sources
     */
    collectWarnings(synthesisResult, cdkDiff) {
        const warnings = [];
        // Check for potential issues in synthesis
        if (synthesisResult.synthesisTime > 5000) {
            warnings.push(`Synthesis took ${synthesisResult.synthesisTime}ms - consider optimizing component complexity`);
        }
        // Check CDK diff warnings
        if (cdkDiff?.security?.warnings) {
            warnings.push(...cdkDiff.security.warnings);
        }
        return warnings;
    }
    /**
     * Check for resources that should be encrypted in compliance frameworks
     */
    checkForUnencryptedResources(synthesisResult) {
        if (!synthesisResult.components)
            return false;
        return synthesisResult.components.some((component) => {
            const constructs = component.getAllConstructs();
            for (const [handle, construct] of constructs) {
                if (handle.includes('rds.DatabaseInstance') &&
                    construct.properties?.storageEncrypted === false) {
                    return true;
                }
                if (handle.includes('s3.Bucket') &&
                    !construct.properties?.encryptionConfiguration) {
                    return true;
                }
            }
            return false;
        });
    }
}
exports.PlanOutputFormatter = PlanOutputFormatter;
