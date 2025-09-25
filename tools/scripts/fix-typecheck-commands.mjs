#!/usr/bin/env node

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';

const rootDir = process.cwd();

async function fixTypecheckCommands() {
  try {
    console.log('🔧 Fixing typecheck commands...');

    // Fix packages
    const packagesDir = join(rootDir, 'packages');
    const packages = await readdir(packagesDir, { withFileTypes: true });

    const packageDirs = packages
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    let fixed = 0;

    for (const packageName of packageDirs) {
      const packagePath = join(packagesDir, packageName);
      const projectJsonPath = join(packagePath, 'project.json');

      try {
        await stat(projectJsonPath);
        const projectJson = JSON.parse(await readFile(projectJsonPath, 'utf8'));

        if (projectJson.targets?.typecheck?.options?.command?.includes('tsconfig.build.json')) {
          projectJson.targets.typecheck.options.command = 'tsc --noEmit';
          await writeFile(projectJsonPath, JSON.stringify(projectJson, null, 2));
          console.log(`✓ Fixed typecheck command for ${packageName}`);
          fixed++;
        }
      } catch (error) {
        // Skip if no project.json or other error
      }
    }

    // Fix components
    const componentsDir = join(rootDir, 'packages/components');
    const components = await readdir(componentsDir, { withFileTypes: true });

    const componentDirs = components
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const componentName of componentDirs) {
      const componentPath = join(componentsDir, componentName);
      const projectJsonPath = join(componentPath, 'project.json');

      try {
        await stat(projectJsonPath);
        const projectJson = JSON.parse(await readFile(projectJsonPath, 'utf8'));

        if (projectJson.targets?.typecheck?.options?.command?.includes('tsconfig.build.json')) {
          projectJson.targets.typecheck.options.command = 'tsc --noEmit';
          await writeFile(projectJsonPath, JSON.stringify(projectJson, null, 2));
          console.log(`✓ Fixed typecheck command for ${componentName}`);
          fixed++;
        }
      } catch (error) {
        // Skip if no project.json or other error
      }
    }

    console.log(`\n✅ Typecheck command fixes completed!`);
    console.log(`   Fixed: ${fixed} projects`);

  } catch (error) {
    console.error('❌ Error fixing typecheck commands:', error);
    process.exit(1);
  }
}

fixTypecheckCommands();
