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
exports.ConfigLoader = void 0;
/**
 * Configuration Loader Utility - Principle 6: Separate Data from Logic
 * Implements Principle 7: Clear Class Roles - This is a "Stateless Utility"
 */
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const YAML = __importStar(require("yaml"));
/**
 * Pure utility for loading externalized configuration
 * Role: Stateless Utility - No dependencies, only static behavior
 */
class ConfigLoader {
    static _templateConfig = null;
    /**
     * Load template configuration from external YAML file
     * Implements caching to avoid repeated file I/O
     */
    static async getTemplateConfig() {
        if (this._templateConfig) {
            return this._templateConfig;
        }
        const configPath = path.join(__dirname, '../../config/templates.yaml');
        try {
            const configContent = await fs.readFile(configPath, 'utf8');
            this._templateConfig = YAML.parse(configContent);
            return this._templateConfig;
        }
        catch (error) {
            throw new Error(`Failed to load template configuration from ${configPath}: ${error}`);
        }
    }
    /**
     * Reset cached configuration (useful for testing)
     */
    static resetCache() {
        this._templateConfig = null;
    }
}
exports.ConfigLoader = ConfigLoader;
