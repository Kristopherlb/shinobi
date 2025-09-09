"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStackManager = void 0;
exports.registerLocalCommands = registerLocalCommands;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const yaml = __importStar(require("js-yaml"));
/**
 * LocalStack Environment Manager
 */
class LocalStackManager {
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.dockerComposeFile = path.join(projectRoot, 'docker-compose.localstack.yml');
        // Extract service name from service.yml or use directory name
        try {
            const serviceManifestPath = path.join(projectRoot, 'service.yml');
            if (fs.existsSync(serviceManifestPath)) {
                const manifest = yaml.load(fs.readFileSync(serviceManifestPath, 'utf8'));
                this.serviceName = manifest.service;
            }
            else {
                this.serviceName = path.basename(projectRoot);
            }
        }
        catch (error) {
            this.serviceName = path.basename(projectRoot);
        }
    }
    /**
     * Start LocalStack environment
     */
    async up(options = {}) {
        console.log('🚀 Starting LocalStack environment...');
        try {
            // Parse service.yml and find localstack-environment component
            const config = await this.getLocalStackConfig();
            // Generate docker-compose.yml
            await this.generateDockerCompose(config);
            console.log('📝 Generated docker-compose configuration');
            // Start LocalStack container
            const command = `docker-compose -f ${this.dockerComposeFile} up ${options.detach ? '-d' : ''}`;
            if (options.detach) {
                (0, child_process_1.execSync)(command, { stdio: 'inherit' });
                console.log('🌩️  LocalStack started in background');
                // Wait for services to be ready
                await this.waitForServices(config.services);
                if (options.logs) {
                    this.showLogs();
                }
            }
            else {
                (0, child_process_1.execSync)(command, { stdio: 'inherit' });
            }
        }
        catch (error) {
            console.error('❌ Failed to start LocalStack:', error);
            throw error;
        }
    }
    /**
     * Stop LocalStack environment
     */
    async down() {
        console.log('🛑 Stopping LocalStack environment...');
        try {
            if (!fs.existsSync(this.dockerComposeFile)) {
                console.log('ℹ️  No LocalStack environment found');
                return;
            }
            (0, child_process_1.execSync)(`docker-compose -f ${this.dockerComposeFile} down -v`, { stdio: 'inherit' });
            // Clean up generated file
            fs.unlinkSync(this.dockerComposeFile);
            console.log('✅ LocalStack environment stopped and cleaned up');
        }
        catch (error) {
            console.error('❌ Failed to stop LocalStack:', error);
            throw error;
        }
    }
    /**
     * Check LocalStack environment status
     */
    async status() {
        try {
            if (!fs.existsSync(this.dockerComposeFile)) {
                console.log('❌ LocalStack environment not configured');
                return;
            }
            const result = (0, child_process_1.execSync)(`docker-compose -f ${this.dockerComposeFile} ps`, { encoding: 'utf8' });
            console.log('📊 LocalStack Environment Status:');
            console.log(result);
            // Check service health
            await this.checkServiceHealth();
        }
        catch (error) {
            console.log('❌ LocalStack environment not running');
        }
    }
    /**
     * Show LocalStack container logs
     */
    showLogs(follow = false) {
        try {
            if (!fs.existsSync(this.dockerComposeFile)) {
                console.log('❌ LocalStack environment not configured');
                return;
            }
            const command = `docker-compose -f ${this.dockerComposeFile} logs ${follow ? '-f' : ''}`;
            (0, child_process_1.execSync)(command, { stdio: 'inherit' });
        }
        catch (error) {
            console.error('❌ Failed to show logs:', error);
        }
    }
    /**
     * Get LocalStack configuration from service.yml
     */
    async getLocalStackConfig() {
        const serviceManifestPath = path.join(this.projectRoot, 'service.yml');
        if (!fs.existsSync(serviceManifestPath)) {
            throw new Error('service.yml not found. Please ensure you are in a service directory.');
        }
        const manifest = yaml.load(fs.readFileSync(serviceManifestPath, 'utf8'));
        // Find localstack-environment component
        const localStackComponent = manifest.components?.find((component) => component.type === 'localstack-environment');
        if (!localStackComponent) {
            throw new Error('No localstack-environment component found in service.yml');
        }
        return localStackComponent.config;
    }
    /**
     * Generate docker-compose.yml file
     */
    async generateDockerCompose(config) {
        const networkName = config.docker?.network || 'localstack-network';
        const containerName = config.docker?.containerName || 'localstack-main';
        const isProEnabled = config.localstack?.pro || false;
        const imageTag = config.localstack?.tag || 'latest';
        const image = isProEnabled
            ? `localstack/localstack-pro:${imageTag}`
            : `localstack/localstack:${imageTag}`;
        const services = config.services.join(',');
        // Base environment variables
        const environment = {
            SERVICES: services,
            EDGE_PORT: 4566,
            HOST_TMP_FOLDER: '${TMPDIR:-/tmp/}localstack',
            DOCKER_HOST: 'unix:///var/run/docker.sock',
            ...config.localstack?.environment
        };
        // Add Pro-specific configuration
        if (isProEnabled) {
            environment.LOCALSTACK_API_KEY = '${LOCALSTACK_API_KEY:-}';
        }
        // Port mappings
        const ports = ['4566:4566'];
        if (config.localstack?.ports) {
            Object.entries(config.localstack.ports).forEach(([service, port]) => {
                if (service !== 'edge') {
                    ports.push(`${port}:${port}`);
                }
            });
        }
        const dockerCompose = {
            version: '3.8',
            services: {
                localstack: {
                    container_name: containerName,
                    image: image,
                    ports: ports,
                    environment: environment,
                    volumes: [
                        '/var/run/docker.sock:/var/run/docker.sock',
                        '${TMPDIR:-/tmp/}localstack:/var/lib/localstack',
                        '${PWD}:/workspace'
                    ],
                    networks: [networkName]
                }
            },
            networks: {
                [networkName]: {
                    driver: 'bridge'
                }
            }
        };
        // Add resource limits if specified
        if (config.docker?.resources) {
            dockerCompose.services.localstack.deploy = {
                resources: {
                    limits: {
                        memory: config.docker.resources.memory || '2g',
                        cpus: config.docker.resources.cpus || '2.0'
                    }
                }
            };
        }
        // Write docker-compose file
        const yamlContent = yaml.dump(dockerCompose, { indent: 2 });
        fs.writeFileSync(this.dockerComposeFile, yamlContent);
    }
    /**
     * Wait for LocalStack services to be ready
     */
    async waitForServices(services, maxWaitTime = 60000) {
        console.log('⏳ Waiting for LocalStack services to be ready...');
        const startTime = Date.now();
        const endpoint = 'http://localhost:4566';
        while (Date.now() - startTime < maxWaitTime) {
            try {
                // Check LocalStack health endpoint
                const healthCheck = (0, child_process_1.execSync)(`curl -s ${endpoint}/_localstack/health`, { encoding: 'utf8' });
                const health = JSON.parse(healthCheck);
                const readyServices = Object.keys(health.services).filter(service => health.services[service] === 'available' || health.services[service] === 'running');
                const requiredServicesReady = services.every(service => readyServices.some(ready => ready.toLowerCase().includes(service.toLowerCase())));
                if (requiredServicesReady) {
                    console.log('✅ All LocalStack services are ready!');
                    console.log(`📡 LocalStack endpoint: ${endpoint}`);
                    return;
                }
                console.log(`⏳ Waiting for services: ${services.filter(s => !readyServices.some(ready => ready.toLowerCase().includes(s.toLowerCase()))).join(', ')}`);
            }
            catch (error) {
                // LocalStack not ready yet
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.warn('⚠️  Timeout waiting for LocalStack services. Some services may not be ready.');
    }
    /**
     * Check service health status
     */
    async checkServiceHealth() {
        try {
            const healthCheck = (0, child_process_1.execSync)('curl -s http://localhost:4566/_localstack/health', { encoding: 'utf8' });
            const health = JSON.parse(healthCheck);
            console.log('🏥 Service Health:');
            Object.entries(health.services).forEach(([service, status]) => {
                const icon = status === 'available' || status === 'running' ? '✅' : '❌';
                console.log(`  ${icon} ${service}: ${status}`);
            });
        }
        catch (error) {
            console.log('❌ Unable to check service health - LocalStack may not be running');
        }
    }
}
exports.LocalStackManager = LocalStackManager;
/**
 * Register CLI commands
 */
function registerLocalCommands(program) {
    const localCommand = program
        .command('local')
        .description('Manage ephemeral LocalStack development environment');
    // svc local up
    localCommand
        .command('up')
        .description('Start LocalStack development environment')
        .option('-d, --detach', 'Run in background (detached mode)', false)
        .option('--logs', 'Show logs after starting in detached mode', false)
        .action(async (options) => {
        const manager = new LocalStackManager();
        await manager.up({ detach: options.detach, logs: options.logs });
    });
    // svc local down
    localCommand
        .command('down')
        .description('Stop LocalStack development environment')
        .action(async () => {
        const manager = new LocalStackManager();
        await manager.down();
    });
    // svc local status
    localCommand
        .command('status')
        .description('Check LocalStack environment status')
        .action(async () => {
        const manager = new LocalStackManager();
        await manager.status();
    });
    // svc local logs
    localCommand
        .command('logs')
        .description('View LocalStack container logs')
        .option('-f, --follow', 'Follow log output', false)
        .action((options) => {
        const manager = new LocalStackManager();
        manager.showLogs(options.follow);
    });
}
