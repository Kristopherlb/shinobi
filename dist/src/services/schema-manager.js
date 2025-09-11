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
exports.SchemaManager = void 0;
const index_1 = require("../platform/logger/src/index");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class SchemaManager {
    logger;
    constructor() {
        this.logger = new index_1.Logger('SchemaManager');
    }
    /**
     * Get the base schema for manifest validation (AC-P2.2)
     *
     * This service has a single responsibility: to load and provide the authoritative
     * base schema from the version-controlled JSON file. Dynamic schema composition
     * (merging component-specific schemas) is handled by the SchemaValidator service.
     */
    async getBaseSchema() {
        this.logger.debug('Loading base service manifest schema');
        // Load the authoritative JSON schema
        const schemaPath = path.resolve(__dirname, 'service-manifest.schema.json');
        const schemaContent = await fs.readFile(schemaPath, 'utf8');
        const baseSchema = JSON.parse(schemaContent);
        this.logger.debug('Base schema loaded successfully');
        return baseSchema;
    }
}
exports.SchemaManager = SchemaManager;
