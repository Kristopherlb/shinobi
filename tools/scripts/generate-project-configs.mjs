#!/usr/bin/env node

import { readdir, writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../../..');

async function generateProjectConfigs() {
  try {
    // Read the template
    const templatePath = join(rootDir, 'templates/component-project.json');
    const template = await readFile(templatePath, 'utf8');

    // Get all component directories
    const componentsDir = join(rootDir, 'packages/components');
    const components = await readdir(componentsDir, { withFileTypes: true });

    const componentDirs = components
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Found ${componentDirs.length} components to process...`);

    for (const componentName of componentDirs) {
      const projectJsonPath = join(componentsDir, componentName, 'project.json');

      // Check if project.json already exists
      try {
        await readFile(projectJsonPath, 'utf8');
        console.log(`✓ ${componentName} already has project.json`);
        continue;
      } catch (error) {
        // File doesn't exist, create it
      }

      // Generate project.json from template
      const projectConfig = template.replace(/\{\{componentName\}\}/g, componentName);

      await writeFile(projectJsonPath, projectConfig);
      console.log(`✓ Created project.json for ${componentName}`);
    }

    console.log('\n✅ All component project.json files generated successfully!');

  } catch (error) {
    console.error('❌ Error generating project configs:', error);
    process.exit(1);
  }
}

generateProjectConfigs();
