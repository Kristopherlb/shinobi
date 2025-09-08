/**
 * Platform Inventory Tool - CLI Command Implementation
 * Implements Platform Inventory Tool Specification v1.0
 * 
 * @file src/cli/inventory.ts
 */

import { Command } from 'commander';
import { Project, Node, SyntaxKind, NewExpression, ImportDeclaration } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger';

interface ConstructUsage {
  type: string;
  count: number;
  locations: Array<{
    file: string;
    line: number;
    column: number;
  }>;
}

interface PatternCandidate {
  name: string;
  pattern: string[];
  frequency: number;
  priority: 'High' | 'Medium' | 'Low';
  files: string[];
  recommendation: string;
}

interface InventoryAnalysis {
  rawInventory: Map<string, ConstructUsage>;
  patterns: PatternCandidate[];
  unmappableResources: Array<{
    file: string;
    line: number;
    reason: string;
    code: string;
  }>;
  summary: {
    totalFiles: number;
    totalConstructs: number;
    uniqueConstructTypes: number;
    patternsFound: number;
  };
}

export class InventoryCommand {
  private project: Project;
  private targetDirectory: string;
  private analysis: InventoryAnalysis;

  constructor() {
    this.project = new Project();
    this.analysis = {
      rawInventory: new Map(),
      patterns: [],
      unmappableResources: [],
      summary: {
        totalFiles: 0,
        totalConstructs: 0,
        uniqueConstructTypes: 0,
        patternsFound: 0
      }
    };
  }

  /**
   * Main entry point for inventory command
   */
  public async execute(directory: string, options: any): Promise<void> {
    this.targetDirectory = path.resolve(directory);
    
    logger.info(chalk.cyan('🔍 Platform Inventory Tool v1.0'));
    logger.info(chalk.gray(`Analyzing directory: ${this.targetDirectory}`));
    
    try {
      // Phase 1: Discovery - Scan all TypeScript files
      await this.discoverConstructs();
      
      // Phase 2: Pattern Analysis - Identify common groupings
      await this.analyzePatterns();
      
      // Phase 3: Report Generation - Create INVENTORY_REPORT.md
      await this.generateReport();
      
      logger.info(chalk.green('✅ Inventory analysis complete!'));
      logger.info(chalk.cyan(`📄 Report generated: ${path.join(this.targetDirectory, 'INVENTORY_REPORT.md')}`));
      
    } catch (error) {
      logger.error(chalk.red('❌ Inventory analysis failed:'), error);
      throw error;
    }
  }

  /**
   * Phase 1: Discover all CDK construct usages
   */
  private async discoverConstructs(): Promise<void> {
    logger.info(chalk.yellow('📂 Phase 1: Discovering CDK constructs...'));
    
    // Add all TypeScript files to the project
    const tsFiles = this.findTypeScriptFiles(this.targetDirectory);
    this.project.addSourceFilesAtPaths(tsFiles);
    
    this.analysis.summary.totalFiles = tsFiles.length;
    logger.info(chalk.gray(`Found ${tsFiles.length} TypeScript files`));
    
    // Analyze each source file
    for (const sourceFile of this.project.getSourceFiles()) {
      await this.analyzeSourceFile(sourceFile);
    }
    
    this.analysis.summary.uniqueConstructTypes = this.analysis.rawInventory.size;
    this.analysis.summary.totalConstructs = Array.from(this.analysis.rawInventory.values())
      .reduce((total, usage) => total + usage.count, 0);
    
    logger.info(chalk.green(`✅ Found ${this.analysis.summary.totalConstructs} construct usages of ${this.analysis.summary.uniqueConstructTypes} types`));
  }

  /**
   * Analyze a single source file for CDK construct usage
   */
  private async analyzeSourceFile(sourceFile: any): Promise<void> {
    const filePath = sourceFile.getFilePath();
    const relativePath = path.relative(this.targetDirectory, filePath);
    
    // Get all imports from aws-cdk-lib
    const cdkImports = this.getCdkImports(sourceFile);
    if (cdkImports.size === 0) {
      return; // No CDK imports, skip this file
    }
    
    // Find all "new X(...)" expressions
    const newExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression);
    
    for (const newExpr of newExpressions) {
      await this.analyzeNewExpression(newExpr, cdkImports, relativePath);
    }
  }

  /**
   * Extract CDK imports from a source file
   */
  private getCdkImports(sourceFile: any): Set<string> {
    const cdkImports = new Set<string>();
    
    const importDeclarations = sourceFile.getImportDeclarations();
    
    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      
      // Look for imports from aws-cdk-lib or aws-cdk-lib/aws-*
      if (moduleSpecifier.startsWith('aws-cdk-lib/aws-') || moduleSpecifier === 'aws-cdk-lib') {
        const importClause = importDecl.getImportClause();
        if (importClause) {
          const namedImports = importClause.getNamedImports();
          if (namedImports) {
            for (const namedImport of namedImports.getElements()) {
              cdkImports.add(namedImport.getName());
            }
          }
          
          // Handle namespace imports like "* as ec2"
          const namespaceImport = importClause.getNamespaceImport();
          if (namespaceImport) {
            cdkImports.add(namespaceImport.getName());
          }
        }
      }
    }
    
    return cdkImports;
  }

  /**
   * Analyze a "new X(...)" expression to see if it's a CDK construct
   */
  private async analyzeNewExpression(
    newExpr: NewExpression, 
    cdkImports: Set<string>, 
    filePath: string
  ): Promise<void> {
    const expression = newExpr.getExpression();
    let constructType: string | null = null;
    
    // Handle different patterns: "new Bucket(...)", "new s3.Bucket(...)", etc.
    if (Node.isIdentifier(expression)) {
      const name = expression.getText();
      if (cdkImports.has(name)) {
        constructType = name;
      }
    } else if (Node.isPropertyAccessExpression(expression)) {
      const object = expression.getExpression();
      const property = expression.getName();
      
      if (Node.isIdentifier(object)) {
        const namespace = object.getText();
        if (cdkImports.has(namespace)) {
          constructType = `${namespace}.${property}`;
        }
      }
    }
    
    if (constructType) {
      // Check if this is in a complex context (inside loops, conditions, etc.)
      if (this.isInComplexContext(newExpr)) {
        this.analysis.unmappableResources.push({
          file: filePath,
          line: newExpr.getStartLineNumber(),
          reason: 'Construct created in complex imperative context',
          code: newExpr.getText().substring(0, 100) + '...'
        });
        return;
      }
      
      // Record this construct usage
      const usage = this.analysis.rawInventory.get(constructType) || {
        type: constructType,
        count: 0,
        locations: []
      };
      
      usage.count++;
      usage.locations.push({
        file: filePath,
        line: newExpr.getStartLineNumber(),
        column: newExpr.getStartColumnNumber()
      });
      
      this.analysis.rawInventory.set(constructType, usage);
    }
  }

  /**
   * Check if a construct is created in a complex context (loops, conditions, etc.)
   */
  private isInComplexContext(node: Node): boolean {
    let parent = node.getParent();
    
    while (parent) {
      const kind = parent.getKind();
      
      // Check for control flow statements
      if ([
        SyntaxKind.ForStatement,
        SyntaxKind.ForInStatement,
        SyntaxKind.ForOfStatement,
        SyntaxKind.WhileStatement,
        SyntaxKind.DoStatement,
        SyntaxKind.IfStatement,
        SyntaxKind.SwitchStatement,
        SyntaxKind.TryStatement
      ].includes(kind)) {
        return true;
      }
      
      parent = parent.getParent();
    }
    
    return false;
  }

  /**
   * Phase 2: Analyze patterns of co-located constructs
   */
  private async analyzePatterns(): Promise<void> {
    logger.info(chalk.yellow('🔍 Phase 2: Analyzing construct patterns...'));
    
    // Group constructs by file to find co-location patterns
    const fileConstructs = new Map<string, string[]>();
    
    for (const [constructType, usage] of this.analysis.rawInventory) {
      for (const location of usage.locations) {
        const constructs = fileConstructs.get(location.file) || [];
        constructs.push(constructType);
        fileConstructs.set(location.file, constructs);
      }
    }
    
    // Identify common patterns
    const patternCounts = new Map<string, { count: number; files: string[] }>();
    
    for (const [file, constructs] of fileConstructs) {
      if (constructs.length < 2) continue; // Need at least 2 constructs for a pattern
      
      // Sort constructs to normalize pattern
      const pattern = constructs.sort().join(' -> ');
      const existing = patternCounts.get(pattern) || { count: 0, files: [] };
      existing.count++;
      existing.files.push(file);
      patternCounts.set(pattern, existing);
    }
    
    // Convert to pattern candidates
    for (const [pattern, data] of patternCounts) {
      if (data.count >= 2) { // Only patterns that appear at least twice
        const candidate = this.classifyPattern(pattern, data);
        this.analysis.patterns.push(candidate);
      }
    }
    
    // Sort patterns by frequency (highest first)
    this.analysis.patterns.sort((a, b) => b.frequency - a.frequency);
    
    this.analysis.summary.patternsFound = this.analysis.patterns.length;
    logger.info(chalk.green(`✅ Identified ${this.analysis.patterns.length} recurring patterns`));
  }

  /**
   * Classify and prioritize a pattern
   */
  private classifyPattern(pattern: string, data: { count: number; files: string[] }): PatternCandidate {
    const constructs = pattern.split(' -> ');
    
    // High-value patterns (common microservice patterns)
    const highValuePatterns = [
      ['apigateway.RestApi', 'lambda.Function', 'dynamodb.Table'],
      ['lambda.Function', 's3.Bucket', 'sqs.Queue'],
      ['ec2.Vpc', 'rds.DatabaseInstance', 'ec2.SecurityGroup'],
      ['ecs.Cluster', 'elbv2.ApplicationLoadBalancer', 'ec2.Vpc']
    ];
    
    // Check if this matches a high-value pattern
    let priority: 'High' | 'Medium' | 'Low' = 'Low';
    let name = 'unknown-pattern';
    let recommendation = 'Consider creating a reusable component for this pattern.';
    
    for (const hvPattern of highValuePatterns) {
      if (this.arraysEqual(constructs.sort(), hvPattern.sort())) {
        priority = 'High';
        if (hvPattern.includes('apigateway.RestApi') && hvPattern.includes('lambda.Function')) {
          name = 'serverless-api';
          recommendation = 'Strong candidate for a lambda-api component. This pattern would significantly reduce API development boilerplate.';
        } else if (hvPattern.includes('s3.Bucket') && hvPattern.includes('sqs.Queue') && hvPattern.includes('lambda.Function')) {
          name = 'event-processor';
          recommendation = 'Good candidate for an s3-triggered-worker or event-processing component.';
        } else if (hvPattern.includes('ecs.Cluster') && hvPattern.includes('elbv2.ApplicationLoadBalancer')) {
          name = 'containerized-service';
          recommendation = 'Excellent candidate for a containerized-web-service component.';
        } else if (hvPattern.includes('ec2.Vpc') && hvPattern.includes('rds.DatabaseInstance')) {
          name = 'database-service';
          recommendation = 'Good candidate for a database-with-vpc component.';
        }
        break;
      }
    }
    
    // Medium priority if frequency is high
    if (priority === 'Low' && data.count >= 4) {
      priority = 'Medium';
    }
    
    return {
      name,
      pattern: constructs,
      frequency: data.count,
      priority,
      files: data.files,
      recommendation
    };
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  /**
   * Phase 3: Generate the INVENTORY_REPORT.md
   */
  private async generateReport(): Promise<void> {
    logger.info(chalk.yellow('📄 Phase 3: Generating inventory report...'));
    
    const reportPath = path.join(this.targetDirectory, 'INVENTORY_REPORT.md');
    const timestamp = new Date().toISOString();
    
    let report = `# Platform Inventory Report\n\n`;
    report += `**Scanned Directory:** \`${this.targetDirectory}\`\n`;
    report += `**Timestamp:** ${timestamp}\n`;
    report += `**Analysis Summary:**\n`;
    report += `- Files Analyzed: ${this.analysis.summary.totalFiles}\n`;
    report += `- Total Constructs: ${this.analysis.summary.totalConstructs}\n`;
    report += `- Unique Types: ${this.analysis.summary.uniqueConstructTypes}\n`;
    report += `- Patterns Found: ${this.analysis.summary.patternsFound}\n\n`;
    
    // Section 1: Raw Construct Inventory
    report += `## 1. Raw Construct Inventory\n\n`;
    report += `This table shows a raw count of all AWS CDK L2 constructs found in the codebase.\n\n`;
    report += `| Construct Type | Count | Example Locations |\n`;
    report += `|---|---|---|\n`;
    
    const sortedInventory = Array.from(this.analysis.rawInventory.entries())
      .sort(([,a], [,b]) => b.count - a.count);
    
    for (const [type, usage] of sortedInventory) {
      const exampleFiles = usage.locations
        .slice(0, 3)
        .map(loc => `${loc.file}:${loc.line}`)
        .join(', ');
      report += `| \`${type}\` | ${usage.count} | ${exampleFiles} |\n`;
    }
    
    // Section 2: Identified Patterns & Component Candidates
    report += `\n## 2. Identified Patterns & Component Candidates\n\n`;
    report += `This section identifies frequently co-located constructs that are strong candidates for being encapsulated into a new, reusable L3 platform component.\n\n`;
    
    if (this.analysis.patterns.length === 0) {
      report += `*No recurring patterns found. This could indicate either a well-abstracted codebase or a small codebase with unique infrastructure needs.*\n\n`;
    } else {
      for (const pattern of this.analysis.patterns) {
        report += `### Candidate: ${pattern.name} (${pattern.priority} Priority)\n\n`;
        report += `**Pattern:** ${pattern.pattern.join(' → ')}\n\n`;
        report += `**Frequency:** Detected ${pattern.frequency} times across the codebase.\n\n`;
        report += `**Recommendation:** ${pattern.recommendation}\n\n`;
        report += `**Found In:**\n`;
        for (const file of pattern.files) {
          report += `- \`${file}\`\n`;
        }
        report += `\n`;
      }
    }
    
    // Section 3: Action Required - Unmappable Resources
    if (this.analysis.unmappableResources.length > 0) {
      report += `## 3. Action Required: Review Unmappable Resources\n\n`;
      report += `These resources were found but could not be confidently categorized due to complex, imperative logic. Manual review is recommended.\n\n`;
      
      for (const resource of this.analysis.unmappableResources) {
        report += `### \`${resource.file}:${resource.line}\`\n`;
        report += `**Reason:** ${resource.reason}\n\n`;
        report += `**Code:**\n\`\`\`typescript\n${resource.code}\n\`\`\`\n\n`;
      }
    }
    
    // Section 4: Recommendations
    report += `## 4. Recommendations & Next Steps\n\n`;
    
    const highPriorityPatterns = this.analysis.patterns.filter(p => p.priority === 'High');
    if (highPriorityPatterns.length > 0) {
      report += `### High Priority Actions\n\n`;
      for (const pattern of highPriorityPatterns) {
        report += `1. **${pattern.name}**: Implement this component immediately. Found ${pattern.frequency} times.\n`;
      }
      report += `\n`;
    }
    
    const mediumPriorityPatterns = this.analysis.patterns.filter(p => p.priority === 'Medium');
    if (mediumPriorityPatterns.length > 0) {
      report += `### Medium Priority Actions\n\n`;
      for (const pattern of mediumPriorityPatterns) {
        report += `1. **${pattern.name}**: Consider for next quarter. Found ${pattern.frequency} times.\n`;
      }
      report += `\n`;
    }
    
    report += `### Platform Development Impact\n\n`;
    const totalPotentialSavings = this.analysis.patterns.reduce((total, pattern) => total + pattern.frequency, 0);
    report += `By implementing the identified high-priority patterns, the platform could potentially eliminate **${totalPotentialSavings} instances** of repeated infrastructure code, significantly improving developer productivity.\n\n`;
    
    report += `---\n\n`;
    report += `*Generated by Platform Inventory Tool v1.0*\n`;
    
    // Write the report
    await fs.promises.writeFile(reportPath, report, 'utf8');
  }

  /**
   * Recursively find all TypeScript files in a directory
   */
  private findTypeScriptFiles(directory: string): string[] {
    const files: string[] = [];
    
    const traverseDirectory = (dir: string) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          // Skip common non-source directories
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item.name)) {
            traverseDirectory(itemPath);
          }
        } else if (item.isFile() && item.name.endsWith('.ts') && !item.name.endsWith('.d.ts')) {
          files.push(itemPath);
        }
      }
    };
    
    traverseDirectory(directory);
    return files;
  }
}

/**
 * Register the inventory command with Commander
 */
export function registerInventoryCommand(program: Command): void {
  program
    .command('inventory')
    .description('Analyze CDK codebase and identify component opportunities')
    .argument('<directory>', 'Directory to analyze (e.g., ../my-service or ./)')
    .option('--output <path>', 'Custom output path for the report', 'INVENTORY_REPORT.md')
    .action(async (directory: string, options: any) => {
      const inventoryTool = new InventoryCommand();
      await inventoryTool.execute(directory, options);
    });
}
