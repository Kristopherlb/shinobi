"use strict";
/**
 * FileDiscovery utility re-export for CLI compatibility
 * This maintains backward compatibility for CLI commands
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDiscovery = void 0;
var file_discovery_1 = require("../../services/file-discovery");
Object.defineProperty(exports, "FileDiscovery", { enumerable: true, get: function () { return file_discovery_1.FileDiscovery; } });
