"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
class Logger {
    constructor() {
        this.config = { verbose: false, ci: false };
        // Enhanced methods for migration tool
        this.logs = [];
    }
    configure(config) {
        this.config = config;
    }
    info(message, data) {
        this.addToLogs('info', message, data);
        if (this.config.ci) {
            console.log(JSON.stringify({
                level: 'info',
                message,
                data,
                timestamp: new Date().toISOString()
            }));
        }
        else {
            console.log(chalk_1.default.blue('ℹ'), message);
            if (data && this.config.verbose) {
                console.log(chalk_1.default.gray(JSON.stringify(data, null, 2)));
            }
        }
    }
    success(message, data) {
        this.addToLogs('success', message, data);
        if (this.config.ci) {
            console.log(JSON.stringify({
                level: 'success',
                message,
                data,
                timestamp: new Date().toISOString()
            }));
        }
        else {
            console.log(chalk_1.default.green('✓'), message);
            if (data && this.config.verbose) {
                console.log(chalk_1.default.gray(JSON.stringify(data, null, 2)));
            }
        }
    }
    warn(message, data) {
        this.addToLogs('warn', message, data);
        if (this.config.ci) {
            console.log(JSON.stringify({
                level: 'warn',
                message,
                data,
                timestamp: new Date().toISOString()
            }));
        }
        else {
            console.warn(chalk_1.default.yellow('⚠'), message);
            if (data && this.config.verbose) {
                console.warn(chalk_1.default.gray(JSON.stringify(data, null, 2)));
            }
        }
    }
    error(message, error) {
        const errorData = error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error;
        this.addToLogs('error', message, errorData);
        if (this.config.ci) {
            console.error(JSON.stringify({
                level: 'error',
                message,
                error: errorData,
                timestamp: new Date().toISOString()
            }));
        }
        else {
            console.error(chalk_1.default.red('✗'), message);
            if (error && this.config.verbose) {
                console.error(chalk_1.default.gray(error instanceof Error ? error.stack : JSON.stringify(errorData, null, 2)));
            }
        }
    }
    debug(message, data) {
        if (!this.config.verbose)
            return;
        if (this.config.ci) {
            console.log(JSON.stringify({
                level: 'debug',
                message,
                data,
                timestamp: new Date().toISOString()
            }));
        }
        else {
            console.log(chalk_1.default.gray('🔍'), chalk_1.default.gray(message));
            if (data) {
                console.log(chalk_1.default.gray(JSON.stringify(data, null, 2)));
            }
        }
    }
    getLogs() {
        return this.logs.map(log => ({
            level: this.getLevelNumber(log.level),
            message: log.message,
            data: log.data,
            timestamp: log.timestamp
        }));
    }
    getLevelNumber(level) {
        const levels = {
            'debug': 0,
            'info': 1,
            'warn': 2,
            'error': 3,
            'success': 4
        };
        return levels[level] || 1;
    }
    addToLogs(level, message, data) {
        this.logs.push({
            level,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }
}
exports.Logger = Logger;
// Legacy singleton export - deprecated, use dependency injection instead
exports.logger = new Logger();
