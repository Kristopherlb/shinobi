#!/usr/bin/env node

import { readdir, writeFile, readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const rootDir = process.cwd();

// Standardized project.json template
const createProjectJson = (packageName, packagePath) => {
  const isApp = packagePath.includes('/apps/');
  const isComponent = packagePath.includes('/components/');

  return {
    "name": packageName,
    "root": packagePath,
    "sourceRoot": isApp ? `${packagePath}/src` : `${packagePath}/src`,
    "projectType": isApp ? "application" : "library",
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
          "jestConfig": `${packagePath}/jest.config.ts`,
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
    "tags": isComponent ? ["type:lib", "scope:components"] : ["type:lib", "scope:core"]
  };
};

// Standardized tsconfig.json template
const createTsConfig = (packagePath) => {
  return {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "rootDir": "src",
      "outDir": "dist"
    },
    "include": ["src/**/*"]
  };
};

// Standardized tsconfig.build.json template
const createTsConfigBuild = (packagePath) => {
  return {
    "extends": "./tsconfig.json",
    "compilerOptions": {
      "composite": true
    },
    "references": []
  };
};

// Standardized jest.config.ts template
const createJestConfig = (packageName, packagePath) => {
  return `export default {
  displayName: '${packageName}',
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    '^@shinobi/(.*)$': '<rootDir>/../$1/src',
    '^@platform/(.*)$': '<rootDir>/../$1/src'
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts']
};`;
};

async function fixProjectConfigs() {
  try {
    console.log('🔧 Fixing project configurations...');

    // Get all packages
    const packagesDir = join(rootDir, 'packages');
    const packages = await readdir(packagesDir, { withFileTypes: true });

    const packageDirs = packages
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Found ${packageDirs.length} packages to process...`);

    let fixed = 0;
    let skipped = 0;

    for (const packageName of packageDirs) {
      const packagePath = `packages/${packageName}`;
      const fullPath = join(rootDir, packagePath);

      // Check if package has src directory
      try {
        await stat(join(fullPath, 'src'));
      } catch (error) {
        console.log(`⚠️  ${packageName} has no src directory, skipping`);
        skipped++;
        continue;
      }

      // Fix project.json
      const projectJsonPath = join(fullPath, 'project.json');
      const projectJson = createProjectJson(packageName, packagePath);
      await writeFile(projectJsonPath, JSON.stringify(projectJson, null, 2));
      console.log(`✓ Fixed project.json for ${packageName}`);

      // Fix tsconfig.json
      const tsconfigPath = join(fullPath, 'tsconfig.json');
      const tsconfig = createTsConfig(packagePath);
      await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      console.log(`✓ Fixed tsconfig.json for ${packageName}`);

      // Fix tsconfig.build.json
      const tsconfigBuildPath = join(fullPath, 'tsconfig.build.json');
      const tsconfigBuild = createTsConfigBuild(packagePath);
      await writeFile(tsconfigBuildPath, JSON.stringify(tsconfigBuild, null, 2));
      console.log(`✓ Fixed tsconfig.build.json for ${packageName}`);

      // Fix jest.config.ts
      const jestConfigPath = join(fullPath, 'jest.config.ts');
      const jestConfig = createJestConfig(packageName, packagePath);
      await writeFile(jestConfigPath, jestConfig);
      console.log(`✓ Fixed jest.config.ts for ${packageName}`);

      fixed++;
    }

    console.log(`\n✅ Project configuration fixes completed!`);
    console.log(`   Fixed: ${fixed} packages`);
    console.log(`   Skipped: ${skipped} packages`);

  } catch (error) {
    console.error('❌ Error fixing project configs:', error);
    process.exit(1);
  }
}

fixProjectConfigs();
