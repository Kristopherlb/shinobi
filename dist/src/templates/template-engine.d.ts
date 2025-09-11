import { Logger } from '../utils/logger';
export interface ProjectInputs {
    name: string;
    owner: string;
    framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
    pattern: string;
}
interface TemplateEngineDependencies {
    logger: Logger;
}
export declare class TemplateEngine {
    private dependencies;
    constructor(dependencies: TemplateEngineDependencies);
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
export {};
