"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
class Logger {
    constructor() {
        this.config = { verbose: false, ci: false };
    }
    configure(config) {
        this.config = config;
    }
    info(message, data) {
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
}
exports.logger = new Logger();
