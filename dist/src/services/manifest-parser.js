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
exports.ManifestParser = void 0;
/**
 * Manifest Parser Service - Single responsibility for YAML parsing
 * Implements Principle 4: Single Responsibility Principle
 */
const fs = __importStar(require("fs/promises"));
const YAML = __importStar(require("yaml"));
/**
 * Pure service for parsing YAML manifests
 * Responsibility: Stage 1 - Parsing (AC-P1.1, AC-P1.2)
 */
class ManifestParser {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async parseManifest(manifestPath) {
        this.dependencies.logger.debug(`Parsing manifest: ${manifestPath}`);
        try {
            const fileContent = await fs.readFile(manifestPath, 'utf8');
            const manifest = YAML.parse(fileContent);
            if (!manifest || typeof manifest !== 'object') {
                throw new Error('Invalid YAML: manifest must be an object');
            }
            this.dependencies.logger.debug('Manifest parsed successfully');
            return manifest;
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('YAML')) {
                    throw new Error(`Invalid YAML syntax: ${error.message}`);
                }
                throw new Error(`Failed to read manifest: ${error.message}`);
            }
            throw error;
        }
    }
}
exports.ManifestParser = ManifestParser;
