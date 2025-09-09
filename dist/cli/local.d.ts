/**
 * Local Development Environment CLI Commands
 *
 * Provides commands for managing ephemeral LocalStack environments for local development.
 *
 * Commands:
 * - svc local up: Start LocalStack environment
 * - svc local down: Stop LocalStack environment
 * - svc local status: Check LocalStack environment status
 * - svc local logs: View LocalStack container logs
 */
import { Command } from 'commander';
/**
 * LocalStack Environment Manager
 */
export declare class LocalStackManager {
    private dockerComposeFile;
    private projectRoot;
    private serviceName;
    constructor(projectRoot?: string);
    /**
     * Start LocalStack environment
     */
    up(options?: {
        detach?: boolean;
        logs?: boolean;
    }): Promise<void>;
    /**
     * Stop LocalStack environment
     */
    down(): Promise<void>;
    /**
     * Check LocalStack environment status
     */
    status(): Promise<void>;
    /**
     * Show LocalStack container logs
     */
    showLogs(follow?: boolean): void;
    /**
     * Get LocalStack configuration from service.yml
     */
    private getLocalStackConfig;
    /**
     * Generate docker-compose.yml file
     */
    private generateDockerCompose;
    /**
     * Wait for LocalStack services to be ready
     */
    private waitForServices;
    /**
     * Check service health status
     */
    private checkServiceHealth;
}
/**
 * Register CLI commands
 */
export declare function registerLocalCommands(program: Command): void;
