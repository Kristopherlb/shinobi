export interface ProjectInputs {
    name: string;
    owner: string;
    framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
    pattern: 'empty' | 'lambda-api-with-db' | 'worker-with-queue';
}
export declare class TemplateEngine {
    /**
     * Generate project files based on user inputs (AC-SI-2)
     */
    generateProject(inputs: ProjectInputs): Promise<void>;
    private generateServiceManifest;
    private generateGitignore;
    private generateSourceFiles;
    private generatePatchesStub;
    private getServiceTemplate;
    private generateApiLambdaFiles;
    private generateWorkerFiles;
    private generateBasicHandler;
}
