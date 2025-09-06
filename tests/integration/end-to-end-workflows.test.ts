import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('End-to-End CLI Workflows', () => {
  const cliPath = path.join(__dirname, '../../dist/cli.js');
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'svc-e2e-'));
    process.chdir(testDir);

    // Build the CLI first
    try {
      await execAsync('npm run build', { cwd: path.join(__dirname, '../..') });
    } catch (error) {
      // CLI might already be built, continue
    }
  });

  describe('Complete Development Workflow', () => {
    it('should complete full workflow: init -> validate -> plan', async () => {
      // Step 1: Initialize service
      const { stdout: initOutput } = await execAsync(
        `node ${cliPath} init --name shipping --owner team-fulfillment --framework commercial --pattern lambda-api-with-db`
      );
      expect(initOutput).toContain('initialized successfully');

      // Verify files were created
      await expect(fs.access('service.yml')).resolves.not.toThrow();
      await expect(fs.access('.gitignore')).resolves.not.toThrow();
      await expect(fs.access('src')).resolves.not.toThrow();
      await expect(fs.access('patches.ts')).resolves.not.toThrow();

      // Step 2: Validate the generated manifest
      const { stdout: validateOutput } = await execAsync(`node ${cliPath} validate`);
      expect(validateOutput).toContain('validation completed successfully');
      expect(validateOutput).toContain('Service: shipping');
      expect(validateOutput).toContain('Owner: team-fulfillment');
      expect(validateOutput).toContain('Compliance Framework: commercial');

      // Step 3: Plan for different environments
      const { stdout: devPlanOutput } = await execAsync(`node ${cliPath} plan --env dev`);
      expect(devPlanOutput).toContain('Active Framework: commercial');
      expect(devPlanOutput).toContain('Planning deployment for environment: dev');
      expect(devPlanOutput).toContain('Resolved Configuration:');

      const { stdout: prodPlanOutput } = await execAsync(`node ${cliPath} plan --env prod`);
      expect(prodPlanOutput).toContain('Active Framework: commercial');
      expect(prodPlanOutput).toContain('Planning deployment for environment: prod');
    });

    it('should handle FedRAMP workflow with enhanced security', async () => {
      // Initialize FedRAMP High service
      await execAsync(
        `node ${cliPath} init --name secure-service --owner security-team --framework fedramp-high --pattern lambda-api-with-db`
      );

      const serviceYml = await fs.readFile('service.yml', 'utf8');
      expect(serviceYml).toContain('complianceFramework: fedramp-high');
      expect(serviceYml).toContain('classification: controlled');
      expect(serviceYml).toContain('backupRetentionDays: 35');

      // Validate FedRAMP service
      const { stdout: validateOutput } = await execAsync(`node ${cliPath} validate`);
      expect(validateOutput).toContain('Compliance Framework: fedramp-high');

      // Plan should show framework-specific settings
      const { stdout: planOutput } = await execAsync(`node ${cliPath} plan --env prod`);
      expect(planOutput).toContain('Active Framework: fedramp-high');
      
      // Parse JSON output to verify framework-specific settings
      const jsonStartIndex = planOutput.indexOf('{');
      if (jsonStartIndex !== -1) {
        const jsonOutput = planOutput.substring(jsonStartIndex);
        const config = JSON.parse(jsonOutput);
        expect(config.complianceFramework).toBe('fedramp-high');
      }
    });
  });

  describe('Error Handling Workflows', () => {
    it('should provide actionable errors for missing required fields', async () => {
      // Create invalid manifest
      await fs.writeFile('service.yml', `
owner: test-team
runtime: nodejs20
components: []
      `);

      await expect(execAsync(`node ${cliPath} validate`)).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringContaining('service')
      });
    });

    it('should handle file discovery errors gracefully', async () => {
      // No service.yml in directory
      await expect(execAsync(`node ${cliPath} validate`)).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringContaining('No service.yml found')
      });
    });

    it('should validate bind references and provide clear errors', async () => {
      await fs.writeFile('service.yml', `
service: test-service
owner: test-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes: []
    binds:
      - to: nonexistent-db
        capability: db:postgres
        access: read
      `);

      await expect(execAsync(`node ${cliPath} plan --env dev`)).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringContaining('nonexistent-db')
      });
    });
  });

  describe('Output Mode Validation', () => {
    beforeEach(async () => {
      await fs.writeFile('service.yml', `
service: output-test
owner: test-team
runtime: nodejs20
complianceFramework: commercial
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
      `);
    });

    it('should provide human-readable output by default', async () => {
      const { stdout } = await execAsync(`node ${cliPath} validate`);
      
      // Should contain human-readable elements
      expect(stdout).toMatch(/✓|ℹ|Service:/);
      expect(stdout).toContain('validation completed successfully');
    });

    it('should provide structured JSON output in CI mode', async () => {
      const { stdout } = await execAsync(`node ${cliPath} validate --ci`);
      
      // In CI mode, each log line should be valid JSON
      const lines = stdout.trim().split('\\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.trim()) {
          expect(() => JSON.parse(line)).not.toThrow();
        }
      });
    });

    it('should provide verbose debug output', async () => {
      const { stdout } = await execAsync(`node ${cliPath} validate --verbose`);
      
      // Should contain debug information
      expect(stdout).toMatch(/debug|🔍|DEBUG/i);
    });
  });

  describe('Framework-Specific Policy Validation', () => {
    it('should reject FedRAMP High manifest with insecure configuration', async () => {
      await fs.writeFile('service.yml', `
service: insecure-fedramp-service
owner: security-team
runtime: nodejs20
complianceFramework: fedramp-high
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /data
          handler: src/handler.getData
    binds:
      - to: storage
        capability: bucket:s3
        access: write

  - name: storage
    type: s3-bucket
    config:
      versioning: false
      encryption: none
      publicAccess: true
      lifecycleRules: []
      `);

      // FedRAMP High should enforce strict security policies
      await expect(execAsync(`node ${cliPath} validate`)).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringMatching(/FedRAMP High requires|encryption|security policy/i)
      });
    });

    it('should enforce FedRAMP policy violations in plan stage', async () => {
      await fs.writeFile('service.yml', `
service: policy-violation-service
owner: security-team
runtime: nodejs20
complianceFramework: fedramp-moderate
components:
  - name: db
    type: rds-postgres
    config:
      dbName: testdb
      encrypted: false
      backupRetentionDays: 3
      multiAz: false
      `);

      await expect(execAsync(`node ${cliPath} plan --env prod`)).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringMatching(/FedRAMP.*encryption.*backup.*policy/i)
      });
    });
  });

  describe('Escape Hatch Validation', () => {
    it('should detect and report patches.ts usage in plan output', async () => {
      // Initialize service with patches file
      await execAsync(
        `node ${cliPath} init --name patched-service --owner dev-team --framework commercial --pattern lambda-api-with-db`
      );

      // Modify patches.ts to include actual patches
      await fs.writeFile('patches.ts', `
/**
 * Platform Patches File
 * Custom CDK modifications for patched-service
 */
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function applyPatches(scope: Construct): void {
  // Custom patch: Override Lambda runtime to use ARM architecture
  const lambdaFunction = scope.node.findChild('api') as lambda.Function;
  if (lambdaFunction) {
    lambdaFunction.addEnvironment('CUSTOM_PATCH', 'arm64-runtime');
  }
  
  console.log('Applied custom patches for enhanced performance');
}

export const patchInfo = {
  version: '1.0.0',
  description: 'ARM architecture optimization patch',
  author: 'dev-team',
  appliedAt: new Date().toISOString()
};
      `);

      // Plan should detect and report the patches
      const { stdout: planOutput } = await execAsync(`node ${cliPath} plan --env dev`);
      
      expect(planOutput).toContain('Patch Report');
      expect(planOutput).toContain('patches.ts detected');
      expect(planOutput).toContain('arm64-runtime');
      expect(planOutput).toMatch(/custom patches|escape hatch|platform override/i);
    });

    it('should warn about patches in validation stage', async () => {
      await fs.writeFile('service.yml', `
service: patch-warning-service
owner: dev-team
runtime: nodejs20
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /test
          handler: src/handler.test
      `);

      await fs.writeFile('patches.ts', `
export function applyPatches(scope: any): void {
  // Custom security group modifications
  console.log('Applying security group patches');
}
      `);

      const { stdout: validateOutput } = await execAsync(`node ${cliPath} validate`);
      
      expect(validateOutput).toContain('validation completed successfully');
      expect(validateOutput).toMatch(/patches\.ts.*detected|escape hatch.*found/i);
    });
  });

  describe('Template Scaffolding Validation', () => {
    it('should scaffold lambda-api-with-db template correctly', async () => {
      const { stdout: initOutput } = await execAsync(
        `node ${cliPath} init --name e-commerce --owner team-backend --framework commercial --pattern lambda-api-with-db`
      );
      
      expect(initOutput).toContain('initialized successfully');

      // Verify expected files were created
      await expect(fs.access('service.yml')).resolves.not.toThrow();
      await expect(fs.access('.gitignore')).resolves.not.toThrow();
      await expect(fs.access('patches.ts')).resolves.not.toThrow();
      await expect(fs.access('src')).resolves.not.toThrow();
      
      // Check service.yml content matches template
      const serviceYml = await fs.readFile('service.yml', 'utf8');
      expect(serviceYml).toContain('service: e-commerce');
      expect(serviceYml).toContain('owner: team-backend');
      expect(serviceYml).toContain('complianceFramework: commercial');
      
      // Should contain lambda-api component
      expect(serviceYml).toContain('type: lambda-api');
      expect(serviceYml).toMatch(/routes:\s*-\s*method:/);
      
      // Should contain database component
      expect(serviceYml).toContain('type: rds-postgres');
      expect(serviceYml).toMatch(/dbName:/);
      
      // Should contain binding between api and database
      expect(serviceYml).toMatch(/binds:\s*-\s*to:.*db/);
      expect(serviceYml).toContain('capability: db:postgres');
      
      // Check src directory structure
      const srcFiles = await fs.readdir('src');
      expect(srcFiles).toContain('api.ts');
      
      const apiFile = await fs.readFile('src/api.ts', 'utf8');
      expect(apiFile).toMatch(/export.*handler|async.*event/);
    });

    it('should scaffold empty template with minimal structure', async () => {
      await execAsync(
        `node ${cliPath} init --name minimal-service --owner team-ops --framework fedramp-moderate --pattern empty`
      );

      const serviceYml = await fs.readFile('service.yml', 'utf8');
      expect(serviceYml).toContain('service: minimal-service');
      expect(serviceYml).toContain('owner: team-ops');
      expect(serviceYml).toContain('complianceFramework: fedramp-moderate');
      expect(serviceYml).toContain('components: []');
      
      // Should still create essential files
      await expect(fs.access('.gitignore')).resolves.not.toThrow();
      await expect(fs.access('patches.ts')).resolves.not.toThrow();
      await expect(fs.access('src')).resolves.not.toThrow();
    });

    it('should apply framework-specific template customizations', async () => {
      await execAsync(
        `node ${cliPath} init --name secure-api --owner security-team --framework fedramp-high --pattern lambda-api-with-db`
      );

      const serviceYml = await fs.readFile('service.yml', 'utf8');
      expect(serviceYml).toContain('complianceFramework: fedramp-high');
      
      // FedRAMP High should include enhanced security settings
      expect(serviceYml).toMatch(/classification:\s*(controlled|restricted)/);
      expect(serviceYml).toMatch(/auditLevel:\s*detailed/);
      expect(serviceYml).toMatch(/backupRetentionDays:\s*(35|30)/);
      
      // Should include governance section for FedRAMP
      expect(serviceYml).toMatch(/governance:/);
      expect(serviceYml).toMatch(/cdkNag:/);
    });
  });

  describe('Governance Policy Validation', () => {
    it('should reject manifest with expired CDK-nag suppressions', async () => {
      await fs.writeFile('service.yml', `
service: expired-suppression-service
owner: compliance-team
runtime: nodejs20
complianceFramework: commercial

governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        justification: "Required for S3 cross-account access"
        owner: "compliance-team"
        expiresOn: "2023-06-15"
        appliesTo:
          - component: api
      - id: AwsSolutions-S3-1
        justification: "Public read access required for static assets"
        owner: "frontend-team"
        expiresOn: "2024-12-31"
        appliesTo:
          - component: assets

components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /data
          handler: src/handler.getData
      `);

      await expect(execAsync(`node ${cliPath} validate`)).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringMatching(/suppression.*expired|AwsSolutions-IAM5.*2023-06-15/i)
      });
    });

    it('should validate governance suppression format and required fields', async () => {
      await fs.writeFile('service.yml', `
service: invalid-governance-service
owner: compliance-team
runtime: nodejs20
governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        justification: "Required for cross-account access"
        # Missing owner field
        # Missing expiresOn field
        appliesTo:
          - component: api
      - justification: "Public access required"
        owner: "team"
        expiresOn: "invalid-date-format"
        # Missing id field
components:
  - name: api
    type: lambda-api
    config:
      routes: []
      `);

      await expect(execAsync(`node ${cliPath} validate`)).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringMatching(/Missing.*owner.*expiresOn|Invalid.*date.*format|Missing.*id/i)
      });
    });
  });

  describe('Complex Manifest Validation', () => {
    it('should validate complex shipping service manifest', async () => {
      await fs.writeFile('service.yml', `
service: complex-shipping
owner: team-fulfillment
runtime: nodejs20
complianceFramework: fedramp-moderate
labels:
  domain: logistics
  pii: medium
  criticality: high

environments:
  dev:
    defaults:
      lambdaMemory: 512
      logLevel: debug
      enableTracing: true
  prod:
    defaults:
      lambdaMemory: 1024
      logLevel: info
      enableTracing: false

governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        justification: "Required for cross-account S3 access"
        owner: "team-fulfillment"
        expiresOn: "2025-12-31"
        appliesTo:
          - component: api

components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: POST
          path: /shipments
          handler: src/api.createShipment
        - method: GET
          path: /shipments/{id}
          handler: src/api.getShipment
      logLevel: \${env:logLevel}
      tracing: \${env:enableTracing}
    binds:
      - to: events-queue
        capability: queue:sqs
        access: write
      - to: audit-bucket
        capability: bucket:s3
        access: write
        env:
          bucketName: AUDIT_BUCKET
    labels:
      tier: standard
      exposure: internal
    overrides:
      function:
        memorySize: \${env:lambdaMemory}
        timeout: 30
        reservedConcurrency: 100

  - name: events-queue
    type: sqs-queue
    config:
      fifo: true
      visibilityTimeout: 300
      messageRetentionPeriod: 1209600
    overrides:
      queue:
        deadLetter:
          maxReceiveCount: 3

  - name: processor
    type: lambda-worker
    config:
      handler: src/processor.handleEvent
      batchSize: 5
    binds:
      - to: events-queue
        capability: queue:sqs
        access: read
      - to: rates-db
        capability: db:postgres
        access: write
        options:
          iamAuth: true
      - to: cache
        capability: cache:redis
        access: readwrite

  - name: rates-db
    type: rds-postgres
    config:
      dbName: shipping_rates
      multiAz: \${envIs:prod}
      backupRetentionDays:
        dev: 7
        prod: 30
      encrypted: true

  - name: cache
    type: elasticache-redis
    config:
      nodeType:
        dev: cache.t3.micro
        prod: cache.r6g.large
      numCacheNodes: 1

  - name: audit-bucket
    type: s3-bucket
    config:
      versioning: true
      encryption: AES256
      publicAccess: false
      lifecycleRules:
        - id: archive-old-logs
          status: Enabled
          transitions:
            - days: 90
              storageClass: GLACIER
      `);

      // Validate the complex manifest
      const { stdout: validateOutput } = await execAsync(`node ${cliPath} validate`);
      expect(validateOutput).toContain('validation completed successfully');
      expect(validateOutput).toContain('Components: 5');

      // Plan for both environments
      const { stdout: devPlan } = await execAsync(`node ${cliPath} plan --env dev`);
      const { stdout: prodPlan } = await execAsync(`node ${cliPath} plan --env prod`);

      expect(devPlan).toContain('Active Framework: fedramp-moderate');
      expect(prodPlan).toContain('Active Framework: fedramp-moderate');

      // Verify environment-specific resolution in JSON output
      const devJsonStart = devPlan.indexOf('{');
      const prodJsonStart = prodPlan.indexOf('{');
      
      if (devJsonStart !== -1 && prodJsonStart !== -1) {
        const devConfig = JSON.parse(devPlan.substring(devJsonStart));
        const prodConfig = JSON.parse(prodPlan.substring(prodJsonStart));

        // Check environment-specific values
        const devApi = devConfig.components.find(c => c.name === 'api');
        const prodApi = prodConfig.components.find(c => c.name === 'api');

        expect(devApi?.config?.logLevel).toBe('debug');
        expect(prodApi?.config?.logLevel).toBe('info');
        expect(devApi?.config?.tracing).toBe(true);
        expect(prodApi?.config?.tracing).toBe(false);
      }
    });
  });

  describe('FedRAMP Workflows', () => {
    it('should enforce FedRAMP Moderate security policies and show enhanced defaults', async () => {
      // Copy FedRAMP Moderate test fixture
      const fixtureContent = await fs.readFile(
        path.join(__dirname, '../fixtures/fedramp-moderate-manifest.yml'),
        'utf8'
      );
      await fs.writeFile('service.yml', fixtureContent);

      // Validate should pass for compliant FedRAMP manifest
      const { stdout: validateOutput } = await execAsync(`node ${cliPath} validate`);
      expect(validateOutput).toContain('validation completed successfully');
      expect(validateOutput).toContain('Compliance Framework: fedramp-moderate');

      // Plan should show FedRAMP-specific enhanced defaults
      const { stdout: planOutput } = await execAsync(`node ${cliPath} plan --env prod`);
      expect(planOutput).toContain('Active Framework: fedramp-moderate');

      // Parse and verify enhanced FedRAMP security configurations
      const jsonStartIndex = planOutput.indexOf('{');
      if (jsonStartIndex !== -1) {
        const jsonOutput = planOutput.substring(jsonStartIndex);
        const config = JSON.parse(jsonOutput);
        
        // Verify FedRAMP-specific settings
        expect(config.complianceFramework).toBe('fedramp-moderate');
        expect(config.classification).toBe('controlled');
        expect(config.auditLevel).toBe('detailed');

        // Check database has enhanced security
        const paymentsDb = config.components.find(c => c.name === 'payments-db');
        expect(paymentsDb?.config?.encrypted).toBe(true);
        expect(paymentsDb?.config?.performanceInsights).toBe(true);
        expect(paymentsDb?.config?.backupRetentionDays?.prod).toBe(30);

        // Check S3 has encryption
        const auditBucket = config.components.find(c => c.name === 'audit-bucket');
        expect(auditBucket?.config?.encryption).toBe('aws:kms');
        expect(auditBucket?.config?.versioning).toBe(true);
      }
    });

    it('should reject manifest that violates FedRAMP Moderate policies', async () => {
      // Copy test fixture with FedRAMP violations
      const fixtureContent = await fs.readFile(
        path.join(__dirname, '../fixtures/commercial-to-fedramp-violation-manifest.yml'),
        'utf8'
      );
      await fs.writeFile('service.yml', fixtureContent);

      // Plan should fail with specific FedRAMP policy violations
      await expect(execAsync(`node ${cliPath} plan --env prod`)).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringMatching(/FedRAMP.*requires.*encryption|storage.*encrypted.*false|backup.*retention.*insufficient/i)
      });
    });

    it('should show FedRAMP High enhanced security requirements', async () => {
      await execAsync(
        `node ${cliPath} init --name fedramp-high-service --owner security-team --framework fedramp-high --pattern lambda-api-with-db`
      );

      const serviceYml = await fs.readFile('service.yml', 'utf8');
      
      // Verify FedRAMP High specific settings
      expect(serviceYml).toContain('complianceFramework: fedramp-high');
      expect(serviceYml).toContain('classification: controlled');
      expect(serviceYml).toContain('auditLevel: detailed');
      
      // Should have stricter backup retention
      expect(serviceYml).toMatch(/backupRetentionDays:\s*(35|30)/);
      
      // Should include governance controls
      expect(serviceYml).toMatch(/governance:/);
      expect(serviceYml).toMatch(/cdkNag:/);
      expect(serviceYml).toMatch(/suppress:/);

      // Plan should succeed and show enhanced controls
      const { stdout: planOutput } = await execAsync(`node ${cliPath} plan --env prod`);
      expect(planOutput).toContain('Active Framework: fedramp-high');
      expect(planOutput).toMatch(/enhanced.*security.*controls|FedRAMP.*High.*requirements/i);
    });

    it('should detect expired FedRAMP governance suppressions', async () => {
      await fs.writeFile('service.yml', `
service: expired-fedramp-service
owner: compliance-team
runtime: nodejs20
complianceFramework: fedramp-moderate

governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-RDS2
        justification: "Temporary exemption for migration period"
        owner: "dba-team"
        expiresOn: "2023-06-01"
        appliesTo:
          - component: secure-db

components:
  - name: secure-db
    type: rds-postgres
    config:
      dbName: secure_data
      encrypted: true
      backupRetentionDays: 30
      `);

      // Should fail validation due to expired suppression
      await expect(execAsync(`node ${cliPath} validate`)).rejects.toMatchObject({
        code: 2,
        stderr: expect.stringMatching(/suppression.*expired.*2023-06-01|AwsSolutions-RDS2.*expired/i)
      });
    });
  });

  afterEach(async () => {
    try {
      process.chdir('/tmp');
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});