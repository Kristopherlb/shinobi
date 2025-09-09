"use strict";
/**
 * Platform Inventory Tool - CLI Command Implementation
 * Implements Platform Inventory Tool Specification v1.0
 *
 * @file src/cli/inventory.ts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryCommand = void 0;
exports.registerInventoryCommand = registerInventoryCommand;
const ts_morph_1 = require("ts-morph");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = require("../services/logger");
class InventoryCommand {
    constructor() {
        this.targetDirectory = '';
        this.project = new ts_morph_1.Project();
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
    async execute(directory, options) {
        this.targetDirectory = path.resolve(directory);
        logger_1.logger.info(chalk_1.default.cyan('🔍 Platform Inventory Tool v1.0'));
        logger_1.logger.info(chalk_1.default.gray(`Analyzing directory: ${this.targetDirectory}`));
        try {
            // Phase 1: Discovery - Scan all TypeScript files
            await this.discoverConstructs();
            // Phase 2: Pattern Analysis - Identify common groupings
            await this.analyzePatterns();
            // Phase 3: Report Generation - Create INVENTORY_REPORT.md
            await this.generateReport();
            logger_1.logger.info(chalk_1.default.green('✅ Inventory analysis complete!'));
            logger_1.logger.info(chalk_1.default.cyan(`📄 Report generated: ${path.join(this.targetDirectory, 'INVENTORY_REPORT.md')}`));
        }
        catch (error) {
            logger_1.logger.error(chalk_1.default.red('❌ Inventory analysis failed:'), error);
            throw error;
        }
    }
    /**
     * Phase 1: Discover all CDK construct usages
     */
    async discoverConstructs() {
        logger_1.logger.info(chalk_1.default.yellow('📂 Phase 1: Discovering CDK constructs...'));
        // Add all TypeScript files to the project
        const tsFiles = this.findTypeScriptFiles(this.targetDirectory);
        this.project.addSourceFilesAtPaths(tsFiles);
        this.analysis.summary.totalFiles = tsFiles.length;
        logger_1.logger.info(chalk_1.default.gray(`Found ${tsFiles.length} TypeScript files`));
        // Show first few files if verbose
        if (this.analysis.summary.totalFiles <= 20) {
            logger_1.logger.debug(`Files to analyze: ${tsFiles.map(f => path.relative(this.targetDirectory, f)).join(', ')}`);
        }
        // Analyze each source file
        for (const sourceFile of this.project.getSourceFiles()) {
            await this.analyzeSourceFile(sourceFile);
        }
        this.analysis.summary.uniqueConstructTypes = this.analysis.rawInventory.size;
        this.analysis.summary.totalConstructs = Array.from(this.analysis.rawInventory.values())
            .reduce((total, usage) => total + usage.count, 0);
        logger_1.logger.info(chalk_1.default.green(`✅ Found ${this.analysis.summary.totalConstructs} construct usages of ${this.analysis.summary.uniqueConstructTypes} types`));
    }
    /**
     * Analyze a single source file for CDK construct usage
     */
    async analyzeSourceFile(sourceFile) {
        const filePath = sourceFile.getFilePath();
        const relativePath = path.relative(this.targetDirectory, filePath);
        // Get all imports from aws-cdk-lib
        const cdkImports = this.getCdkImports(sourceFile);
        if (cdkImports.size === 0) {
            return; // No CDK imports, skip this file
        }
        // Find all "new X(...)" expressions
        const newExpressions = sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.NewExpression);
        for (const newExpr of newExpressions) {
            await this.analyzeNewExpression(newExpr, cdkImports, relativePath);
        }
    }
    /**
     * Extract CDK imports from a source file
     */
    getCdkImports(sourceFile) {
        const cdkImports = new Set();
        const filePath = sourceFile.getFilePath();
        const relativePath = path.relative(this.targetDirectory, filePath);
        const importDeclarations = sourceFile.getImportDeclarations();
        // Debug import processing if needed
        logger_1.logger.debug(`Processing imports in ${relativePath}: found ${importDeclarations.length} declarations`);
        for (const importDecl of importDeclarations) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();
            // Look for imports from aws-cdk-lib/aws-* (specific AWS services)
            if (moduleSpecifier.startsWith('aws-cdk-lib/aws-')) {
                const importClause = importDecl.getImportClause();
                if (importClause) {
                    const namedImports = importClause.getNamedImports();
                    if (namedImports) {
                        try {
                            // Treat namedImports as array-like object
                            for (let i = 0; i < namedImports.length; i++) {
                                const namedImport = namedImports[i];
                                if (namedImport && typeof namedImport.getName === 'function') {
                                    cdkImports.add(namedImport.getName());
                                }
                            }
                        }
                        catch (error) {
                            logger_1.logger.debug(`Error accessing namedImports in ${relativePath}:`, error);
                        }
                    }
                    // Handle namespace imports like "* as ec2"
                    const namespaceImport = importClause.getNamespaceImport();
                    if (namespaceImport) {
                        try {
                            if (typeof namespaceImport.getText === 'function') {
                                const name = namespaceImport.getText();
                                cdkImports.add(name);
                            }
                            else if (typeof namespaceImport.getName === 'function') {
                                const name = namespaceImport.getName();
                                cdkImports.add(name);
                            }
                            else if (namespaceImport.name) {
                                cdkImports.add(namespaceImport.name);
                            }
                        }
                        catch (error) {
                            logger_1.logger.debug(`Error accessing namespaceImport in ${relativePath}:`, error);
                        }
                    }
                }
            }
        }
        return cdkImports;
    }
    /**
     * Analyze a "new X(...)" expression to see if it's a CDK construct
     */
    async analyzeNewExpression(newExpr, cdkImports, filePath) {
        const expression = newExpr.getExpression();
        let constructType = null;
        // Handle different patterns: "new Bucket(...)", "new s3.Bucket(...)", etc.
        if (ts_morph_1.Node.isIdentifier(expression)) {
            const name = expression.getText();
            if (cdkImports.has(name)) {
                constructType = name;
            }
        }
        else if (ts_morph_1.Node.isPropertyAccessExpression(expression)) {
            const object = expression.getExpression();
            const property = expression.getName();
            if (ts_morph_1.Node.isIdentifier(object)) {
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
                column: newExpr.getStart()
            });
            this.analysis.rawInventory.set(constructType, usage);
        }
    }
    /**
     * Check if a construct is created in a complex context (loops, conditions, etc.)
     */
    isInComplexContext(node) {
        let parent = node.getParent();
        while (parent) {
            const kind = parent.getKind();
            // Check for control flow statements
            if ([
                ts_morph_1.SyntaxKind.ForStatement,
                ts_morph_1.SyntaxKind.ForInStatement,
                ts_morph_1.SyntaxKind.ForOfStatement,
                ts_morph_1.SyntaxKind.WhileStatement,
                ts_morph_1.SyntaxKind.DoStatement,
                ts_morph_1.SyntaxKind.IfStatement,
                ts_morph_1.SyntaxKind.SwitchStatement,
                ts_morph_1.SyntaxKind.TryStatement
            ].includes(kind)) {
                return true;
            }
            parent = parent.getParent();
        }
        return false;
    }
    /**
     * Phase 2: Analyze patterns of co-located constructs with enhanced algorithms
     */
    async analyzePatterns() {
        logger_1.logger.info(chalk_1.default.yellow('🔍 Phase 2: Analyzing construct patterns...'));
        // Group constructs by file to find co-location patterns
        const fileConstructs = new Map();
        for (const [constructType, usage] of this.analysis.rawInventory) {
            for (const location of usage.locations) {
                const constructs = fileConstructs.get(location.file) || [];
                constructs.push(constructType);
                fileConstructs.set(location.file, constructs);
            }
        }
        // Enhanced pattern analysis with multiple algorithms
        const patterns = new Map();
        // Algorithm 1: Co-location patterns (original)
        await this.analyzeCoLocationPatterns(fileConstructs, patterns);
        // Algorithm 2: Semantic architecture patterns
        await this.analyzeSemanticPatterns(fileConstructs, patterns);
        // Algorithm 3: Dependency chain patterns
        await this.analyzeDependencyPatterns(fileConstructs, patterns);
        // Algorithm 4: Anti-pattern detection
        await this.analyzeAntiPatterns(fileConstructs, patterns);
        // Convert to array and sort by architectural value
        this.analysis.patterns = Array.from(patterns.values())
            .filter(pattern => pattern.frequency >= 2)
            .sort((a, b) => {
            // Sort by architectural value first, then frequency
            if (a.architecturalValue !== b.architecturalValue) {
                return b.architecturalValue - a.architecturalValue;
            }
            return b.frequency - a.frequency;
        });
        // Identify related patterns and consolidation opportunities
        this.identifyRelatedPatterns();
        this.analysis.summary.patternsFound = this.analysis.patterns.length;
        logger_1.logger.info(chalk_1.default.green(`✅ Identified ${this.analysis.patterns.length} recurring patterns with enhanced analysis`));
    }
    /**
     * Algorithm 1: Co-location pattern analysis (enhanced)
     */
    async analyzeCoLocationPatterns(fileConstructs, patterns) {
        const patternCounts = new Map();
        for (const [file, constructs] of fileConstructs) {
            if (constructs.length < 2)
                continue;
            // Generate all meaningful construct combinations, not just full file patterns
            const combinations = this.generateConstructCombinations(constructs);
            for (const combination of combinations) {
                const pattern = combination.sort().join(' → ');
                const existing = patternCounts.get(pattern) || { count: 0, files: [] };
                existing.count++;
                if (!existing.files.includes(file)) {
                    existing.files.push(file);
                }
                patternCounts.set(pattern, existing);
            }
        }
        // Convert to pattern candidates
        for (const [pattern, data] of patternCounts) {
            if (data.count >= 2) {
                const candidate = this.classifyPattern(pattern, data);
                patterns.set(pattern, candidate);
            }
        }
    }
    /**
     * Algorithm 2: Semantic architecture pattern recognition
     */
    async analyzeSemanticPatterns(fileConstructs, patterns) {
        const architecturalPatterns = this.getKnownArchitecturalPatterns();
        for (const [file, constructs] of fileConstructs) {
            for (const archPattern of architecturalPatterns) {
                if (this.matchesArchitecturalPattern(constructs, archPattern)) {
                    const patternKey = archPattern.constructs.sort().join(' → ');
                    const existing = patterns.get(patternKey);
                    if (existing) {
                        existing.frequency++;
                        existing.files.push(file);
                        existing.architecturalValue = Math.max(existing.architecturalValue, archPattern.value);
                    }
                    else {
                        patterns.set(patternKey, {
                            name: archPattern.name,
                            pattern: archPattern.constructs.sort(),
                            frequency: 1,
                            priority: archPattern.priority,
                            files: [file],
                            recommendation: archPattern.recommendation,
                            architecturalValue: archPattern.value,
                            complexityReduction: this.estimateComplexityReduction(archPattern.constructs),
                            relatedPatterns: []
                        });
                    }
                }
            }
        }
    }
    /**
     * Algorithm 3: Dependency chain pattern analysis
     */
    async analyzeDependencyPatterns(fileConstructs, patterns) {
        const dependencyChains = this.identifyDependencyChains();
        for (const chain of dependencyChains) {
            let chainFrequency = 0;
            const chainFiles = [];
            for (const [file, constructs] of fileConstructs) {
                if (this.containsChain(constructs, chain)) {
                    chainFrequency++;
                    chainFiles.push(file);
                }
            }
            if (chainFrequency >= 2) {
                const patternKey = chain.join(' → ');
                patterns.set(`dependency-${patternKey}`, {
                    name: `${chain[0].toLowerCase()}-to-${chain[chain.length - 1].toLowerCase()}-pipeline`,
                    pattern: chain,
                    frequency: chainFrequency,
                    priority: this.prioritizeDependencyChain(chain),
                    files: chainFiles,
                    recommendation: `Consider creating a pipeline component that encapsulates the ${chain[0]} → ${chain[chain.length - 1]} data flow pattern.`,
                    architecturalValue: this.calculateDependencyChainValue(chain),
                    complexityReduction: this.estimateComplexityReduction(chain),
                    relatedPatterns: []
                });
            }
        }
    }
    /**
     * Algorithm 4: Anti-pattern detection
     */
    async analyzeAntiPatterns(fileConstructs, patterns) {
        const antiPatterns = this.getKnownAntiPatterns();
        for (const [file, constructs] of fileConstructs) {
            for (const antiPattern of antiPatterns) {
                if (this.matchesAntiPattern(constructs, antiPattern)) {
                    const patternKey = `antipattern-${antiPattern.name}`;
                    const existing = patterns.get(patternKey);
                    if (existing) {
                        existing.frequency++;
                        existing.files.push(file);
                    }
                    else {
                        patterns.set(patternKey, {
                            name: `⚠️ ${antiPattern.name}`,
                            pattern: antiPattern.constructs,
                            frequency: 1,
                            priority: 'High', // Anti-patterns are high priority to fix
                            files: [file],
                            recommendation: `${antiPattern.warning} ${antiPattern.solution}`,
                            architecturalValue: -10, // Negative value for anti-patterns
                            complexityReduction: 0,
                            relatedPatterns: []
                        });
                    }
                }
            }
        }
    }
    /**
     * Identify related patterns and consolidation opportunities
     */
    identifyRelatedPatterns() {
        for (let i = 0; i < this.analysis.patterns.length; i++) {
            for (let j = i + 1; j < this.analysis.patterns.length; j++) {
                const pattern1 = this.analysis.patterns[i];
                const pattern2 = this.analysis.patterns[j];
                const similarity = this.calculatePatternSimilarity(pattern1.pattern, pattern2.pattern);
                if (similarity > 0.6) { // 60% similarity threshold
                    pattern1.relatedPatterns.push(pattern2.name);
                    pattern2.relatedPatterns.push(pattern1.name);
                }
            }
        }
    }
    /**
     * Classify and prioritize a pattern (enhanced with architectural scoring)
     */
    classifyPattern(pattern, data) {
        const constructs = pattern.split(' → ');
        // Calculate architectural value based on construct types and combinations
        let architecturalValue = this.calculateArchitecturalValue(constructs);
        let priority = 'Low';
        let name = 'unknown-pattern';
        let recommendation = 'Consider creating a reusable component for this pattern.';
        // High-value patterns (common microservice patterns)
        const highValuePatterns = [
            {
                constructs: ['apigateway.RestApi', 'lambda.Function', 'dynamodb.Table'],
                name: 'serverless-api',
                recommendation: 'Strong candidate for a lambda-api component. This pattern would significantly reduce API development boilerplate.',
                value: 95
            },
            {
                constructs: ['lambda.Function', 's3.Bucket', 'sqs.Queue'],
                name: 'event-processor',
                recommendation: 'Good candidate for an s3-triggered-worker or event-processing component.',
                value: 80
            },
            {
                constructs: ['ecs.Cluster', 'elbv2.ApplicationLoadBalancer', 'ec2.Vpc'],
                name: 'containerized-service',
                recommendation: 'Excellent candidate for a containerized-web-service component.',
                value: 85
            },
            {
                constructs: ['ec2.Vpc', 'rds.DatabaseInstance', 'ec2.SecurityGroup'],
                name: 'database-service',
                recommendation: 'Good candidate for a database-with-vpc component.',
                value: 85
            }
        ];
        // Check for exact matches first
        for (const hvPattern of highValuePatterns) {
            if (this.arraysEqual(constructs.sort(), hvPattern.constructs.sort())) {
                priority = 'High';
                name = hvPattern.name;
                recommendation = hvPattern.recommendation;
                architecturalValue = hvPattern.value;
                break;
            }
        }
        // Check for partial matches (subset patterns)
        if (priority === 'Low') {
            for (const hvPattern of highValuePatterns) {
                const matchCount = constructs.filter(c => hvPattern.constructs.includes(c)).length;
                const matchRatio = matchCount / hvPattern.constructs.length;
                if (matchRatio >= 0.6) { // 60% match
                    priority = matchRatio >= 0.8 ? 'Medium' : 'Low';
                    name = `partial-${hvPattern.name}`;
                    recommendation = `Consider extending this pattern to include missing components for a complete ${hvPattern.name} solution.`;
                    architecturalValue = Math.floor(hvPattern.value * matchRatio);
                    break;
                }
            }
        }
        // Frequency-based priority boost
        if (data.count >= 5) {
            priority = priority === 'Low' ? 'Medium' : 'High';
            architecturalValue += 10;
        }
        else if (data.count >= 3) {
            architecturalValue += 5;
        }
        // Generate meaningful name if still unknown
        if (name === 'unknown-pattern') {
            name = this.generatePatternName(constructs);
        }
        return {
            name,
            pattern: constructs,
            frequency: data.count,
            priority,
            files: data.files,
            recommendation,
            architecturalValue,
            complexityReduction: this.estimateComplexityReduction(constructs),
            relatedPatterns: [] // Will be filled later by identifyRelatedPatterns
        };
    }
    /**
     * Calculate architectural value of a construct pattern
     */
    calculateArchitecturalValue(constructs) {
        let value = 30; // Base value
        // Value per construct
        value += constructs.length * 8;
        // Bonus for high-value constructs
        const highValueConstructs = {
            'lambda.Function': 15,
            'apigateway.RestApi': 12,
            'apigatewayv2.HttpApi': 12,
            'dynamodb.Table': 10,
            'rds.DatabaseInstance': 10,
            'ecs.FargateService': 10,
            's3.Bucket': 8,
            'elbv2.ApplicationLoadBalancer': 8,
            'cloudwatch.Alarm': 5
        };
        for (const construct of constructs) {
            for (const [hvConstruct, bonus] of Object.entries(highValueConstructs)) {
                if (construct.includes(hvConstruct)) {
                    value += bonus;
                    break;
                }
            }
        }
        // Bonus for architectural coherence (related constructs)
        const coherenceBonus = this.calculateCoherenceBonus(constructs);
        value += coherenceBonus;
        return Math.min(value, 100); // Cap at 100
    }
    /**
     * Calculate coherence bonus for related constructs
     */
    calculateCoherenceBonus(constructs) {
        const services = constructs.map(c => c.split('.')[0]).filter((v, i, a) => a.indexOf(v) === i);
        // Bonus for using multiple services from the same architectural tier
        const computeServices = ['lambda', 'ecs', 'ec2'];
        const dataServices = ['dynamodb', 'rds', 's3'];
        const networkServices = ['apigateway', 'apigatewayv2', 'elbv2', 'cloudfront'];
        let bonus = 0;
        if (services.filter(s => computeServices.includes(s)).length >= 2)
            bonus += 10;
        if (services.filter(s => dataServices.includes(s)).length >= 2)
            bonus += 10;
        if (services.filter(s => networkServices.includes(s)).length >= 2)
            bonus += 10;
        return bonus;
    }
    /**
     * Generate a meaningful name for unknown patterns
     */
    generatePatternName(constructs) {
        const services = constructs.map(c => c.split('.')[0]);
        const uniqueServices = [...new Set(services)];
        if (uniqueServices.length <= 2) {
            return uniqueServices.join('-') + '-pattern';
        }
        else {
            return `${uniqueServices[0]}-${uniqueServices[uniqueServices.length - 1]}-stack`;
        }
    }
    arraysEqual(a, b) {
        return a.length === b.length && a.every((val, i) => val === b[i]);
    }
    /**
     * Generate meaningful construct combinations from a file
     */
    generateConstructCombinations(constructs) {
        const combinations = [];
        // Add pairs, triples, and meaningful larger combinations
        for (let size = 2; size <= Math.min(constructs.length, 5); size++) {
            const combos = this.getCombinations(constructs, size);
            combinations.push(...combos);
        }
        return combinations;
    }
    getCombinations(array, size) {
        if (size > array.length)
            return [];
        if (size === 1)
            return array.map(x => [x]);
        if (size === array.length)
            return [array];
        const combinations = [];
        for (let i = 0; i <= array.length - size; i++) {
            const head = array[i];
            const tail = this.getCombinations(array.slice(i + 1), size - 1);
            for (const combo of tail) {
                combinations.push([head, ...combo]);
            }
        }
        return combinations;
    }
    /**
     * Known architectural patterns with their values
     */
    getKnownArchitecturalPatterns() {
        return [
            {
                name: 'serverless-api',
                constructs: ['apigateway.RestApi', 'lambda.Function', 'dynamodb.Table'],
                value: 95,
                priority: 'High',
                recommendation: 'Create a serverless API component combining API Gateway, Lambda, and DynamoDB for REST APIs.'
            },
            {
                name: 'serverless-web-app',
                constructs: ['s3.Bucket', 'cloudfront.Distribution', 'lambda.Function', 'apigateway.RestApi'],
                value: 90,
                priority: 'High',
                recommendation: 'Build a serverless web application component with S3, CloudFront, Lambda, and API Gateway.'
            },
            {
                name: 'container-service',
                constructs: ['ecs.Cluster', 'ecs.FargateService', 'elbv2.ApplicationLoadBalancer'],
                value: 85,
                priority: 'High',
                recommendation: 'Develop a containerized service component with ECS Fargate and ALB.'
            },
            {
                name: 'data-pipeline',
                constructs: ['s3.Bucket', 'lambda.Function', 'sqs.Queue'],
                value: 80,
                priority: 'High',
                recommendation: 'Create a data processing pipeline component with S3, Lambda, and SQS.'
            },
            {
                name: 'secure-storage',
                constructs: ['s3.Bucket', 'kms.Key', 'iam.Role'],
                value: 75,
                priority: 'Medium',
                recommendation: 'Build a secure storage component with encryption and proper IAM roles.'
            },
            {
                name: 'monitoring-stack',
                constructs: ['cloudwatch.Alarm', 'cloudwatch.Metric', 'sns.Topic'],
                value: 70,
                priority: 'Medium',
                recommendation: 'Develop a monitoring component with CloudWatch alarms and SNS notifications.'
            },
            {
                name: 'database-service',
                constructs: ['rds.DatabaseInstance', 'ec2.SecurityGroup', 'secretsmanager.Secret'],
                value: 85,
                priority: 'High',
                recommendation: 'Create a secure database service component with RDS, security groups, and secrets management.'
            }
        ];
    }
    /**
     * Check if constructs match an architectural pattern
     */
    matchesArchitecturalPattern(constructs, pattern) {
        return pattern.constructs.every((construct) => constructs.includes(construct));
    }
    /**
     * Estimate complexity reduction (lines of code that could be abstracted)
     */
    estimateComplexityReduction(constructs) {
        const baseComplexity = constructs.length * 15; // Base lines per construct
        const integrationComplexity = constructs.length * (constructs.length - 1) * 5; // Integration complexity
        const configurationComplexity = constructs.length * 10; // Configuration and customization
        return baseComplexity + integrationComplexity + configurationComplexity;
    }
    /**
     * Identify common dependency chains in AWS architectures
     */
    identifyDependencyChains() {
        return [
            // Data flow chains
            ['s3.Bucket', 'lambda.Function', 'dynamodb.Table'],
            ['s3.Bucket', 'sqs.Queue', 'lambda.Function'],
            ['apigateway.RestApi', 'lambda.Function', 'rds.DatabaseInstance'],
            ['apigatewayv2.HttpApi', 'lambda.Function', 'dynamodb.Table'],
            // Processing chains
            ['events.Rule', 'lambda.Function', 's3.Bucket'],
            ['kinesis.Stream', 'lambda.Function', 'elasticsearch.Domain'],
            // Security chains
            ['secretsmanager.Secret', 'lambda.Function', 'rds.DatabaseInstance'],
            ['kms.Key', 's3.Bucket', 'lambda.Function'],
            // Monitoring chains
            ['cloudwatch.Metric', 'cloudwatch.Alarm', 'sns.Topic'],
            ['logs.LogGroup', 'lambda.Function', 'cloudwatch.Alarm']
        ];
    }
    /**
     * Check if constructs contain a dependency chain
     */
    containsChain(constructs, chain) {
        return chain.every(construct => constructs.includes(construct));
    }
    /**
     * Prioritize dependency chains based on architectural value
     */
    prioritizeDependencyChain(chain) {
        // High-value chains involving APIs and data
        const highValueKeywords = ['api', 'lambda', 'dynamodb', 'rds'];
        const mediumValueKeywords = ['s3', 'sqs', 'sns', 'cloudwatch'];
        const chainText = chain.join(' ').toLowerCase();
        if (highValueKeywords.some(keyword => chainText.includes(keyword))) {
            return 'High';
        }
        else if (mediumValueKeywords.some(keyword => chainText.includes(keyword))) {
            return 'Medium';
        }
        return 'Low';
    }
    /**
     * Calculate architectural value of a dependency chain
     */
    calculateDependencyChainValue(chain) {
        let value = 50; // Base value
        // Add value based on chain length (longer chains are more valuable to abstract)
        value += chain.length * 10;
        // Add value for high-value constructs
        const highValueConstructs = ['lambda.Function', 'apigateway.RestApi', 'dynamodb.Table', 'rds.DatabaseInstance'];
        const highValueCount = chain.filter(construct => highValueConstructs.some(hv => construct.includes(hv.split('.')[1]))).length;
        value += highValueCount * 15;
        return Math.min(value, 100); // Cap at 100
    }
    /**
     * Known anti-patterns to detect and warn about
     */
    getKnownAntiPatterns() {
        return [
            {
                name: 'unencrypted-storage',
                constructs: ['s3.Bucket', 'rds.DatabaseInstance'],
                warning: 'Storage resources without encryption detected.',
                solution: 'Always encrypt storage resources using KMS keys or default encryption.'
            },
            {
                name: 'single-point-failure',
                constructs: ['rds.DatabaseInstance'],
                warning: 'Single database instance detected without high availability.',
                solution: 'Consider using RDS Multi-AZ deployment for production workloads.'
            },
            {
                name: 'unmonitored-lambda',
                constructs: ['lambda.Function'],
                warning: 'Lambda functions without CloudWatch alarms detected.',
                solution: 'Add CloudWatch alarms for error rates, duration, and throttles.'
            },
            {
                name: 'public-resources',
                constructs: ['s3.Bucket', 'rds.DatabaseInstance'],
                warning: 'Potentially public resources detected.',
                solution: 'Ensure resources are properly secured and not publicly accessible.'
            }
        ];
    }
    /**
     * Check if constructs match an anti-pattern
     */
    matchesAntiPattern(constructs, antiPattern) {
        // Simple heuristic: if all anti-pattern constructs are present without security constructs
        const hasAntiPatternConstructs = antiPattern.constructs.some((construct) => constructs.includes(construct));
        if (!hasAntiPatternConstructs)
            return false;
        // Check for missing security constructs that would mitigate the anti-pattern
        const securityConstructs = ['kms.Key', 'iam.Role', 'ec2.SecurityGroup', 'cloudwatch.Alarm'];
        const hasSecurityMitigation = securityConstructs.some(sc => constructs.includes(sc));
        // Anti-pattern detected if we have the problematic constructs but lack security mitigations
        return !hasSecurityMitigation;
    }
    /**
     * Calculate similarity between two patterns using Jaccard similarity
     */
    calculatePatternSimilarity(pattern1, pattern2) {
        const set1 = new Set(pattern1);
        const set2 = new Set(pattern2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }
    /**
     * Phase 3: Generate the INVENTORY_REPORT.md
     */
    async generateReport() {
        logger_1.logger.info(chalk_1.default.yellow('📄 Phase 3: Generating inventory report...'));
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
            .sort(([, a], [, b]) => b.count - a.count);
        for (const [type, usage] of sortedInventory) {
            const exampleFiles = usage.locations
                .slice(0, 3)
                .map(loc => `${loc.file}:${loc.line}`)
                .join(', ');
            report += `| \`${type}\` | ${usage.count} | ${exampleFiles} |\n`;
        }
        // Section 2: Identified Patterns & Component Candidates
        report += `\n## 2. Identified Patterns & Component Candidates\n\n`;
        report += `This section identifies frequently co-located constructs that are strong candidates for being encapsulated into a new, reusable L3 platform component. Patterns are ranked by architectural value and potential impact.\n\n`;
        if (this.analysis.patterns.length === 0) {
            report += `*No recurring patterns found. This could indicate either a well-abstracted codebase or a small codebase with unique infrastructure needs.*\n\n`;
        }
        else {
            // Separate patterns by type
            const highValuePatterns = this.analysis.patterns.filter(p => p.architecturalValue >= 70 && !p.name.startsWith('⚠️'));
            const mediumValuePatterns = this.analysis.patterns.filter(p => p.architecturalValue >= 40 && p.architecturalValue < 70 && !p.name.startsWith('⚠️'));
            const antiPatterns = this.analysis.patterns.filter(p => p.name.startsWith('⚠️'));
            const otherPatterns = this.analysis.patterns.filter(p => p.architecturalValue < 40 && !p.name.startsWith('⚠️'));
            // High-value patterns
            if (highValuePatterns.length > 0) {
                report += `### 🚀 High-Value Component Opportunities\n\n`;
                for (const pattern of highValuePatterns) {
                    report += this.formatPatternSection(pattern);
                }
            }
            // Medium-value patterns
            if (mediumValuePatterns.length > 0) {
                report += `### 📈 Medium-Value Component Opportunities\n\n`;
                for (const pattern of mediumValuePatterns) {
                    report += this.formatPatternSection(pattern);
                }
            }
            // Anti-patterns
            if (antiPatterns.length > 0) {
                report += `### ⚠️ Anti-Patterns Detected\n\n`;
                report += `These patterns indicate potential architectural or security issues that should be addressed.\n\n`;
                for (const pattern of antiPatterns) {
                    report += this.formatPatternSection(pattern);
                }
            }
            // Other patterns
            if (otherPatterns.length > 0) {
                report += `### 📋 Other Patterns\n\n`;
                for (const pattern of otherPatterns) {
                    report += this.formatPatternSection(pattern);
                }
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
        report += `### Enhanced Platform Development Impact Analysis\n\n`;
        // Calculate enhanced metrics
        const highValuePatterns = this.analysis.patterns.filter(p => p.architecturalValue >= 70);
        const totalComplexityReduction = this.analysis.patterns.reduce((total, pattern) => total + pattern.complexityReduction, 0);
        const totalOccurrences = this.analysis.patterns.reduce((total, pattern) => total + pattern.frequency, 0);
        const avgArchitecturalValue = this.analysis.patterns.length > 0
            ? Math.round(this.analysis.patterns.reduce((total, pattern) => total + pattern.architecturalValue, 0) / this.analysis.patterns.length)
            : 0;
        report += `**Summary Metrics:**\n`;
        report += `- **Total Pattern Occurrences:** ${totalOccurrences} instances across the codebase\n`;
        report += `- **High-Value Patterns:** ${highValuePatterns.length} patterns with 70+ architectural value\n`;
        report += `- **Estimated Code Reduction:** ~${totalComplexityReduction.toLocaleString()} lines of infrastructure code\n`;
        report += `- **Average Architectural Value:** ${avgArchitecturalValue}/100\n\n`;
        // ROI Analysis
        report += `**Return on Investment (ROI) Analysis:**\n`;
        if (highValuePatterns.length > 0) {
            const highValueComplexity = highValuePatterns.reduce((total, pattern) => total + pattern.complexityReduction, 0);
            const highValueOccurrences = highValuePatterns.reduce((total, pattern) => total + pattern.frequency, 0);
            report += `- Implementing the **${highValuePatterns.length} highest-value patterns** would:\n`;
            report += `  - Eliminate **${highValueOccurrences} instances** of repeated infrastructure\n`;
            report += `  - Reduce maintenance burden by ~**${highValueComplexity.toLocaleString()} lines** of code\n`;
            report += `  - Improve consistency across **${highValuePatterns.reduce((total, p) => total + p.files.length, 0)} files**\n\n`;
        }
        // Development velocity impact
        if (totalOccurrences > 0) {
            const weeklyDeveloperHoursSaved = Math.round((totalComplexityReduction / 50) * 2); // Assuming 50 lines per hour, 2x efficiency gain
            report += `**Developer Velocity Impact:**\n`;
            report += `- **Estimated time savings:** ~${weeklyDeveloperHoursSaved} developer hours per sprint\n`;
            report += `- **Reduced cognitive load:** Fewer infrastructure decisions for application teams\n`;
            report += `- **Faster onboarding:** New developers can use proven patterns immediately\n\n`;
        }
        // Priority recommendations
        report += `**Recommended Implementation Priority:**\n`;
        const topPatterns = this.analysis.patterns
            .filter(p => !p.name.startsWith('⚠️'))
            .slice(0, 3)
            .map((p, i) => `${i + 1}. **${p.name}** (${p.frequency} occurrences, ${p.architecturalValue}/100 value)`);
        if (topPatterns.length > 0) {
            report += topPatterns.join('\n') + '\n\n';
        }
        else {
            report += `*No high-impact patterns identified. This suggests either a well-abstracted codebase or limited infrastructure complexity.*\n\n`;
        }
        report += `---\n\n`;
        report += `*Generated by Platform Inventory Tool v1.0*\n`;
        // Write the report
        await fs.promises.writeFile(reportPath, report, 'utf8');
    }
    /**
     * Format a pattern section for the report
     */
    formatPatternSection(pattern) {
        let section = `#### ${pattern.name}\n\n`;
        // Pattern details
        section += `**Pattern:** ${pattern.pattern.join(' → ')}\n\n`;
        section += `**Frequency:** ${pattern.frequency} occurrences\n\n`;
        section += `**Priority:** ${pattern.priority}\n\n`;
        section += `**Architectural Value:** ${pattern.architecturalValue}/100\n\n`;
        section += `**Estimated Complexity Reduction:** ~${pattern.complexityReduction} lines of code\n\n`;
        // Related patterns
        if (pattern.relatedPatterns.length > 0) {
            section += `**Related Patterns:** ${pattern.relatedPatterns.join(', ')}\n\n`;
        }
        // Recommendation
        section += `**Recommendation:** ${pattern.recommendation}\n\n`;
        // Impact analysis
        const impact = this.calculateImpactAnalysis(pattern);
        section += `**Potential Impact:**\n`;
        section += `- Developer productivity: ${impact.productivity}\n`;
        section += `- Maintenance reduction: ${impact.maintenance}\n`;
        section += `- Consistency improvement: ${impact.consistency}\n\n`;
        // Files where pattern is found
        section += `**Found In:**\n`;
        for (const file of pattern.files.slice(0, 10)) { // Limit to 10 files for readability
            section += `- \`${file}\`\n`;
        }
        if (pattern.files.length > 10) {
            section += `- *...and ${pattern.files.length - 10} more files*\n`;
        }
        section += `\n`;
        return section;
    }
    /**
     * Calculate impact analysis for a pattern
     */
    calculateImpactAnalysis(pattern) {
        const frequency = pattern.frequency;
        const architecturalValue = pattern.architecturalValue;
        // Productivity impact
        let productivity = 'Low';
        if (frequency >= 5 && architecturalValue >= 70)
            productivity = 'High';
        else if (frequency >= 3 && architecturalValue >= 50)
            productivity = 'Medium';
        // Maintenance impact
        let maintenance = 'Low';
        if (frequency >= 4 && pattern.complexityReduction > 100)
            maintenance = 'High';
        else if (frequency >= 2 && pattern.complexityReduction > 50)
            maintenance = 'Medium';
        // Consistency impact
        let consistency = 'Low';
        if (frequency >= 3)
            consistency = 'High';
        else if (frequency >= 2)
            consistency = 'Medium';
        return { productivity, maintenance, consistency };
    }
    /**
     * Recursively find all TypeScript files in a directory
     */
    findTypeScriptFiles(directory) {
        const files = [];
        const traverseDirectory = (dir) => {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const itemPath = path.join(dir, item.name);
                if (item.isDirectory()) {
                    // Skip common non-source directories
                    if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item.name)) {
                        traverseDirectory(itemPath);
                    }
                }
                else if (item.isFile() && item.name.endsWith('.ts') && !item.name.endsWith('.d.ts') && !item.name.includes('.test.') && !item.name.includes('.spec.')) {
                    files.push(itemPath);
                }
            }
        };
        traverseDirectory(directory);
        return files;
    }
}
exports.InventoryCommand = InventoryCommand;
/**
 * Register the inventory command with Commander
 */
function registerInventoryCommand(program) {
    program
        .command('inventory')
        .description('Analyze CDK codebase and identify component opportunities')
        .argument('<directory>', 'Directory to analyze (e.g., ../my-service or ./)')
        .option('--output <path>', 'Custom output path for the report', 'INVENTORY_REPORT.md')
        .action(async (directory, options) => {
        const inventoryTool = new InventoryCommand();
        await inventoryTool.execute(directory, options);
    });
}
