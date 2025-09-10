/**
 * Test Metadata Validator
 * Validates test metadata against Platform Testing Standard v1.0 requirements
 */

import Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

const testMetadataSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'test-metadata-schema.json'), 'utf8')
);

const ajv = new Ajv({ allErrors: true });
const validateMetadata = ajv.compile(testMetadataSchema);

export interface TestMetadata {
  id: string;
  level: 'unit' | 'integration' | 'e2e';
  capability: string;
  oracle: 'exact' | 'snapshot' | 'property' | 'contract' | 'metamorphic' | 'trace';
  invariants: string[];
  fixtures: string[];
  inputs: {
    shape: string;
    notes: string;
  };
  risks: string[];
  dependencies: string[];
  evidence: string[];
  compliance_refs: string[];
  ai_generated: boolean;
  human_reviewed_by: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates test metadata against the Platform Testing Standard schema
 */
export function validateTestMetadata(metadata: any): ValidationResult {
  const valid = validateMetadata(metadata);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!valid && validateMetadata.errors) {
    validateMetadata.errors.forEach(error => {
      errors.push(`${error.instancePath || 'root'}: ${error.message}`);
    });
  }

  // Additional business logic validations
  if (metadata && typeof metadata === 'object') {
    // Check ID format more strictly
    if (metadata.id && !metadata.id.match(/^TP-[a-z0-9-]+-[a-z0-9-]+-\d{3}$/)) {
      errors.push('id: must follow format TP-<service>-<feature>-<NNN> with zero-padded numbers');
    }

    // Check human reviewer requirement
    if (metadata.ai_generated === true && (!metadata.human_reviewed_by || metadata.human_reviewed_by.trim() === '')) {
      errors.push('human_reviewed_by: required when ai_generated=true');
    }

    // Warn about empty arrays (allowed but potentially incomplete)
    const arrayFields = ['invariants', 'fixtures', 'risks', 'dependencies', 'evidence', 'compliance_refs'];
    arrayFields.forEach(field => {
      if (metadata[field] && Array.isArray(metadata[field]) && metadata[field].length === 0) {
        warnings.push(`${field}: empty array - ensure this is intentional`);
      }
    });

    // Warn about missing compliance references for integration/e2e tests
    if (['integration', 'e2e'].includes(metadata.level) && 
        (!metadata.compliance_refs || metadata.compliance_refs.length === 0)) {
      warnings.push('compliance_refs: integration/e2e tests typically should reference compliance standards');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Extracts metadata from test file comments
 * Looks for JSON metadata in /** */ comments at the start of test files
 */
export function extractMetadataFromFile(filePath: string): TestMetadata | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Look for metadata in comment blocks
    const metadataMatch = content.match(/\/\*\*[\s\S]*?\*\s*Test Metadata:\s*\*\s*(\{[\s\S]*?\})\s*\*\s*\}/);
    
    if (!metadataMatch) {
      return null;
    }

    // Clean up the JSON (remove comment markers and extra whitespace)
    const jsonStr = metadataMatch[1]
      .split('\n')
      .map(line => line.replace(/^\s*\*\s?/, '').trim())
      .filter(line => line.length > 0)
      .join('\n');

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error(`Error extracting metadata from ${filePath}:`, error);
    return null;
  }
}

/**
 * Validates all test files in a directory tree
 */
export function validateTestDirectory(dirPath: string): { file: string; result: ValidationResult; metadata?: TestMetadata }[] {
  const results: { file: string; result: ValidationResult; metadata?: TestMetadata }[] = [];
  
  function processFile(filePath: string) {
    if (filePath.endsWith('.test.ts') || filePath.endsWith('.test.js')) {
      const metadata = extractMetadataFromFile(filePath);
      const result = metadata ? validateTestMetadata(metadata) : {
        valid: false,
        errors: ['No test metadata found in file'],
        warnings: []
      };
      
      results.push({
        file: path.relative(process.cwd(), filePath),
        result,
        metadata: metadata || undefined
      });
    }
  }

  function walkDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        walkDirectory(fullPath);
      } else if (entry.isFile()) {
        processFile(fullPath);
      }
    });
  }

  walkDirectory(dirPath);
  return results;
}

/**
 * CLI utility for validating test metadata
 */
export function runMetadataValidation(testDir: string = 'tests'): void {
  console.log('🔍 Validating test metadata against Platform Testing Standard...\n');
  
  const results = validateTestDirectory(testDir);
  let totalTests = 0;
  let validTests = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  results.forEach(({ file, result, metadata }) => {
    totalTests++;
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
    
    if (result.valid) {
      validTests++;
      console.log(`✅ ${file}`);
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          console.log(`   ⚠️  ${warning}`);
        });
      }
    } else {
      console.log(`❌ ${file}`);
      result.errors.forEach(error => {
        console.log(`   ❌ ${error}`);
      });
      result.warnings.forEach(warning => {
        console.log(`   ⚠️  ${warning}`);
      });
    }
    
    if (metadata) {
      console.log(`   📋 ID: ${metadata.id}, Level: ${metadata.level}, Oracle: ${metadata.oracle}`);
    }
    console.log();
  });

  // Summary
  console.log('📊 Validation Summary:');
  console.log(`   Total tests: ${totalTests}`);
  console.log(`   Valid tests: ${validTests}`);
  console.log(`   Invalid tests: ${totalTests - validTests}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`   Total warnings: ${totalWarnings}`);
  console.log(`   Compliance rate: ${((validTests / totalTests) * 100).toFixed(1)}%`);
  
  if (validTests === totalTests) {
    console.log('\n🎉 All tests comply with Platform Testing Standard!');
  } else {
    console.log('\n⚠️  Some tests need metadata updates to comply with Platform Testing Standard.');
    process.exit(1);
  }
}

// CLI entry point
if (require.main === module) {
  const testDir = process.argv[2] || 'tests';
  runMetadataValidation(testDir);
}
