/**
 * Artifact Writer Service
 *
 * Handles writing CLI command artifacts to files with proper organization
 * and structured output for CI/CD integration and auditing.
 */
import { PlanArtifact, DeploymentArtifact, MigrationArtifact, ArtifactWriter } from '../contracts/artifacts';
export declare class StandardArtifactWriter implements ArtifactWriter {
    private serializer;
    writePlanArtifact(artifact: PlanArtifact, outputDir: string): Promise<string[]>;
    writeDeploymentArtifact(artifact: DeploymentArtifact, outputDir: string): Promise<string[]>;
    writeMigrationArtifact(artifact: MigrationArtifact, outputDir: string): Promise<string[]>;
    private generateMigrationReportMarkdown;
}
//# sourceMappingURL=artifact-writer.d.ts.map