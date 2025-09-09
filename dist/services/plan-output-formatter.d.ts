/**
 * Plan Output Formatter Service
 * Responsible for rendering synthesis results into user-friendly summaries
 */
import { Logger } from '../utils/logger';
export interface PlanOutputFormatterDependencies {
    logger: Logger;
}
export interface FormatterInput {
    synthesisResult: any;
    cdkDiff?: any;
    buildSummary?: any;
    cdkNagReport?: any;
    environment: string;
    complianceFramework: string;
}
export interface FormattedOutput {
    userFriendlySummary: string;
    structuredData: any;
    recommendations: string[];
    warnings: string[];
}
/**
 * Service for formatting and rendering plan outputs
 */
export declare class PlanOutputFormatter {
    private dependencies;
    constructor(dependencies: PlanOutputFormatterDependencies);
    /**
     * Format synthesis results into comprehensive user-friendly output
     */
    formatPlanOutput(input: FormatterInput): FormattedOutput;
    /**
     * Build comprehensive user-friendly summary
     */
    private buildUserFriendlySummary;
    /**
     * Build structured data for programmatic access
     */
    private buildStructuredData;
    /**
     * Generate framework-specific recommendations
     */
    private generateRecommendations;
    /**
     * Collect warnings from various sources
     */
    private collectWarnings;
    /**
     * Check for resources that should be encrypted in compliance frameworks
     */
    private checkForUnencryptedResources;
}
