/**
 * Migration Tool CLI Tests
 * Tests the command-line interface and error handling for svc migrate
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('Migration Tool CLI Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'migrate-cli-test-'));
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('TC-MIGRATE-CLI-01: Invalid CDK project path handling', () => {
    test('should fail with non-zero exit code for invalid project path', () => {
      // Arrange: Non-existent project path
      const invalidPath = path.join(testDir, 'non-existent-project');

      // Act & Assert: Command should fail
      expect(() => {
        execSync(`svc migrate --cdk-project ${invalidPath} --stack-name TestStack --service-name test-service --output ./output --non-interactive`, {
          cwd: testDir,
          stdio: 'pipe'
        });
      }).toThrow();

      // Verify specific error message
      try {
        execSync(`svc migrate --cdk-project ${invalidPath} --stack-name TestStack --service-name test-service --output ./output --non-interactive`, {
          cwd: testDir,
          stdio: 'pipe'
        });
      } catch (error: any) {
        expect(error.status).not.toBe(0);
        expect(error.stderr.toString()).toContain('Project not found');
        expect(error.stderr.toString()).toContain(invalidPath);
      }
    });

    test('should fail for directory that exists but is not a CDK project', () => {
      // Arrange: Create directory without CDK files
      const notCdkProject = path.join(testDir, 'not-cdk-project');
      fs.mkdirSync(notCdkProject);
      fs.writeFileSync(path.join(notCdkProject, 'random-file.txt'), 'not a CDK project');

      // Act & Assert: Command should fail
      try {
        execSync(`svc migrate --cdk-project ${notCdkProject} --stack-name TestStack --service-name test-service --output ./output --non-interactive`, {
          cwd: testDir,
          stdio: 'pipe'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
        expect(error.stderr.toString()).toContain('Not a valid CDK project');
        expect(error.stderr.toString()).toContain('missing cdk.json or package.json');
      }
    });

    test('should provide helpful error when CDK CLI is not available', () => {
      // Arrange: Create valid CDK project structure but simulate missing CDK CLI
      const cdkProject = path.join(testDir, 'cdk-without-cli');
      fs.mkdirSync(cdkProject);
      fs.writeFileSync(path.join(cdkProject, 'cdk.json'), JSON.stringify({
        app: 'npx ts-node app.ts'
      }));
      fs.writeFileSync(path.join(cdkProject, 'package.json'), JSON.stringify({
        name: 'test-cdk-app',
        dependencies: {}
      }));

      // Act & Assert: Should fail with CDK CLI error
      try {
        execSync(`svc migrate --cdk-project ${cdkProject} --stack-name TestStack --service-name test-service --output ./output --non-interactive`, {
          cwd: testDir,
          stdio: 'pipe'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
        expect(error.stderr.toString()).toMatch(/CDK CLI not available|Please ensure AWS CDK is installed/);
      }
    });
  });

  describe('TC-MIGRATE-CLI-02: Invalid stack name handling', () => {
    test('should fail with non-zero exit code for invalid stack name', () => {
      // Arrange: Create valid CDK project
      const cdkProject = createValidCdkProject('valid-cdk');

      // Act & Assert: Command should fail with invalid stack name
      try {
        execSync(`svc migrate --cdk-project ${cdkProject} --stack-name NonExistentStack --service-name test-service --output ./output --non-interactive`, {
          cwd: testDir,
          stdio: 'pipe'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
        expect(error.stderr.toString()).toContain('Stack not found');
        expect(error.stderr.toString()).toContain('NonExistentStack');
      }
    });

    test('should provide list of available stacks when stack is not found', () => {
      // Arrange: Create CDK project with known stacks
      const cdkProject = createValidCdkProject('multi-stack-cdk', ['DevStack', 'ProdStack']);

      // Act & Assert: Should suggest available stacks
      try {
        execSync(`svc migrate --cdk-project ${cdkProject} --stack-name WrongStack --service-name test-service --output ./output --non-interactive`, {
          cwd: testDir,
          stdio: 'pipe'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
        const errorMessage = error.stderr.toString();
        expect(errorMessage).toContain('Stack not found');
        expect(errorMessage).toContain('Available stacks');
        expect(errorMessage).toContain('DevStack');
        expect(errorMessage).toContain('ProdStack');
      }
    });

    test('should handle CDK synthesis errors gracefully', () => {
      // Arrange: Create CDK project with synthesis error
      const cdkProject = createFaultyCdkProject('broken-cdk');

      // Act & Assert: Should fail with synthesis error
      try {
        execSync(`svc migrate --cdk-project ${cdkProject} --stack-name BrokenStack --service-name test-service --output ./output --non-interactive`, {
          cwd: testDir,
          stdio: 'pipe'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
        expect(error.stderr.toString()).toContain('Failed to synthesize stack');
      }
    });
  });

  describe('CLI User Experience Validation', () => {
    test('should validate service name format in non-interactive mode', () => {
      // Arrange: Create valid CDK project
      const cdkProject = createValidCdkProject('valid-cdk');

      // Act & Assert: Invalid service name should fail
      const invalidServiceNames = [
        'ServiceName',    // Uppercase start
        'service_name',   // Underscores
        '1service',       // Number start
        'service name',   // Spaces
        'service..name'   // Double dots
      ];

      invalidServiceNames.forEach(invalidName => {
        try {
          execSync(`svc migrate --cdk-project ${cdkProject} --stack-name TestStack --service-name "${invalidName}" --output ./output --non-interactive`, {
            cwd: testDir,
            stdio: 'pipe'
          });
          fail(`Should have failed for invalid service name: ${invalidName}`);
        } catch (error: any) {
          expect(error.status).not.toBe(0);
          expect(error.stderr.toString()).toContain('Service name must start with lowercase letter');
        }
      });
    });

    test('should validate output directory does not exist', () => {
      // Arrange: Create valid CDK project and existing output directory
      const cdkProject = createValidCdkProject('valid-cdk');
      const existingOutput = path.join(testDir, 'existing-output');
      fs.mkdirSync(existingOutput);

      // Act & Assert: Should fail when output directory exists
      try {
        execSync(`svc migrate --cdk-project ${cdkProject} --stack-name TestStack --service-name test-service --output ${existingOutput} --non-interactive`, {
          cwd: testDir,
          stdio: 'pipe'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
        expect(error.stderr.toString()).toContain('Output directory already exists');
      }
    });

    test('should accept valid compliance frameworks', () => {
      // Arrange: Create minimal valid CDK project
      const cdkProject = createMinimalCdkProject('minimal-cdk');

      const validFrameworks = ['commercial', 'fedramp-moderate', 'fedramp-high'];

      // Act & Assert: All valid frameworks should be accepted (will fail at synthesis, but validation passes)
      validFrameworks.forEach(framework => {
        try {
          execSync(`svc migrate --cdk-project ${cdkProject} --stack-name TestStack --service-name test-service --output ./output-${framework} --compliance ${framework} --non-interactive`, {
            cwd: testDir,
            stdio: 'pipe'
          });
          // If it gets past CLI validation to actual CDK synthesis, that's success for this test
        } catch (error: any) {
          // Expect synthesis errors, not CLI validation errors
          expect(error.stderr.toString()).not.toContain('Invalid compliance framework');
        }
      });
    });
  });

  // Helper functions to create test CDK projects
  function createValidCdkProject(name: string, stacks: string[] = ['TestStack']): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    // Create cdk.json
    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts',
      context: {
        '@aws-cdk/core:enableStackNameDuplicates': 'true'
      }
    }));

    // Create package.json with CDK dependencies
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      version: '1.0.0',
      scripts: {
        build: 'tsc',
        synth: 'cdk synth'
      },
      dependencies: {
        'aws-cdk-lib': '^2.0.0',
        'constructs': '^10.0.0'
      }
    }));

    // Create a basic app.ts that will pass syntax but fail synthesis
    const stackDefinitions = stacks.map(stackName => `
      new TestStack(app, '${stackName}');
    `).join('\n');

    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
      import * as cdk from 'aws-cdk-lib';
      
      class TestStack extends cdk.Stack {
        constructor(scope: cdk.App, id: string) {
          super(scope, id);
          // Minimal stack - will work for CLI validation but fail at synthesis
        }
      }
      
      const app = new cdk.App();
      ${stackDefinitions}
    `);

    return projectPath;
  }

  function createFaultyCdkProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'npx ts-node app.ts'
    }));

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name,
      dependencies: { 'aws-cdk-lib': '^2.0.0' }
    }));

    // Create app.ts with syntax error
    fs.writeFileSync(path.join(projectPath, 'app.ts'), `
      import * as cdk from 'aws-cdk-lib';
      // This will cause a synthesis error
      const app = new cdk.App();
      new cdk.Stack(app, 'BrokenStack');
      throw new Error('Intentional synthesis error');
    `);

    return projectPath;
  }

  function createMinimalCdkProject(name: string): string {
    const projectPath = path.join(testDir, name);
    fs.mkdirSync(projectPath);

    fs.writeFileSync(path.join(projectPath, 'cdk.json'), JSON.stringify({
      app: 'echo "{\\"Resources\\": {}}"' // Minimal CloudFormation template
    }));

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
      name
    }));

    return projectPath;
  }
});