import {
  Tree,
  formatFiles,
  joinPathFragments,
} from '@nx/devkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { NewBinderGeneratorSchema } from './schema.js';

function renderTemplate(template: string, vars: Record<string, any>): string {
  let result = template;
  
  // Pre-process special cases
  const processedVars: Record<string, any> = {
    ...vars,
    // Helper for className.replace('BinderStrategy', '')
    classNameShort: vars.className?.replace('BinderStrategy', '') || '',
    // Helper for supportedAccess.map(a => `'${a}'`).join(', ')
    supportedAccessFormatted: Array.isArray(vars.supportedAccess) 
      ? vars.supportedAccess.map((a: string) => `'${a}'`).join(', ')
      : '',
    // Helper for supportedAccess[0] || 'read'
    firstAccess: Array.isArray(vars.supportedAccess) && vars.supportedAccess[0] 
      ? vars.supportedAccess[0] 
      : 'read',
    // Helper for bind method name
    bindMethodName: vars.bindMethodName || `bindTo${vars.capabilityNamePascal || 'Resource'}`,
  };

  // Replace EJS-style templates <%= var %>
  result = result.replace(/<%= (.+?) %>/g, (match, expr) => {
    const trimmed = expr.trim();
    
    // Handle className.replace('BinderStrategy', '')
    if (trimmed.includes("className.replace('BinderStrategy', '')")) {
      return processedVars.classNameShort;
    }
    
    // Handle supportedAccess.map(a => `'${a}'`).join(', ')
    if (trimmed.includes('supportedAccess.map')) {
      return processedVars.supportedAccessFormatted;
    }
    
    // Handle supportedAccess[0] || 'read'
    if (trimmed.includes('supportedAccess[0]')) {
      return processedVars.firstAccess;
    }
    
    // Handle simple variable access (check processedVars first, then original vars)
    if (processedVars[trimmed] !== undefined) {
      return String(processedVars[trimmed]);
    }
    
    // Fallback to original match if we can't process it
    return match;
  });
  
  return result;
}

export default async function newBinderGenerator(
  tree: Tree,
  options: NewBinderGeneratorSchema
) {
  const normalizedName = options.binderName.toLowerCase();
  const binderNamePascal = options.binderName.charAt(0).toUpperCase() + options.binderName.slice(1);
  const className = `${binderNamePascal}BinderStrategy`;
  const categoryPath = `packages/binders/src/strategies/${options.category}`;
  const indexFile = `${categoryPath}/index.ts`;
  const mainIndexFile = `packages/binders/src/index.ts`;
  const supportedAccess = options.supportedAccess || ['read', 'write'];

  // Extract capability name from mainCapability (e.g., "monitoring:alarm" -> "alarm")
  const capabilityName = options.mainCapability.includes(':')
    ? options.mainCapability.split(':').pop() || 'resource'
    : options.mainCapability;
  
  // Convert kebab-case/hyphenated to PascalCase (e.g., "backup-vault" -> "BackupVault")
  const capabilityNamePascal = capabilityName
    .split('-')
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
  
  const bindMethodName = `bindTo${capabilityNamePascal}`;

  const templateVars = {
    ...options,
    normalizedName,
    binderNamePascal,
    className,
    supportedAccess,
    capabilityName,
    capabilityNamePascal,
    bindMethodName,
  };

  // Read and render template files manually
  const filesDir = joinPathFragments(__dirname, './files');
  
  // Generate strategy file
  const strategyTemplatePath = join(filesDir, '__name@normalize__-binder-strategy.ts.template');
  const strategyTemplate = readFileSync(strategyTemplatePath, 'utf-8');
  const strategyContent = renderTemplate(strategyTemplate, templateVars);
  const strategyFilePath = `${categoryPath}/${normalizedName}-binder-strategy.ts`;
  tree.write(strategyFilePath, strategyContent);

  // Generate test file
  const testTemplatePath = join(filesDir, '__tests__/__name@normalize__-binder-strategy.test.ts.template');
  const testTemplate = readFileSync(testTemplatePath, 'utf-8');
  const testContent = renderTemplate(testTemplate, templateVars);
  const testFilePath = `${categoryPath}/__tests__/${normalizedName}-binder-strategy.test.ts`;
  tree.write(testFilePath, testContent);

  // Update the category index.ts to export the new strategy
  if (tree.exists(indexFile)) {
    const indexContent = tree.read(indexFile, 'utf-8') || '';
    const exportLine = `export { ${className} } from './${normalizedName}-binder-strategy.js';`;
    
    // Only add if not already present
    if (!indexContent.includes(exportLine)) {
      const newContent = indexContent.trim() + '\n' + exportLine + '\n';
      tree.write(indexFile, newContent);
    }
  } else {
    // Create index file if it doesn't exist (new category)
    const categoryName = options.category.charAt(0).toUpperCase() + options.category.slice(1);
    tree.write(
      indexFile,
      `/**
 * ${categoryName} Binder Strategies (Unified)
 * 
 * All ${options.category} strategies implementing IUnifiedBinderStrategy with mandatory compliance enforcement
 */

export { ${className} } from './${normalizedName}-binder-strategy.js';
`
    );
  }

  // Update main barrel file to export the new category if it doesn't exist
  if (tree.exists(mainIndexFile)) {
    const mainIndexContent = tree.read(mainIndexFile, 'utf-8') || '';
    const categoryExport = `export * from './strategies/${options.category}';`;
    
    // Only add if category export doesn't exist
    if (!mainIndexContent.includes(categoryExport)) {
      const lines = mainIndexContent.split('\n');
      
      // Find the "// Re-export core contracts" comment to insert before it
      const contractsCommentIndex = lines.findIndex(line => line.includes('// Re-export core contracts'));
      const insertIndex = contractsCommentIndex > 0 ? contractsCommentIndex : lines.length;
      
      // Insert the new export before the core contracts section (alphabetically sorted)
      lines.splice(insertIndex, 0, categoryExport);
      tree.write(mainIndexFile, lines.join('\n'));
    }
  }

  await formatFiles(tree);
}
