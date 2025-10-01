import { randomUUID } from 'crypto';
import { Logger as PlatformLogger } from '@platform/logger';
/**
 * CLI logger that extends the platform structured logger to provide
 * ergonomic helpers used by the existing commands (e.g. `success`).
 */
export class Logger extends PlatformLogger {
    instanceId = randomUUID();
    capturedLogs = [];
    verbose = false;
    ci = false;
    constructor(name = 'shinobi.cli') {
        super(name);
    }
    configure(config) {
        this.verbose = !!config.verbose;
        this.ci = !!config.ci;
        PlatformLogger.setGlobalContext({
            service: {
                name: config.serviceName ?? 'shinobi-cli',
                version: process.env.SHINOBI_CLI_VERSION ?? process.env.SVC_VERSION ?? '0.1.0',
                instance: `cli-${this.instanceId}`
            },
            environment: {
                name: config.environment ?? (this.ci ? 'ci' : 'local'),
                region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
                compliance: config.compliance ?? 'commercial'
            }
        });
    }
    info(message, options) {
        this.capture('INFO', message, options?.data);
        super.info(message, options);
    }
    success(message, data) {
        this.capture('SUCCESS', message, data);
        super.info(message, this.buildOptions({ status: 'success', ...toObject(data) }));
    }
    warn(message, options) {
        this.capture('WARN', message, options?.data);
        super.warn(message, options);
    }
    error(message, error, options) {
        this.capture('ERROR', message, error);
        super.error(message, error, options);
    }
    debug(message, options) {
        if (!this.verbose) {
            return;
        }
        this.capture('DEBUG', message, options?.data);
        super.debug(message, options);
    }
    trace(message, options) {
        if (!this.verbose) {
            return;
        }
        this.capture('TRACE', message, options?.data);
        super.trace(message, options);
    }
    isDebugEnabled() {
        return this.verbose && super.isDebugEnabled();
    }
    isTraceEnabled() {
        return this.verbose && super.isTraceEnabled();
    }
    startTimer() {
        return super.startTimer();
    }
    async flush() {
        await super.flush();
    }
    getLogs() {
        return [...this.capturedLogs];
    }
    capture(level, message, data) {
        this.capturedLogs.push({
            level,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }
    buildOptions(data) {
        const normalized = toObject(data);
        return normalized ? { data: normalized } : undefined;
    }
}
function toObject(data) {
    if (data === undefined || data === null) {
        return undefined;
    }
    if (typeof data === 'object') {
        return data;
    }
    return { value: data };
}
