"use strict";
/**
 * Logger utility re-export for CLI compatibility
 * This maintains backward compatibility for CLI commands
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
var console_logger_1 = require("../console-logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return console_logger_1.Logger; } });
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return console_logger_1.logger; } });
