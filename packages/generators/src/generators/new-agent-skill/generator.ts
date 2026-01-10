import {
  Tree,
  formatFiles,
  joinPathFragments,
  logger,
} from '@nx/devkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { NewAgentSkillGeneratorSchema } from './schema.js';

/**
 * Validates skill name against Agent Skills specification
 * @param skillName - The skill name to validate
 * @throws Error if validation fails
 */
function validateSkillName(skillName: string): void {
  // 1-64 characters
  if (skillName.length < 1 || skillName.length > 64) {
    throw new Error(
      `Skill name must be 1-64 characters. Got: ${skillName.length} characters.`
    );
  }

  // Lowercase alphanumeric and hyphens only
  if (!/^[a-z0-9-]+$/.test(skillName)) {
    throw new Error(
      `Skill name may only contain lowercase letters, numbers, and hyphens. Got: "${skillName}"`
    );
  }

  // No leading/trailing hyphens
  if (skillName.startsWith('-') || skillName.endsWith('-')) {
    throw new Error(
      `Skill name must not start or end with a hyphen. Got: "${skillName}"`
    );
  }

  // No consecutive hyphens
  if (skillName.includes('--')) {
    throw new Error(
      `Skill name must not contain consecutive hyphens. Got: "${skillName}"`
    );
  }
}

/**
 * Enhanced template renderer supporting EJS-style conditionals and expressions
 */
function renderTemplate(template: string, vars: Record<string, any>): string {
  let result = template;
  const localVars = { ...vars };

  // Process variable assignments first: <% const var = value; %>
  result = result.replace(
    /<% const (\w+) = (.+?); %>/g,
    (match, varName, valueExpr) => {
      const value = evaluateExpression(valueExpr, localVars);
      localVars[varName] = value;
      return '';
    }
  );

  // Process nested conditionals iteratively (innermost first)
  let changed = true;
  let iterations = 0;
  const maxIterations = 10; // Prevent infinite loops

  while (changed && iterations < maxIterations) {
    iterations++;
    const before = result;

    // Process else-if chains: <% if (c1) { %>...<% } else if (c2) { %>...<% } else { %>...<% } %>
    result = result.replace(
      /<% if \(([^)]+)\) \{ %>([\s\S]*?)<% \} else if \(([^)]+)\) \{ %>([\s\S]*?)<% \} else \{ %>([\s\S]*?)<% \} %>/g,
      (match, condition1, content1, condition2, content2, content3) => {
        if (evaluateCondition(condition1, localVars)) {
          return content1;
        } else if (evaluateCondition(condition2, localVars)) {
          return content2;
        } else {
          return content3;
        }
      }
    );

    // Process if-else: <% if (condition) { %> ... <% } else { %> ... <% } %>
    result = result.replace(
      /<% if \(([^)]+)\) \{ %>([\s\S]*?)<% \} else \{ %>([\s\S]*?)<% \} %>/g,
      (match, condition, ifContent, elseContent) => {
        const conditionValue = evaluateCondition(condition, localVars);
        return conditionValue ? ifContent : elseContent;
      }
    );

    // Process simple if: <% if (condition) { %> ... <% } %>
    // Use negative lookahead to ensure we don't match if-else chains
    result = result.replace(
      /<% if \(([^)]+)\) \{ %>([\s\S]*?)<% \}(?!\s*else)/g,
      (match, condition, content) => {
        const conditionValue = evaluateCondition(condition, localVars);
        return conditionValue ? content : '';
      }
    );

    changed = before !== result;
  }

  // Replace EJS-style variable interpolation: <%= var %>
  result = result.replace(/<%= (.+?) %>/g, (match, expr) => {
    const trimmed = expr.trim();
    const value = evaluateExpression(trimmed, localVars);
    return String(value ?? '');
  });

  return result;
}

/**
 * Evaluates a condition expression
 */
function evaluateCondition(condition: string, vars: Record<string, any>): boolean {
  const trimmed = condition.trim();

  // Handle === comparisons
  if (trimmed.includes('===')) {
    const [left, right] = trimmed.split('===').map((s) => s.trim().replace(/['"]/g, ''));
    const leftValue = evaluateExpression(left, vars);
    return leftValue === right;
  }

  // Handle || (OR) operations
  if (trimmed.includes('||')) {
    const parts = trimmed.split('||').map((s) => s.trim());
    return parts.some((part) => evaluateCondition(part, vars));
  }

  // Handle && (AND) operations
  if (trimmed.includes('&&')) {
    const parts = trimmed.split('&&').map((s) => s.trim());
    return parts.every((part) => evaluateCondition(part, vars));
  }

  // Handle simple variable truthiness
  const value = evaluateExpression(trimmed, vars);
  return Boolean(value);
}

/**
 * Evaluates an expression and returns its value
 */
function evaluateExpression(expr: string, vars: Record<string, any>): any {
  const trimmed = expr.trim();

  // Handle property access: var.property
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    let value = vars[parts[0]];
    for (let i = 1; i < parts.length; i++) {
      value = value?.[parts[i]];
    }
    return value;
  }

  // Handle array access: var[index]
  if (trimmed.includes('[') && trimmed.includes(']')) {
    const match = trimmed.match(/(\w+)\[(\d+)\]/);
    if (match) {
      const [, varName, index] = match;
      const arr = vars[varName];
      return arr?.[parseInt(index, 10)];
    }
  }

  // Simple variable access
  return vars[trimmed];
}

export default async function newAgentSkillGenerator(
  tree: Tree,
  options: NewAgentSkillGeneratorSchema
) {
  // Validate skill name
  validateSkillName(options.skillName);

  const skillDir = joinPathFragments('skills', options.skillName);

  // Check if skill already exists
  if (tree.exists(skillDir)) {
    throw new Error(
      `Skill "${options.skillName}" already exists at ${skillDir}. Please choose a different name.`
    );
  }

  // Check for anti-patterns (README.md, CHANGELOG.md)
  const readmePath = joinPathFragments(skillDir, 'README.md');
  const changelogPath = joinPathFragments(skillDir, 'CHANGELOG.md');
  
  if (tree.exists(readmePath) || tree.exists(changelogPath)) {
    logger.warn(
      `⚠️  Warning: README.md or CHANGELOG.md detected in ${skillDir}. ` +
      `Agent Skills use SKILL.md for documentation following Progressive Disclosure pattern. ` +
      `Consider consolidating content into SKILL.md or moving to references/ directory.`
    );
  }

  // Normalize optional fields (convert false/empty/null to undefined for optional fields)
  // Nx may set skipped prompts to false, null, or empty string
  const normalizeOptional = (value: any): string | undefined => {
    if (value === false || value === '' || value === null || value === undefined) {
      return undefined;
    }
    // Convert to string and trim - if empty after trim, return undefined
    const strValue = String(value).trim();
    return strValue === '' ? undefined : strValue;
  };

  // Prepare template variables
  const templateVars = {
    skillName: options.skillName,
    description: options.description,
    license: normalizeOptional(options.license),
    compatibility: normalizeOptional(options.compatibility),
    author: normalizeOptional(options.author),
    version: normalizeOptional(options.version),
    degreesOfFreedom: options.degreesOfFreedom || 'Medium',
  };

  // Read and render template files
  const filesDir = joinPathFragments(__dirname, './files');

  // Generate SKILL.md
  const skillTemplatePath = join(filesDir, 'SKILL.md.template');
  const skillTemplate = readFileSync(skillTemplatePath, 'utf-8');
  const skillContent = renderTemplate(skillTemplate, templateVars);
  const skillFilePath = joinPathFragments(skillDir, 'SKILL.md');
  tree.write(skillFilePath, skillContent);

  // Auto-create Progressive Disclosure directories with .gitkeep files
  const progressiveDisclosureDirs = ['scripts', 'references', 'assets'];
  
  for (const dir of progressiveDisclosureDirs) {
    const dirPath = joinPathFragments(skillDir, dir);
    const gitkeepTemplatePath = join(filesDir, dir, '.gitkeep.template');
    const gitkeepTemplate = readFileSync(gitkeepTemplatePath, 'utf-8');
    const gitkeepContent = renderTemplate(gitkeepTemplate, templateVars);
    const gitkeepFilePath = joinPathFragments(dirPath, '.gitkeep');
    tree.write(gitkeepFilePath, gitkeepContent);
  }

  // Generate test files (3-layer testing hierarchy)
  const testsDir = joinPathFragments(skillDir, 'tests');
  
  // Structure test (Layer 1)
  const structureTestTemplatePath = join(filesDir, 'tests', 'structure.test.ts.template');
  const structureTestTemplate = readFileSync(structureTestTemplatePath, 'utf-8');
  const structureTestContent = renderTemplate(structureTestTemplate, templateVars);
  tree.write(joinPathFragments(testsDir, 'structure.test.ts'), structureTestContent);

  // Scripts test (Layer 2)
  const scriptsTestTemplatePath = join(filesDir, 'tests', 'scripts.test.ts.template');
  const scriptsTestTemplate = readFileSync(scriptsTestTemplatePath, 'utf-8');
  const scriptsTestContent = renderTemplate(scriptsTestTemplate, templateVars);
  tree.write(joinPathFragments(testsDir, 'scripts.test.ts'), scriptsTestContent);

  // Behavior evals (Layer 3)
  const behaviorMetaTemplatePath = join(filesDir, 'tests', 'behavior.meta.json.template');
  const behaviorMetaTemplate = readFileSync(behaviorMetaTemplatePath, 'utf-8');
  const behaviorMetaContent = renderTemplate(behaviorMetaTemplate, templateVars);
  tree.write(joinPathFragments(testsDir, 'behavior.meta.json'), behaviorMetaContent);

  // Tests directory .gitkeep
  const testsGitkeepTemplatePath = join(filesDir, 'tests', '.gitkeep.template');
  const testsGitkeepTemplate = readFileSync(testsGitkeepTemplatePath, 'utf-8');
  const testsGitkeepContent = renderTemplate(testsGitkeepTemplate, templateVars);
  tree.write(joinPathFragments(testsDir, '.gitkeep'), testsGitkeepContent);

  // Generate project.json for Nx test support
  const projectJsonTemplatePath = join(filesDir, 'project.json.template');
  const projectJsonTemplate = readFileSync(projectJsonTemplatePath, 'utf-8');
  const projectJsonContent = renderTemplate(projectJsonTemplate, templateVars);
  tree.write(joinPathFragments(skillDir, 'project.json'), projectJsonContent);

  // Generate vitest.config.ts
  const vitestConfigTemplatePath = join(filesDir, 'vitest.config.ts.template');
  const vitestConfigTemplate = readFileSync(vitestConfigTemplatePath, 'utf-8');
  const vitestConfigContent = renderTemplate(vitestConfigTemplate, templateVars);
  tree.write(joinPathFragments(skillDir, 'vitest.config.ts'), vitestConfigContent);

  // Generate evidence script (for FedRAMP compliance)
  const evidenceScriptTemplatePath = join(filesDir, 'scripts', 'generate-evidence.sh.template');
  const evidenceScriptTemplate = readFileSync(evidenceScriptTemplatePath, 'utf-8');
  const evidenceScriptContent = renderTemplate(evidenceScriptTemplate, templateVars);
  const evidenceScriptPath = joinPathFragments(skillDir, 'scripts', 'generate-evidence.sh');
  tree.write(evidenceScriptPath, evidenceScriptContent);
  // Note: Making executable requires post-generation step or manual chmod

  logger.info(`✅ Successfully created Agent Skill "${options.skillName}" at ${skillDir}`);
  logger.info(`   - SKILL.md with ${templateVars.degreesOfFreedom} degrees of freedom`);
  logger.info(`   - Progressive Disclosure directories: scripts/, references/, assets/`);
  logger.info(`   - Test infrastructure: tests/ (3-layer testing hierarchy)`);
  logger.info(`   - Nx integration: project.json, vitest.config.ts`);
  logger.info(`   - Evidence generation: scripts/generate-evidence.sh`);
  logger.info(`   - Next: Run 'chmod +x scripts/generate-evidence.sh' to make it executable`);

  await formatFiles(tree);
}

