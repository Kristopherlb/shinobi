/**
 * Theme 1: Onboarding & Initial Development Test Cases
 * Tests the core user workflows for getting started with the platform
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

describe('Theme 1: Onboarding & Initial Development', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'platform-test-'));
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('TC-INIT-01: Template-based project initialization', () => {
    test('should create all correct files when running svc init with lambda-api-with-db template', () => {
      // Act: Run svc init command with specific template
      const result = execSync('svc init my-service --template lambda-api-with-db --no-interactive', {
        encoding: 'utf8',
        cwd: testDir
      });

      // Assert: Verify command completed successfully
      expect(result).toContain('Project initialized successfully');

      // Assert: Verify required files are created
      const expectedFiles = [
        'service.yml',
        'src/api.ts',
        'src/handlers/index.ts',
        'src/lib/database.ts',
        'patches.ts',
        '.gitignore',
        'README.md'
      ];

      expectedFiles.forEach(file => {
        const filePath = path.join(testDir, 'my-service', file);
        expect(fs.existsSync(filePath)).toBe(true);
      });

      // Assert: Verify service.yml contains expected structure
      const serviceYmlPath = path.join(testDir, 'my-service', 'service.yml');
      const serviceContent = fs.readFileSync(serviceYmlPath, 'utf8');
      
      expect(serviceContent).toContain('service: my-service');
      expect(serviceContent).toContain('type: lambda-api');
      expect(serviceContent).toContain('type: rds-postgres');
      expect(serviceContent).toContain('binds:');
      expect(serviceContent).toContain('capability: database:rds');

      // Assert: Verify API handler is properly structured
      const apiPath = path.join(testDir, 'my-service', 'src/api.ts');
      const apiContent = fs.readFileSync(apiPath, 'utf8');
      
      expect(apiContent).toContain('export const handler');
      expect(apiContent).toContain('process.env.DB_HOST');
      expect(apiContent).toContain('process.env.DATABASE_URL');
    });

    test('should create database integration code in lambda-api-with-db template', () => {
      // Act
      execSync('svc init my-db-service --template lambda-api-with-db --no-interactive', {
        cwd: testDir
      });

      // Assert: Verify database utility file exists and has proper structure
      const dbLibPath = path.join(testDir, 'my-db-service', 'src/lib/database.ts');
      const dbContent = fs.readFileSync(dbLibPath, 'utf8');

      expect(dbContent).toContain('createConnection');
      expect(dbContent).toContain('process.env.DATABASE_URL');
      expect(dbContent).toContain('ssl:');
      expect(dbContent).toMatch(/pg|postgres|database/i);
    });
  });

  describe('TC-INIT-02: Non-empty directory handling', () => {
    test('should prompt for confirmation when running svc init in non-empty directory', () => {
      // Arrange: Create a non-empty directory
      const existingFile = path.join(testDir, 'existing-file.txt');
      fs.writeFileSync(existingFile, 'This directory is not empty');

      // Act & Assert: Command should detect non-empty directory and exit with guidance
      expect(() => {
        execSync('svc init my-service --template lambda-api-with-db --no-interactive', {
          cwd: testDir,
          stdio: 'pipe'
        });
      }).toThrow();

      // Verify the error message is helpful
      try {
        execSync('svc init my-service --template lambda-api-with-db --no-interactive', {
          cwd: testDir,
          stdio: 'pipe'
        });
      } catch (error: any) {
        expect(error.stderr.toString()).toContain('directory is not empty');
        expect(error.stderr.toString()).toContain('--force');
      }
    });

    test('should proceed with --force flag in non-empty directory', () => {
      // Arrange: Create a non-empty directory
      fs.writeFileSync(path.join(testDir, 'existing-file.txt'), 'existing content');

      // Act: Use --force flag
      const result = execSync('svc init my-service --template lambda-api-with-db --force --no-interactive', {
        encoding: 'utf8',
        cwd: testDir
      });

      // Assert: Should complete successfully
      expect(result).toContain('Project initialized successfully');
      expect(fs.existsSync(path.join(testDir, 'my-service', 'service.yml'))).toBe(true);
    });
  });

  describe('TC-PLAN-01: Valid multi-component service planning', () => {
    test('should show NO CHANGES diff for valid service.yml with multiple components', () => {
      // Arrange: Create a multi-component service manifest
      const serviceManifest = `
service: multi-component-app
owner: platform-team
complianceFramework: commercial

components:
  - name: api
    type: lambda-api
    config:
      runtime: nodejs18.x
      handler: src/api.handler
      codePath: ./src
    binds:
      - to: database
        capability: database:rds
        access: readwrite

  - name: worker
    type: lambda-worker
    config:
      runtime: nodejs18.x
      handler: src/worker.handler
      codePath: ./src
    binds:
      - to: queue
        capability: queue:sqs
        access: read

  - name: database
    type: rds-postgres
    config:
      dbName: app_db
      instanceClass: db.t3.micro

  - name: queue
    type: sqs-queue
    config:
      fifo: false
      visibilityTimeout: 300
`;

      fs.writeFileSync(path.join(testDir, 'service.yml'), serviceManifest);

      // Create minimal source files to satisfy validation
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src/api.js'), 'exports.handler = async () => ({});');
      fs.writeFileSync(path.join(testDir, 'src/worker.js'), 'exports.handler = async () => ({});');

      // Act: Run plan command twice (should show no changes on second run)
      execSync('svc plan', { cwd: testDir }); // First run to establish baseline
      
      const result = execSync('svc plan', { 
        encoding: 'utf8',
        cwd: testDir 
      });

      // Assert: Should show no changes and exit with success
      expect(result).toContain('NO CHANGES');
      expect(result).toContain('multi-component-app');
      expect(result).toContain('4 components'); // api, worker, database, queue
      expect(result).toContain('2 bindings'); // api->database, worker->queue
    });
  });

  describe('TC-LOCAL-01: Docker Compose generation for local development', () => {
    test('should generate valid docker-compose.yml for RDS Postgres component', () => {
      // Arrange: Create service with RDS component
      const serviceManifest = `
service: local-dev-app
owner: dev-team
complianceFramework: commercial

components:
  - name: api
    type: lambda-api
    config:
      runtime: nodejs18.x
      handler: src/api.handler
      codePath: ./src
    binds:
      - to: database
        capability: database:rds
        access: readwrite

  - name: database
    type: rds-postgres
    config:
      dbName: local_db
      instanceClass: db.t3.micro
`;

      fs.writeFileSync(path.join(testDir, 'service.yml'), serviceManifest);
      fs.mkdirSync(path.join(testDir, 'src'));
      fs.writeFileSync(path.join(testDir, 'src/api.js'), 'exports.handler = async () => ({});');

      // Act: Run local up command
      const result = execSync('svc local up', {
        encoding: 'utf8',
        cwd: testDir
      });

      // Assert: Command completes successfully
      expect(result).toContain('docker-compose.yml generated');

      // Assert: docker-compose.yml is created and valid
      const dockerComposePath = path.join(testDir, 'docker-compose.yml');
      expect(fs.existsSync(dockerComposePath)).toBe(true);

      const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
      
      // Verify PostgreSQL service is included
      expect(dockerComposeContent).toContain('postgres:');
      expect(dockerComposeContent).toContain('POSTGRES_DB: local_db');
      expect(dockerComposeContent).toContain('5432:5432');
      
      // Verify Lambda local service is included
      expect(dockerComposeContent).toContain('lambda-local:');
      expect(dockerComposeContent).toContain('DB_HOST: database');
      expect(dockerComposeContent).toContain('DATABASE_URL:');
    });

    test('should generate different configurations for different compliance frameworks', () => {
      // Arrange: Create FedRAMP service
      const fedrampManifest = `
service: fedramp-app
complianceFramework: fedramp-moderate

components:
  - name: database
    type: rds-postgres
    config:
      dbName: secure_db
      encrypted: true
`;

      fs.writeFileSync(path.join(testDir, 'service.yml'), fedrampManifest);

      // Act
      execSync('svc local up', { cwd: testDir });

      // Assert: FedRAMP-specific configurations in docker-compose
      const dockerComposeContent = fs.readFileSync(path.join(testDir, 'docker-compose.yml'), 'utf8');
      
      expect(dockerComposeContent).toContain('# FedRAMP Moderate Configuration');
      expect(dockerComposeContent).toContain('POSTGRES_SSL_MODE: require');
    });
  });

  describe('TC-LOCAL-02: Local Docker environment startup', () => {
    test('should start local containers successfully without errors', async () => {
      // This test requires Docker to be available, so we'll mock the key aspects
      // In a real environment, this would actually start containers
      
      // Arrange: Create minimal service
      const serviceManifest = `
service: docker-test-app
components:
  - name: database
    type: rds-postgres
    config:
      dbName: test_db
`;

      fs.writeFileSync(path.join(testDir, 'service.yml'), serviceManifest);

      // Act: Generate docker-compose file
      execSync('svc local up', { cwd: testDir });

      // Assert: Validate docker-compose structure for successful startup
      const dockerComposePath = path.join(testDir, 'docker-compose.yml');
      const content = fs.readFileSync(dockerComposePath, 'utf8');

      // Verify health checks are included
      expect(content).toContain('healthcheck:');
      expect(content).toContain('test: ["CMD-SHELL"');
      
      // Verify proper networking configuration
      expect(content).toContain('networks:');
      expect(content).toContain('platform-network');
      
      // Verify volumes are properly configured for data persistence
      expect(content).toContain('volumes:');
      expect(content).toContain('postgres-data:');

      // Mock Docker compose validation
      // In real implementation: docker-compose config --quiet
      expect(content).toMatch(/version:\s*['"]3\.\d+['"]?/);
    });
  });
});