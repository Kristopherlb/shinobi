"use strict";
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
exports.FileDiscovery = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
class FileDiscovery {
    /**
     * Discover service.yml by searching from current directory upwards to git root
     * FR-CLI-2: Configuration Discovery
     */
    async findManifest(startDir = '.') {
        logger_1.logger.debug(`Searching for service.yml starting from: ${startDir}`);
        let currentDir = path.resolve(startDir);
        const root = path.parse(currentDir).root;
        while (currentDir !== root) {
            const manifestPath = path.join(currentDir, 'service.yml');
            try {
                await fs.access(manifestPath);
                logger_1.logger.debug(`Found manifest at: ${manifestPath}`);
                return manifestPath;
            }
            catch {
                // File doesn't exist, continue searching
            }
            // Check if we've reached a git repository root
            try {
                await fs.access(path.join(currentDir, '.git'));
                logger_1.logger.debug(`Reached git repository root at: ${currentDir}`);
                break;
            }
            catch {
                // Not a git root, continue up
            }
            currentDir = path.dirname(currentDir);
        }
        // If the loop finishes, no manifest was found up to the root
        logger_1.logger.debug('No service.yml found in directory tree');
        return null;
    }
    /**
     * Check if a service.yml file exists at the given path
     */
    async manifestExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.FileDiscovery = FileDiscovery;
