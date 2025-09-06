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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationPipeline = void 0;
const fs = __importStar(require("fs/promises"));
const YAML = __importStar(require("yaml"));
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const logger_1 = require("../utils/logger");
const schema_manager_1 = require("../schemas/schema-manager");
class ValidationPipeline {
    constructor() {
        this.ajv = new ajv_1.default({ allErrors: true, verbose: true });
        (0, ajv_formats_1.default)(this.ajv);
        this.schemaManager = new schema_manager_1.SchemaManager();
    }
    /**
     * Stage 1-2: Parse and validate manifest (AC-P1.1, AC-P1.2, AC-P2.1, AC-P2.2, AC-P2.3)
     */
    async validate(manifestPath) {
        logger_1.logger.debug('Starting validation pipeline');
        // Stage 1: Parsing (AC-P1.1, AC-P1.2)
        const manifest = await this.parseManifest(manifestPath);
        // Stage 2: Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)
        await this.validateSchema(manifest);
        const warnings = [];
        return {
            manifest,
            warnings
        };
    }
    /**
     * Full pipeline: Parse, validate, hydrate, and resolve references (all 4 stages)
     */
    async plan(manifestPath, environment) {
        logger_1.logger.debug('Starting full plan pipeline');
        // Stages 1-2: Parse and validate
        const validationResult = await this.validate(manifestPath);
        // Stage 3: Context Hydration (AC-P3.1, AC-P3.2, AC-P3.3)
        const hydratedManifest = await this.hydrateContext(validationResult.manifest, environment);
        // Stage 4: Semantic & Reference Validation (AC-P4.1, AC-P4.2, AC-P4.3)
        await this.validateReferences(hydratedManifest);
        return {
            resolvedManifest: hydratedManifest,
            warnings: validationResult.warnings
        };
    }
    async parseManifest(manifestPath) {
        logger_1.logger.debug(`Parsing manifest: ${manifestPath}`);
        try {
            const fileContent = await fs.readFile(manifestPath, 'utf8');
            const manifest = YAML.parse(fileContent);
            if (!manifest || typeof manifest !== 'object') {
                throw new Error('Invalid YAML: manifest must be an object');
            }
            logger_1.logger.debug('Manifest parsed successfully');
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
    async validateSchema(manifest) {
        logger_1.logger.debug('Validating manifest schema');
        // Get the master schema (dynamically composed)
        const schema = await this.schemaManager.getMasterSchema();
        const validate = this.ajv.compile(schema);
        const valid = validate(manifest);
        if (!valid) {
            const errors = validate.errors || [];
            const errorMessages = errors.map(error => {
                const path = error.instancePath || error.schemaPath || 'root';
                const message = error.message || 'validation failed';
                const data = error.data !== undefined ? ` (found: ${JSON.stringify(error.data)})` : '';
                return `  ${path}: ${message}${data}`;
            });
            const errorMsg = `Schema validation failed:\n${errorMessages.join('\n')}`;
            logger_1.logger.debug('Schema validation errors', errors);
            throw new Error(errorMsg);
        }
        // Validate required fields for AC-E1 (missing complianceFramework, etc.)
        const manifestObj = manifest;
        if (!manifestObj.service) {
            throw new Error('Missing required field: service');
        }
        if (!manifestObj.owner) {
            throw new Error('Missing required field: owner');
        }
        logger_1.logger.debug('Schema validation completed successfully');
    }
    async hydrateContext(manifest, environment) {
        logger_1.logger.debug(`Hydrating context for environment: ${environment}`);
        // Deep clone the manifest to avoid mutations
        const hydrated = JSON.parse(JSON.stringify(manifest));
        // Set defaults for complianceFramework if not specified
        if (!hydrated.complianceFramework) {
            hydrated.complianceFramework = 'commercial';
        }
        // Process environment-specific values
        if (hydrated.environments && hydrated.environments[environment]) {
            const envDefaults = hydrated.environments[environment].defaults || {};
            // Apply environment interpolation throughout the manifest
            this.interpolateEnvironmentValues(hydrated, envDefaults, environment);
        }
        logger_1.logger.debug('Context hydration completed');
        return hydrated;
    }
    interpolateEnvironmentValues(obj, envDefaults, environment) {
        if (typeof obj === 'string') {
            return; // Strings are processed by reference in parent object
        }
        if (Array.isArray(obj)) {
            obj.forEach(item => this.interpolateEnvironmentValues(item, envDefaults, environment));
            return;
        }
        if (obj && typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string') {
                    // Process ${env:key} interpolation
                    const envMatch = value.match(/\\$\\{env:([^}]+)\\}/g);
                    if (envMatch) {
                        let interpolated = value;
                        envMatch.forEach(match => {
                            const envKey = match.slice(6, -1); // Remove ${env: and }
                            if (envDefaults[envKey] !== undefined) {
                                interpolated = interpolated.replace(match, String(envDefaults[envKey]));
                            }
                        });
                        obj[key] = interpolated;
                    }
                    // Process ${envIs:env} boolean interpolation
                    const envIsMatch = value.match(/\\$\\{envIs:([^}]+)\\}/);
                    if (envIsMatch) {
                        const targetEnv = envIsMatch[1];
                        obj[key] = environment === targetEnv;
                    }
                }
                else if (value && typeof value === 'object') {
                    // Handle per-environment maps
                    const envValue = value[environment];
                    if (envValue !== undefined) {
                        obj[key] = envValue;
                    }
                    else {
                        this.interpolateEnvironmentValues(value, envDefaults, environment);
                    }
                }
            }
        }
    }
    async validateReferences(manifest) {
        logger_1.logger.debug('Validating references and semantic rules');
        // Build component name index
        const componentNames = new Set();
        if (manifest.components) {
            manifest.components.forEach((component) => {
                if (component.name) {
                    componentNames.add(component.name);
                }
            });
        }
        // Validate binds references (AC-P4.2)
        if (manifest.components) {
            manifest.components.forEach((component, index) => {
                if (component.binds) {
                    component.binds.forEach((bind, bindIndex) => {
                        if (bind.to && !componentNames.has(bind.to)) {
                            throw new Error(`Reference to non-existent component '${bind.to}' in components[${index}].binds[${bindIndex}]`);
                        }
                    });
                }
            });
        }
        // Validate governance suppressions (AC-P4.3)
        if (manifest.governance?.cdkNag?.suppress) {
            manifest.governance.cdkNag.suppress.forEach((suppression, index) => {
                const requiredFields = ['id', 'justification', 'owner', 'expiresOn'];
                requiredFields.forEach(field => {
                    if (!suppression[field]) {
                        throw new Error(`Missing required field '${field}' in governance.cdkNag.suppress[${index}]`);
                    }
                });
                // Validate expiresOn format
                if (suppression.expiresOn && !isValidDate(suppression.expiresOn)) {
                    throw new Error(`Invalid date format for expiresOn in governance.cdkNag.suppress[${index}]. Expected ISO date format.`);
                }
            });
        }
        logger_1.logger.debug('Reference validation completed');
    }
}
exports.ValidationPipeline = ValidationPipeline;
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}
