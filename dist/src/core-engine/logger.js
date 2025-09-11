"use strict";
/**
 * Enterprise-grade logger for the CDK Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["SUCCESS"] = 4] = "SUCCESS";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    logLevel;
    logs = [];
    constructor(logLevel = LogLevel.INFO) {
        this.logLevel = logLevel;
    }
    debug(message, data) {
        this.log(LogLevel.DEBUG, message, data);
    }
    info(message, data) {
        this.log(LogLevel.INFO, message, data);
    }
    warn(message, data) {
        this.log(LogLevel.WARN, message, data);
    }
    error(message, data) {
        this.log(LogLevel.ERROR, message, data);
    }
    success(message, data) {
        this.log(LogLevel.SUCCESS, message, data);
    }
    log(level, message, data) {
        if (level < this.logLevel) {
            return;
        }
        const logEntry = {
            timestamp: new Date(),
            level,
            message,
            data
        };
        this.logs.push(logEntry);
        // Console output with colors
        const timestamp = logEntry.timestamp.toISOString();
        const prefix = this.getLevelPrefix(level);
        if (data) {
            console.log(`${timestamp} ${prefix} ${message}`, data);
        }
        else {
            console.log(`${timestamp} ${prefix} ${message}`);
        }
    }
    getLevelPrefix(level) {
        switch (level) {
            case LogLevel.DEBUG:
                return '[DEBUG]';
            case LogLevel.INFO:
                return '[INFO] ';
            case LogLevel.WARN:
                return '[WARN] ';
            case LogLevel.ERROR:
                return '[ERROR]';
            case LogLevel.SUCCESS:
                return '[SUCCESS]';
            default:
                return '[UNKNOWN]';
        }
    }
    getLogs() {
        return [...this.logs];
    }
    clear() {
        this.logs = [];
    }
}
exports.Logger = Logger;
