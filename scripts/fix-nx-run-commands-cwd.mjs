#!/usr/bin/env node
/**
 * Fix nx:run-commands targets by adding explicit cwd configuration.
 * 
 * This script scans all component project.json files and adds the `cwd` option
 * to `nx:run-commands` targets that are missing it. This fixes hanging commands
 * when executed by non-interactive agents (like Cursor agent).
 * 
 * Rules:
 * - Build commands with full paths: add `cwd: "{workspaceRoot}"`
 * - Typecheck commands: add `cwd: "{projectRoot}"` or convert to full paths
 * - Lint commands: add `cwd: "{projectRoot}"`
 * - Clean commands: add `cwd: "{workspaceRoot}"` if using full paths
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');

/**
 * Check if a path is absolute or relative to workspace root
 */
function isFullPath(command) {
  return command.includes('packages/') || command.includes('pnpm exec');
}

/**
 * Check if a command uses relative paths
 */
function usesRelativePath(command) {
  return command.includes('tsconfig.json') || 
         command.includes('tsconfig.build.json') ||
         command.includes('./') ||
         command.startsWith('tsc') ||
         command.startsWith('eslint') ||
         command.startsWith('rimraf');
}

/**
 * Get appropriate cwd for a command based on its pattern
 */
function getCwdForCommand(targetName, command, hasCwd) {
  // If cwd already exists, don't change it
  if (hasCwd) {
    return null; // Keep existing
  }

  // Build commands with full paths
  if (targetName === 'build' && isFullPath(command)) {
    return '{workspaceRoot}';
  }

  // Typecheck commands - prefer full paths but support relative with projectRoot
  if (targetName === 'typecheck') {
    if (isFullPath(command)) {
      return '{workspaceRoot}';
    } else {
      return '{projectRoot}';
    }
  }

  // Clean commands with full paths
  if (targetName === 'clean' && isFullPath(command)) {
    return '{workspaceRoot}';
  }

  // Lint commands - use projectRoot for relative paths
  if (targetName === 'lint') {
    return '{projectRoot}';
  }

  // Default: use workspaceRoot for full paths, projectRoot for relative
  if (isFullPath(command)) {
    return '{workspaceRoot}';
  } else if (usesRelativePath(command)) {
    return '{projectRoot}';
  }

  return '{workspaceRoot}'; // Safe default
}

/**
 * Process a single project.json file
 */
function processProjectJson(filePath) {
  try {
    let modified = false;
    const content = JSON.parse(readFileSync(filePath, 'utf8'));
    
    if (!content.targets) {
      return { modified: false, changes: [], error: null };
    }

    const changes = [];

    for (const [targetName, targetConfig] of Object.entries(content.targets)) {
      if (targetConfig.executor === 'nx:run-commands' && targetConfig.options) {
        let command = targetConfig.options.command;
        const hasCwd = 'cwd' in targetConfig.options;
        
        if (!command) {
          continue;
        }

        // Replace pnpm exec tsc with direct path to avoid sandbox issues
        if (command.includes('pnpm exec tsc')) {
          command = command.replace(/pnpm exec tsc/g, 'node_modules/.bin/tsc');
          targetConfig.options.command = command;
          modified = true;
          changes.push(`${targetName}: replaced "pnpm exec tsc" with "node_modules/.bin/tsc"`);
        }

        const suggestedCwd = getCwdForCommand(targetName, command, hasCwd);
        
        if (suggestedCwd && !hasCwd) {
          targetConfig.options.cwd = suggestedCwd;
          modified = true;
          changes.push(`${targetName}: added cwd="${suggestedCwd}"`);
        }
      }
    }

    if (modified) {
      writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
    }

    return { modified, changes, error: null };
  } catch (error) {
    return { modified: false, changes: [], error: error.message };
  }
}

/**
 * Recursively find all project.json files in components directory
 */
function findProjectJsonFiles(dir) {
  const files = [];
  try {
    if (!statSync(dir).isDirectory()) {
      return files;
    }
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Check if this directory contains a project.json
        const projectJsonPath = join(fullPath, 'project.json');
        try {
          if (statSync(projectJsonPath).isFile()) {
            files.push(projectJsonPath);
          }
        } catch (err) {
          // File doesn't exist, skip
        }
      }
    }
  } catch (err) {
    // Ignore errors (directory doesn't exist, etc.)
    console.error(`Error scanning ${dir}:`, err.message);
  }
  return files;
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Fixing nx:run-commands cwd configuration...\n');

  // Find all component project.json files
  const componentsDir = join(workspaceRoot, 'packages', 'components');
  const projectFiles = findProjectJsonFiles(componentsDir);

  console.log(`Found ${projectFiles.length} component project.json files\n`);

  let totalModified = 0;
  let totalErrors = 0;
  const results = [];

  for (const filePath of projectFiles) {
    const componentName = filePath.split('/').slice(-2, -1)[0];
    const { modified, changes, error } = processProjectJson(filePath);

    if (error) {
      totalErrors++;
      console.log(`❌ ${componentName}: Error - ${error}`);
      continue;
    }

    if (modified) {
      totalModified++;
      results.push({ component: componentName, changes });
      console.log(`✅ ${componentName}:`);
      changes.forEach(change => console.log(`   - ${change}`));
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Total files processed: ${projectFiles.length}`);
  console.log(`   - Files modified: ${totalModified}`);
  console.log(`   - Files unchanged: ${projectFiles.length - totalModified - totalErrors}`);
  if (totalErrors > 0) {
    console.log(`   - Errors: ${totalErrors}`);
  }

  if (totalModified > 0) {
    console.log(`\n✅ Successfully fixed ${totalModified} component(s)!`);
    console.log(`\nNext steps:`);
    console.log(`   1. Review the changes with: git diff`);
    console.log(`   2. Test a build: pnpm nx build @shinobi/components-<name>`);
    console.log(`   3. Commit the changes`);
  } else {
    console.log(`\n✅ All components already have proper cwd configuration!`);
  }
}

main();

