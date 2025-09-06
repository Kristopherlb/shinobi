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
exports.TemplateEngine = void 0;
const fs = __importStar(require("fs/promises"));
const Mustache = __importStar(require("mustache"));
const logger_1 = require("../utils/logger");
class TemplateEngine {
    /**
     * Generate project files based on user inputs (AC-SI-2)
     */
    async generateProject(inputs) {
        logger_1.logger.debug('Generating project files', inputs);
        // Create service.yml from template
        await this.generateServiceManifest(inputs);
        // Create .gitignore
        await this.generateGitignore();
        // Create source directory and files
        await this.generateSourceFiles(inputs);
        // Create patches.ts stub
        await this.generatePatchesStub();
        logger_1.logger.debug('Project generation completed');
    }
    async generateServiceManifest(inputs) {
        const template = this.getServiceTemplate(inputs.pattern);
        const serviceManifest = Mustache.render(template, {
            serviceName: inputs.name,
            owner: inputs.owner,
            complianceFramework: inputs.framework,
            isCommercial: inputs.framework === 'commercial',
            isFedRAMP: inputs.framework.startsWith('fedramp'),
            isHighSecurity: inputs.framework === 'fedramp-high'
        });
        await fs.writeFile('service.yml', serviceManifest);
        logger_1.logger.debug('Generated service.yml');
    }
    async generateGitignore() {
        const gitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Platform files
cdk.out/
cdk.context.json
outputs.json
plan.json
`;
        await fs.writeFile('.gitignore', gitignore);
        logger_1.logger.debug('Generated .gitignore');
    }
    async generateSourceFiles(inputs) {
        // Create src directory
        await fs.mkdir('src', { recursive: true });
        if (inputs.pattern === 'lambda-api-with-db') {
            await this.generateApiLambdaFiles();
        }
        else if (inputs.pattern === 'worker-with-queue') {
            await this.generateWorkerFiles();
        }
        else {
            // Empty pattern - just create a basic handler
            await this.generateBasicHandler();
        }
        logger_1.logger.debug('Generated source files');
    }
    async generatePatchesStub() {
        const patchesStub = `// Platform Patches File
// 
// This file allows you to make surgical modifications to the generated CDK stack
// when the standard overrides system is not sufficient for your needs.
// 
// Documentation: https://platform.internal/docs/patches
// 
// Example:
// export const tightenSecurityGroups = (context: PatchContext) => {
//   // Modify security group rules here
//   return {
//     description: "Tightened security group rules for compliance",
//     riskLevel: "low"
//   };
// };

export {}; // Make this file a module
`;
        await fs.writeFile('patches.ts', patchesStub);
        logger_1.logger.debug('Generated patches.ts stub');
    }
    getServiceTemplate(pattern) {
        const baseTemplate = `service: {{serviceName}}
owner: {{owner}}
runtime: nodejs20
{{#complianceFramework}}
complianceFramework: {{complianceFramework}}
{{/complianceFramework}}

labels:
  domain: platform
  {{#isFedRAMP}}
  classification: controlled
  {{/isFedRAMP}}

environments:
  dev:
    defaults:
      logLevel: debug
      {{#isFedRAMP}}
      auditLevel: detailed
      {{/isFedRAMP}}
  prod:
    defaults:
      logLevel: info
      {{#isFedRAMP}}
      auditLevel: comprehensive
      {{/isFedRAMP}}

components:`;
        switch (pattern) {
            case 'lambda-api-with-db':
                return baseTemplate + `
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /health
          handler: src/api.health
        - method: POST
          path: /items
          handler: src/api.createItem
        - method: GET
          path: /items
          handler: src/api.listItems
    binds:
      - to: database
        capability: db:postgres
        access: read
        env:
          host: DB_HOST
          secretArn: DB_SECRET_ARN

  - name: database
    type: rds-postgres
    config:
      dbName: {{serviceName}}
      {{#isFedRAMP}}
      backupRetentionDays: 35
      {{/isFedRAMP}}
      {{^isFedRAMP}}
      backupRetentionDays: 7
      {{/isFedRAMP}}
`;
            case 'worker-with-queue':
                return baseTemplate + `
  - name: queue
    type: sqs-queue
    config:
      fifo: false
      visibilityTimeout: 300

  - name: worker
    type: lambda-worker
    config:
      handler: src/worker.process
      batchSize: 10
    binds:
      - to: queue
        capability: queue:sqs
        access: read
        env:
          queueUrl: QUEUE_URL
`;
            default: // empty
                return baseTemplate + `
  - name: hello
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /hello
          handler: src/handler.hello
`;
        }
    }
    async generateApiLambdaFiles() {
        const apiHandler = `// API Lambda Handler
export const health = async (event: any) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'healthy',
      service: process.env.SERVICE_NAME || 'unknown'
    })
  };
};

export const createItem = async (event: any) => {
  // TODO: Implement item creation
  return {
    statusCode: 201,
    body: JSON.stringify({
      message: 'Item created successfully'
    })
  };
};

export const listItems = async (event: any) => {
  // TODO: Implement item listing
  return {
    statusCode: 200,
    body: JSON.stringify({
      items: []
    })
  };
};
`;
        await fs.writeFile('src/api.ts', apiHandler);
    }
    async generateWorkerFiles() {
        const workerHandler = `// Worker Lambda Handler
export const process = async (event: any) => {
  console.log('Processing SQS messages:', JSON.stringify(event, null, 2));
  
  // Process each record in the batch
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      console.log('Processing message:', message);
      
      // TODO: Implement message processing logic
      
    } catch (error) {
      console.error('Error processing message:', error);
      throw error; // This will cause the message to be retried or sent to DLQ
    }
  }
  
  return { statusCode: 200 };
};
`;
        await fs.writeFile('src/worker.ts', workerHandler);
    }
    async generateBasicHandler() {
        const basicHandler = `// Basic Lambda Handler
export const hello = async (event: any) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello from your new service!',
      event: event
    })
  };
};
`;
        await fs.writeFile('src/handler.ts', basicHandler);
    }
}
exports.TemplateEngine = TemplateEngine;
