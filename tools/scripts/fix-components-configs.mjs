#!/usr/bin/env node

import { readdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';

const rootDir = process.cwd();

// Standardized project.json template for components
const createComponentProjectJson = (componentName) => {
  return {
    "name": `@platform/components-${componentName}`,
    "root": `packages/components/${componentName}`,
    "sourceRoot": `packages/components/${componentName}/src`,
    "projectType": "library",
    "targets": {
      "build": {
        "executor": "nx:run-commands",
        "options": {
          "command": "tsc -b"
        },
        "inputs": [
          "default",
          "{projectRoot}/tsconfig.json",
          "{projectRoot}/src/**"
        ],
        "outputs": ["{projectRoot}/dist"]
      },
      "typecheck": {
        "executor": "nx:run-commands",
        "options": {
          "command": "tsc -p tsconfig.build.json --noEmit"
        }
      },
      "test": {
        "executor": "@nx/jest:jest",
        "outputs": ["{projectRoot}/coverage"],
        "options": {
          "jestConfig": `packages/components/${componentName}/jest.config.ts`,
          "passWithNoTests": true
        }
      },
      "lint": {
        "executor": "nx:run-commands",
        "options": {
          "command": "eslint . --ext .ts,.tsx"
        }
      }
    },
    "tags": ["type:lib", "scope:components"]
  };
};

// Standardized tsconfig.json template
const createTsConfig = (componentName) => {
  return {
    "extends": "../../../tsconfig.base.json",
    "compilerOptions": {
      "rootDir": "src",
      "outDir": "dist"
    },
    "include": ["src/**/*"]
  };
};

// Standardized tsconfig.build.json template
const createTsConfigBuild = (componentName) => {
  return {
    "extends": "./tsconfig.json",
    "compilerOptions": {
      "composite": true
    },
    "references": []
  };
};

// Standardized jest.config.ts template
const createJestConfig = (componentName) => {
  return `export default {
  displayName: '@platform/components-${componentName}',
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    '^@shinobi/(.*)$': '<rootDir>/../../$1/src',
    '^@platform/(.*)$': '<rootDir>/../../$1/src'
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts']
};`;
};

async function fixComponentConfigs() {
  try {
    console.log('🔧 Fixing component configurations...');

    // Get all components
    const componentsDir = join(rootDir, 'packages/components');
    const components = await readdir(componentsDir, { withFileTypes: true });

    const componentDirs = components
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Found ${componentDirs.length} components to process...`);

    let fixed = 0;
    let skipped = 0;

    for (const componentName of componentDirs) {
      const componentPath = join(componentsDir, componentName);

      // Check if component has src directory
      try {
        await stat(join(componentPath, 'src'));
      } catch (error) {
        console.log(`⚠️  ${componentName} has no src directory, skipping`);
        skipped++;
        continue;
      }

      // Fix project.json
      const projectJsonPath = join(componentPath, 'project.json');
      const projectJson = createComponentProjectJson(componentName);
      await writeFile(projectJsonPath, JSON.stringify(projectJson, null, 2));
      console.log(`✓ Fixed project.json for ${componentName}`);

      // Fix tsconfig.json
      const tsconfigPath = join(componentPath, 'tsconfig.json');
      const tsconfig = createTsConfig(componentName);
      await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      console.log(`✓ Fixed tsconfig.json for ${componentName}`);

      // Fix tsconfig.build.json
      const tsconfigBuildPath = join(componentPath, 'tsconfig.build.json');
      const tsconfigBuild = createTsConfigBuild(componentName);
      await writeFile(tsconfigBuildPath, JSON.stringify(tsconfigBuild, null, 2));
      console.log(`✓ Fixed tsconfig.build.json for ${componentName}`);

      // Fix jest.config.ts
      const jestConfigPath = join(componentPath, 'jest.config.ts');
      const jestConfig = createJestConfig(componentName);
      await writeFile(jestConfigPath, jestConfig);
      console.log(`✓ Fixed jest.config.ts for ${componentName}`);

      fixed++;
    }

    console.log(`\n✅ Component configuration fixes completed!`);
    console.log(`   Fixed: ${fixed} components`);
    console.log(`   Skipped: ${skipped} components`);

  } catch (error) {
    console.error('❌ Error fixing component configs:', error);
    process.exit(1);
  }
}

fixComponentConfigs();
