/**
 * Artifact Writer Service
 *
 * Handles writing CLI command artifacts to files with proper organization
 * and structured output for CI/CD integration and auditing.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ArtifactSerializerFactory } from './artifact-serializer.js';
export class StandardArtifactWriter {
    serializer = ArtifactSerializerFactory.create('json');
    async writePlanArtifact(artifact, outputDir) {
        const writtenFiles = [];
        // Ensure output directory exists
        await fs.promises.mkdir(outputDir, { recursive: true });
        // Write main plan artifact
        const planFile = path.join(outputDir, 'plan.json');
        await this.serializer.writeToFile(artifact, planFile);
        writtenFiles.push(planFile);
        // Write component-specific plan artifacts
        for (const component of artifact.components) {
            const componentDir = path.join(outputDir, 'components', component.componentId);
            await fs.promises.mkdir(componentDir, { recursive: true });
            // Write component plan
            const componentPlanFile = path.join(componentDir, 'component.plan.json');
            await this.serializer.writeToFile(component, componentPlanFile);
            writtenFiles.push(componentPlanFile);
            // Write compliance plan if exists
            if (component.compliancePlan) {
                const complianceFile = path.join(componentDir, 'compliance.plan.json');
                await fs.promises.writeFile(complianceFile, component.compliancePlan, 'utf8');
                writtenFiles.push(complianceFile);
            }
        }
        // Write summary files
        const summaryFile = path.join(outputDir, 'summary.json');
        await this.serializer.writeToFile(artifact.summary, summaryFile);
        writtenFiles.push(summaryFile);
        // Write validation results
        const validationFile = path.join(outputDir, 'validation.json');
        await this.serializer.writeToFile(artifact.validation, validationFile);
        writtenFiles.push(validationFile);
        // Write compliance summary
        const complianceFile = path.join(outputDir, 'compliance.json');
        await this.serializer.writeToFile(artifact.compliance, complianceFile);
        writtenFiles.push(complianceFile);
        return writtenFiles;
    }
    async writeDeploymentArtifact(artifact, outputDir) {
        const writtenFiles = [];
        // Ensure output directory exists
        await fs.promises.mkdir(outputDir, { recursive: true });
        // Write main deployment artifact
        const deploymentFile = path.join(outputDir, 'deployment.json');
        await this.serializer.writeToFile(artifact, deploymentFile);
        writtenFiles.push(deploymentFile);
        // Write stack results
        for (const stack of artifact.stacks) {
            const stackFile = path.join(outputDir, 'stacks', `${stack.stackName}.json`);
            await fs.promises.mkdir(path.dirname(stackFile), { recursive: true });
            await this.serializer.writeToFile(stack, stackFile);
            writtenFiles.push(stackFile);
        }
        // Write resource results
        const resourcesFile = path.join(outputDir, 'resources.json');
        await this.serializer.writeToFile(artifact.resources, resourcesFile);
        writtenFiles.push(resourcesFile);
        // Write deployment changes
        const changesFile = path.join(outputDir, 'changes.json');
        await this.serializer.writeToFile(artifact.changes, changesFile);
        writtenFiles.push(changesFile);
        // Write stack outputs
        const outputsFile = path.join(outputDir, 'outputs.json');
        await this.serializer.writeToFile(artifact.outputs, outputsFile);
        writtenFiles.push(outputsFile);
        return writtenFiles;
    }
    async writeMigrationArtifact(artifact, outputDir) {
        const writtenFiles = [];
        // Ensure output directory exists
        await fs.promises.mkdir(outputDir, { recursive: true });
        // Write main migration artifact
        const migrationFile = path.join(outputDir, 'migration.json');
        await this.serializer.writeToFile(artifact, migrationFile);
        writtenFiles.push(migrationFile);
        // Write logical ID mapping
        const logicalIdMapFile = path.join(outputDir, 'logical-id-map.json');
        await this.serializer.writeToFile(artifact.logicalIdMap, logicalIdMapFile);
        writtenFiles.push(logicalIdMapFile);
        // Write migration report as Markdown
        const reportFile = path.join(outputDir, 'MIGRATION_REPORT.md');
        const reportContent = this.generateMigrationReportMarkdown(artifact.report);
        await fs.promises.writeFile(reportFile, reportContent, 'utf8');
        writtenFiles.push(reportFile);
        // Write component migration results
        for (const component of artifact.components) {
            const componentFile = path.join(outputDir, 'components', `${component.componentId}.json`);
            await fs.promises.mkdir(path.dirname(componentFile), { recursive: true });
            await this.serializer.writeToFile(component, componentFile);
            writtenFiles.push(componentFile);
        }
        // Write service manifest
        if (artifact.artifacts.serviceManifest) {
            const manifestFile = path.join(outputDir, 'service.yml');
            await fs.promises.copyFile(artifact.artifacts.serviceManifest, manifestFile);
            writtenFiles.push(manifestFile);
        }
        // Write patches file
        if (artifact.artifacts.patchesFile) {
            const patchesFile = path.join(outputDir, 'patches.ts');
            await fs.promises.copyFile(artifact.artifacts.patchesFile, patchesFile);
            writtenFiles.push(patchesFile);
        }
        return writtenFiles;
    }
    generateMigrationReportMarkdown(report) {
        let markdown = `# Migration Report\n\n`;
        markdown += `Generated: ${new Date().toISOString()}\n\n`;
        // Summary
        markdown += `## Summary\n\n`;
        markdown += `- **Total Resources**: ${report.summary.totalResources}\n`;
        markdown += `- **Mapped Resources**: ${report.summary.mappedResources}\n`;
        markdown += `- **Unmapped Resources**: ${report.summary.unmappedResources}\n`;
        markdown += `- **Components Created**: ${report.summary.componentsCreated}\n`;
        markdown += `- **Manual Patches Required**: ${report.summary.manualPatchesRequired}\n`;
        markdown += `- **Drift Detected**: ${report.summary.driftDetected ? 'Yes' : 'No'}\n\n`;
        // Components
        markdown += `## Components\n\n`;
        for (const component of report.components) {
            markdown += `### ${component.componentId}\n`;
            markdown += `- **Type**: ${component.componentType}\n`;
            markdown += `- **Status**: ${component.status}\n`;
            markdown += `- **Original Resources**: ${component.originalResources.length}\n`;
            markdown += `- **Mapped Resources**: ${component.mappedResources.length}\n`;
            markdown += `- **Unmapped Resources**: ${component.unmappedResources.length}\n\n`;
            if (component.unmappedResources.length > 0) {
                markdown += `#### Unmapped Resources\n`;
                for (const resource of component.unmappedResources) {
                    markdown += `- **${resource.logicalId}** (${resource.type}): ${resource.reason}\n`;
                }
                markdown += `\n`;
            }
        }
        // Manual Patches
        if (report.manualPatches.length > 0) {
            markdown += `## Manual Patches Required\n\n`;
            for (const patch of report.manualPatches) {
                markdown += `### ${patch.componentId} - ${patch.priority.toUpperCase()}\n`;
                markdown += `${patch.description}\n\n`;
                markdown += `\`\`\`typescript\n${patch.code}\n\`\`\`\n\n`;
            }
        }
        // Drift Check
        markdown += `## Drift Check\n\n`;
        markdown += `- **Has Drift**: ${report.driftCheck.hasDrift ? 'Yes' : 'No'}\n`;
        markdown += `- **Empty Diff**: ${report.driftCheck.emptyDiff ? 'Yes' : 'No'}\n\n`;
        if (report.driftCheck.driftDetails.length > 0) {
            markdown += `### Drift Details\n\n`;
            for (const drift of report.driftCheck.driftDetails) {
                markdown += `- **${drift.resourceLogicalId}**: ${drift.property} - ${drift.reason}\n`;
            }
            markdown += `\n`;
        }
        // Recommendations
        if (report.recommendations.length > 0) {
            markdown += `## Recommendations\n\n`;
            for (const recommendation of report.recommendations) {
                markdown += `- ${recommendation}\n`;
            }
            markdown += `\n`;
        }
        return markdown;
    }
}
//# sourceMappingURL=artifact-writer.js.map