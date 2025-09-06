/**
 * Chain of Responsibility Pattern Implementation
 * Multi-stage validation pipeline with clean handler separation
 */

import { Logger } from '../utils/logger';

export interface ValidationRequest {
  manifestPath: string;
  environment?: string;
  data?: any;
  metadata?: Record<string, any>;
}

export interface ValidationResponse {
  success: boolean;
  data?: any;
  warnings: string[];
  errors: string[];
  stage: string;
}

/**
 * Abstract handler in the chain of responsibility
 */
export abstract class ValidationHandler {
  private nextHandler: ValidationHandler | null = null;

  setNext(handler: ValidationHandler): ValidationHandler {
    this.nextHandler = handler;
    return handler;
  }

  async handle(request: ValidationRequest): Promise<ValidationResponse> {
    const response = await this.process(request);
    
    if (!response.success || this.nextHandler === null) {
      return response;
    }

    // Pass the result to the next handler in the chain
    const nextRequest: ValidationRequest = {
      ...request,
      data: response.data,
      metadata: { ...request.metadata, [`${response.stage}_result`]: response }
    };

    const nextResponse = await this.nextHandler.handle(nextRequest);
    
    // Combine warnings from this stage and subsequent stages
    return {
      ...nextResponse,
      warnings: [...response.warnings, ...nextResponse.warnings]
    };
  }

  protected abstract process(request: ValidationRequest): Promise<ValidationResponse>;
}

/**
 * Stage 1: YAML Parsing Handler
 */
export class YamlParsingHandler extends ValidationHandler {
  constructor(private logger: Logger) {
    super();
  }

  protected async process(request: ValidationRequest): Promise<ValidationResponse> {
    this.logger.debug(`Stage 1: Parsing manifest ${request.manifestPath}`);
    
    try {
      const fs = await import('fs/promises');
      const YAML = await import('yaml');
      
      const fileContent = await fs.readFile(request.manifestPath, 'utf8');
      const manifest = YAML.parse(fileContent);
      
      if (!manifest || typeof manifest !== 'object') {
        return {
          success: false,
          errors: ['Invalid YAML: manifest must be an object'],
          warnings: [],
          stage: 'parsing'
        };
      }

      this.logger.debug('YAML parsing completed successfully');
      
      return {
        success: true,
        data: manifest,
        warnings: [],
        errors: [],
        stage: 'parsing'
      };

    } catch (error) {
      let errorMessage = 'Failed to parse YAML manifest';
      
      if (error instanceof Error) {
        if (error.message.includes('YAML')) {
          errorMessage = `Invalid YAML syntax: ${error.message}`;
        } else {
          errorMessage = `Failed to read manifest: ${error.message}`;
        }
      }

      return {
        success: false,
        errors: [errorMessage],
        warnings: [],
        stage: 'parsing'
      };
    }
  }
}

/**
 * Stage 2: Schema Validation Handler
 */
export class SchemaValidationHandler extends ValidationHandler {
  constructor(private logger: Logger, private schemaManager: any) {
    super();
  }

  protected async process(request: ValidationRequest): Promise<ValidationResponse> {
    this.logger.debug('Stage 2: Schema validation');
    
    const manifest = request.data;
    if (!manifest) {
      return {
        success: false,
        errors: ['No manifest data to validate'],
        warnings: [],
        stage: 'schema-validation'
      };
    }

    try {
      const Ajv = (await import('ajv')).default;
      const addFormats = (await import('ajv-formats')).default;
      
      const ajv = new Ajv({ allErrors: true, verbose: true });
      addFormats(ajv);
      
      // Get the master schema
      const schema = await this.schemaManager.getMasterSchema();
      const validate = ajv.compile(schema);
      const valid = validate(manifest);

      if (!valid) {
        const errors = validate.errors || [];
        const errorMessages = errors.map(error => {
          const path = error.instancePath || error.schemaPath || 'root';
          const message = error.message || 'validation failed';
          const data = error.data !== undefined ? ` (found: ${JSON.stringify(error.data)})` : '';
          return `${path}: ${message}${data}`;
        });

        return {
          success: false,
          errors: [`Schema validation failed:\n${errorMessages.join('\n')}`],
          warnings: [],
          stage: 'schema-validation'
        };
      }

      // Validate required fields
      const manifestObj = manifest as Record<string, any>;
      const requiredFieldErrors: string[] = [];
      
      if (!manifestObj.service) {
        requiredFieldErrors.push('Missing required field: service');
      }
      if (!manifestObj.owner) {
        requiredFieldErrors.push('Missing required field: owner');
      }

      if (requiredFieldErrors.length > 0) {
        return {
          success: false,
          errors: requiredFieldErrors,
          warnings: [],
          stage: 'schema-validation'
        };
      }

      this.logger.debug('Schema validation completed successfully');
      
      return {
        success: true,
        data: manifest,
        warnings: [],
        errors: [],
        stage: 'schema-validation'
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        stage: 'schema-validation'
      };
    }
  }
}

/**
 * Stage 3: Context Hydration Handler
 */
export class ContextHydrationHandler extends ValidationHandler {
  constructor(private logger: Logger) {
    super();
  }

  protected async process(request: ValidationRequest): Promise<ValidationResponse> {
    this.logger.debug(`Stage 3: Context hydration for environment ${request.environment || 'dev'}`);
    
    const manifest = request.data;
    if (!manifest) {
      return {
        success: false,
        errors: ['No manifest data to hydrate'],
        warnings: [],
        stage: 'context-hydration'
      };
    }

    try {
      const environment = request.environment || 'dev';
      const hydrated = this.hydrateManifest(manifest, environment);

      this.logger.debug('Context hydration completed successfully');
      
      return {
        success: true,
        data: hydrated,
        warnings: this.collectHydrationWarnings(hydrated, environment),
        errors: [],
        stage: 'context-hydration'
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Context hydration error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        stage: 'context-hydration'
      };
    }
  }

  private hydrateManifest(manifest: any, environment: string): any {
    // Deep clone to avoid mutations
    const hydrated = JSON.parse(JSON.stringify(manifest));

    // Set compliance framework default
    if (!hydrated.complianceFramework) {
      hydrated.complianceFramework = 'commercial';
    }

    // Apply environment-specific hydration
    if (hydrated.environments && hydrated.environments[environment]) {
      const envDefaults = hydrated.environments[environment].defaults || {};
      this.interpolateEnvironmentValues(hydrated, envDefaults, environment);
    }

    return hydrated;
  }

  private interpolateEnvironmentValues(obj: any, envDefaults: Record<string, any>, environment: string): void {
    if (typeof obj === 'string') {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach(item => this.interpolateEnvironmentValues(item, envDefaults, environment));
      return;
    }

    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          // ${env:key} interpolation
          const envMatch = value.match(/\$\{env:([^}]+)\}/g);
          if (envMatch) {
            let interpolated = value;
            envMatch.forEach(match => {
              const envKey = match.slice(6, -1);
              if (envDefaults[envKey] !== undefined) {
                interpolated = interpolated.replace(match, String(envDefaults[envKey]));
              }
            });
            obj[key] = interpolated;
          }

          // ${envIs:env} boolean interpolation
          const envIsMatch = value.match(/\$\{envIs:([^}]+)\}/);
          if (envIsMatch) {
            const targetEnv = envIsMatch[1];
            obj[key] = environment === targetEnv;
          }
        } else if (value && typeof value === 'object') {
          // Per-environment maps
          const envValue = (value as Record<string, any>)[environment];
          if (envValue !== undefined) {
            obj[key] = envValue;
          } else {
            this.interpolateEnvironmentValues(value, envDefaults, environment);
          }
        }
      }
    }
  }

  private collectHydrationWarnings(hydrated: any, environment: string): string[] {
    const warnings: string[] = [];

    // Check for unresolved interpolations
    const jsonString = JSON.stringify(hydrated);
    const unresolvedMatches = jsonString.match(/\$\{env:[^}]+\}/g);
    if (unresolvedMatches) {
      warnings.push(`Unresolved environment variables: ${unresolvedMatches.join(', ')}`);
    }

    return warnings;
  }
}

/**
 * Stage 4: Semantic Validation Handler
 */
export class SemanticValidationHandler extends ValidationHandler {
  constructor(private logger: Logger) {
    super();
  }

  protected async process(request: ValidationRequest): Promise<ValidationResponse> {
    this.logger.debug('Stage 4: Semantic and reference validation');
    
    const manifest = request.data;
    if (!manifest) {
      return {
        success: false,
        errors: ['No manifest data to validate'],
        warnings: [],
        stage: 'semantic-validation'
      };
    }

    try {
      const validationErrors = this.validateReferences(manifest);
      
      if (validationErrors.length > 0) {
        return {
          success: false,
          errors: validationErrors,
          warnings: [],
          stage: 'semantic-validation'
        };
      }

      this.logger.debug('Semantic validation completed successfully');
      
      return {
        success: true,
        data: manifest,
        warnings: [],
        errors: [],
        stage: 'semantic-validation'
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Semantic validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        stage: 'semantic-validation'
      };
    }
  }

  private validateReferences(manifest: any): string[] {
    const errors: string[] = [];

    // Build component name index
    const componentNames = new Set<string>();
    if (manifest.components) {
      manifest.components.forEach((component: any) => {
        if (component.name) {
          componentNames.add(component.name);
        }
      });
    }

    // Validate component binds references
    if (manifest.components) {
      manifest.components.forEach((component: any, index: number) => {
        if (component.binds) {
          component.binds.forEach((bind: any, bindIndex: number) => {
            if (bind.to && !componentNames.has(bind.to)) {
              errors.push(`Reference to non-existent component '${bind.to}' in components[${index}].binds[${bindIndex}]`);
            }
          });
        }
      });
    }

    // Validate governance suppressions
    if (manifest.governance?.cdkNag?.suppress) {
      manifest.governance.cdkNag.suppress.forEach((suppression: any, index: number) => {
        const requiredFields = ['id', 'justification', 'owner', 'expiresOn'];
        requiredFields.forEach(field => {
          if (!suppression[field]) {
            errors.push(`Missing required field '${field}' in governance.cdkNag.suppress[${index}]`);
          }
        });

        // Validate date format
        if (suppression.expiresOn && !this.isValidDate(suppression.expiresOn)) {
          errors.push(`Invalid date format for expiresOn in governance.cdkNag.suppress[${index}]. Expected ISO date format.`);
        }
      });
    }

    return errors;
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

/**
 * Chain Builder - Constructs the validation chain
 */
export class ValidationChainBuilder {
  static buildValidationChain(logger: Logger, schemaManager: any): ValidationHandler {
    const yamlParser = new YamlParsingHandler(logger);
    const schemaValidator = new SchemaValidationHandler(logger, schemaManager);
    const contextHydrator = new ContextHydrationHandler(logger);
    const semanticValidator = new SemanticValidationHandler(logger);

    // Chain the handlers together
    yamlParser
      .setNext(schemaValidator)
      .setNext(contextHydrator)
      .setNext(semanticValidator);

    return yamlParser;
  }

  static buildValidateOnlyChain(logger: Logger, schemaManager: any): ValidationHandler {
    const yamlParser = new YamlParsingHandler(logger);
    const schemaValidator = new SchemaValidationHandler(logger, schemaManager);

    // Chain only parsing and schema validation
    yamlParser.setNext(schemaValidator);

    return yamlParser;
  }
}