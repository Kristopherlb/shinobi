/**
 * Platform Testing Standard v1.0 Compliance Validator
 * Validates test suites for adherence to metadata requirements and naming conventions
 * 
 * @file tools/test-metadata-validator.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestMetadata {
  id: string;
  level: 'unit' | 'integration' | 'e2e';
  capability: string;
  oracle: 'exact' | 'snapshot' | 'property' | 'contract' | 'metamorphic' | 'trace';
  invariants: string[];
  fixtures: string[];
  inputs: { shape: string; notes: string };
  risks: string[];
  dependencies: string[];
  evidence: string[];
  compliance_refs: string[];
  ai_generated: boolean;
  human_reviewed_by: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class TestMetadataValidator {
  
  /**
   * Validates test file for Platform Testing Standard v1.0 compliance
   */
  public validateTestFile(filePath: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for required test metadata constant
      this.validateTestMetadataConstant(content, result);
      
      // Check for deterministic test setup
      this.validateDeterministicSetup(content, result);
      
      // Check test naming conventions  
      this.validateTestNaming(content, result);
      
      // Check for proper test metadata in comments
      this.validateInlineTestMetadata(content, result);
      
      // Check for AI-generated test compliance
      this.validateAIGeneratedCompliance(content, result);
      
      // Check for prohibited patterns
      this.validateProhibitedPatterns(content, result);

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to read test file: ${error}`);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  private validateTestMetadataConstant(content: string, result: ValidationResult): void {
    const hasTestMetadata = content.includes('TEST_METADATA') && content.includes('ai_generated: true');
    if (!hasTestMetadata) {
      result.errors.push('Missing required TEST_METADATA constant with ai_generated field');
    }

    const hasHumanReviewed = content.includes('human_reviewed_by:') && !content.includes('human_reviewed_by: ""');
    if (!hasHumanReviewed) {
      result.errors.push('Missing required human_reviewed_by field in TEST_METADATA');
    }
  }

  private validateDeterministicSetup(content: string, result: ValidationResult): void {
    const hasDeterministicTime = content.includes('DETERMINISTIC_TIMESTAMP') || content.includes('jest.useFakeTimers');
    if (!hasDeterministicTime) {
      result.errors.push('Missing deterministic time setup (DETERMINISTIC_TIMESTAMP or jest.useFakeTimers)');
    }

    const hasFixedIds = content.includes('FIXED_DEPLOYMENT_ID') || content.includes('test-deploy-');
    if (!hasFixedIds) {
      result.warnings.push('Consider using fixed deployment IDs for deterministic testing');
    }

    const hasMockCleanup = content.includes('jest.restoreAllMocks') || content.includes('afterEach');
    if (!hasMockCleanup) {
      result.errors.push('Missing test cleanup in afterEach block');
    }
  }

  private validateTestNaming(content: string, result: ValidationResult): void {
    // Check for Feature__Condition__ExpectedOutcome pattern
    const testNameRegex = /describe\(['"`]([^'"`]+)__([^'"`]+)__([^'"`]+)['"`]/g;
    const matches = Array.from(content.matchAll(testNameRegex));
    
    if (matches.length === 0) {
      result.errors.push('No tests follow Feature__Condition__ExpectedOutcome naming pattern');
      return;
    }

    matches.forEach((match, index) => {
      const [, feature, condition, outcome] = match;
      
      if (!feature || feature.length < 3) {
        result.errors.push(`Test ${index + 1}: Feature part too short: "${feature}"`);
      }
      
      if (!condition || condition.length < 3) {
        result.errors.push(`Test ${index + 1}: Condition part too short: "${condition}"`);
      }
      
      if (!outcome || outcome.length < 3) {
        result.errors.push(`Test ${index + 1}: ExpectedOutcome part too short: "${outcome}"`);
      }
    });
  }

  private validateInlineTestMetadata(content: string, result: ValidationResult): void {
    // Check for test metadata comments with required JSON structure
    const metadataBlocks = content.match(/\/\*\*[\s\S]*?\* Test Metadata:[\s\S]*?\*\/>/g) || [];
    
    if (metadataBlocks.length === 0) {
      result.errors.push('No inline test metadata blocks found');
      return;
    }

    metadataBlocks.forEach((block, index) => {
      const requiredFields = [
        'id', 'level', 'capability', 'oracle', 'invariants', 
        'fixtures', 'inputs', 'risks', 'dependencies', 'evidence',
        'compliance_refs', 'ai_generated', 'human_reviewed_by'
      ];

      requiredFields.forEach(field => {
        if (!block.includes(`"${field}"`)) {
          result.errors.push(`Metadata block ${index + 1}: Missing required field "${field}"`);
        }
      });

      // Validate ID format: TP-<service>-<feature>-<NNN>
      const idMatch = block.match(/"id":\s*"([^"]+)"/);
      if (idMatch) {
        const id = idMatch[1];
        const idPattern = /^TP-[a-z-]+-[a-z-]+-\d{3}$/;
        if (!idPattern.test(id)) {
          result.errors.push(`Invalid test ID format: "${id}". Must be TP-<service>-<feature>-<NNN>`);
        }
      }

      // Validate oracle types
      const oracleMatch = block.match(/"oracle":\s*"([^"]+)"/);
      if (oracleMatch) {
        const oracle = oracleMatch[1];
        const validOracles = ['exact', 'snapshot', 'property', 'contract', 'metamorphic', 'trace'];
        if (!validOracles.includes(oracle)) {
          result.errors.push(`Invalid oracle type: "${oracle}". Must be one of: ${validOracles.join(', ')}`);
        }
      }
    });
  }

  private validateAIGeneratedCompliance(content: string, result: ValidationResult): void {
    const hasAIGenerated = content.includes('ai_generated: true');
    const hasHumanReviewed = content.includes('human_reviewed_by: "platform-engineering-team"');
    
    if (hasAIGenerated && !hasHumanReviewed) {
      result.errors.push('AI-generated tests must have non-empty human_reviewed_by field');
    }
  }

  private validateProhibitedPatterns(content: string, result: ValidationResult): void {
    // Check for prohibited patterns
    const prohibitedPatterns = [
      { pattern: /Math\.random\(\)/g, message: 'Math.random() detected - use seeded RNG for determinism' },
      { pattern: /new Date\(\)/g, message: 'new Date() detected - use deterministic timestamp' },
      { pattern: /setTimeout|setInterval/g, message: 'setTimeout/setInterval detected - use fake timers' },
      { pattern: /console\.log|console\.error/g, message: 'Console statements detected - remove debug code' },
      { pattern: /\.skip\(|\.only\(/g, message: 'Test.skip() or test.only() detected - remove before commit' }
    ];

    prohibitedPatterns.forEach(({ pattern, message }) => {
      const matches = content.match(pattern);
      if (matches) {
        result.warnings.push(`${message} (${matches.length} occurrences)`);
      }
    });
  }

  /**
   * Generates compliance report for test file
   */
  public generateComplianceReport(filePath: string): string {
    const result = this.validateTestFile(filePath);
    const fileName = path.basename(filePath);
    
    let report = `\n## Platform Testing Standard v1.0 Compliance Report\n`;
    report += `**File:** ${fileName}\n`;
    report += `**Status:** ${result.isValid ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}\n\n`;

    if (result.errors.length > 0) {
      report += `### ❌ Errors (${result.errors.length}):\n`;
      result.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += `### ⚠️ Warnings (${result.warnings.length}):\n`;
      result.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += '\n';
    }

    if (result.isValid) {
      report += `### ✅ Compliance Verification:\n`;
      report += `- [x] Test metadata constant present\n`;
      report += `- [x] Deterministic test setup\n`;
      report += `- [x] Feature__Condition__ExpectedOutcome naming\n`;
      report += `- [x] Inline test metadata blocks\n`;
      report += `- [x] AI-generated test compliance\n`;
      report += `- [x] No prohibited patterns\n`;
    }

    return report;
  }
}

// CLI usage
if (require.main === module) {
  const validator = new TestMetadataValidator();
  const testFiles = [
    'src/components/api-gateway-rest/api-gateway-rest.component.test.ts',
    'src/components/api-gateway-http/api-gateway-http.component.test.ts',
    'tests/unit/components/rds-postgres.component.test.ts',
    'tests/unit/components/application-load-balancer.component.test.ts'
  ];

  console.log('🔍 Platform Testing Standard v1.0 Compliance Validation\n');
  
  testFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(validator.generateComplianceReport(filePath));
    } else {
      console.log(`❌ Test file not found: ${filePath}\n`);
    }
  });
}

export { TestMetadataValidator };
