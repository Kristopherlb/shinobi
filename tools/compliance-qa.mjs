#!/usr/bin/env node

/**
 * Compliance Q&A
 * 
 * Answers questions about component compliance based on component plan
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function log(...args) {
  console.log('[compliance-qa]', ...args);
}

function error(...args) {
  console.error('[compliance-qa] ERROR:', ...args);
}

function loadComponentPlan(componentName) {
  const planPath = path.join(ROOT, 'packages', 'components', componentName, 'audit', 'component.plan.json');

  if (!fs.existsSync(planPath)) {
    throw new Error(`Component plan not found: ${planPath}`);
  }

  return JSON.parse(fs.readFileSync(planPath, 'utf8'));
}

function answerQuestion(plan, question) {
  const q = question.toLowerCase();

  if (q.includes('packs') || q.includes('which packs')) {
    return `Selected packs: ${plan.packs?.join(', ') || 'none specified'}`;
  }

  if (q.includes('controls') || q.includes('nist') || q.includes('which controls')) {
    return `NIST controls enforced: ${plan.nist_controls?.join(', ') || 'none specified'}`;
  }

  if (q.includes('rules') || q.includes('which rules')) {
    return `Rules enforced: ${plan.rules?.length || 0} rules from ${plan.packs?.length || 0} packs`;
  }

  if (q.includes('framework') || q.includes('compliance framework')) {
    return `Compliance framework: ${plan.framework || 'not specified'}`;
  }

  if (q.includes('capabilities') || q.includes('which capabilities')) {
    const caps = Object.entries(plan.capabilities || {})
      .filter(([_, enabled]) => enabled)
      .map(([cap, _]) => cap);
    return `Enabled capabilities: ${caps.join(', ') || 'none'}`;
  }

  if (q.includes('security') || q.includes('security features')) {
    return `Security features: ${plan.security_features?.join(', ') || 'none specified'}`;
  }

  if (q.includes('gaps') || q.includes('compliance gaps')) {
    return `Compliance gaps: ${plan.gaps?.length || 0} gaps identified`;
  }

  if (q.includes('environment') || q.includes('assumptions')) {
    return `Environment assumptions: ${plan.environment_assumptions?.join(', ') || 'none specified'}`;
  }

  if (q.includes('summary') || q.includes('overview')) {
    return `Component: ${plan.component}
Service Type: ${plan.service_type}
Framework: ${plan.framework}
Packs: ${plan.packs?.join(', ') || 'none'}
NIST Controls: ${plan.nist_controls?.length || 0} controls
Capabilities: ${Object.keys(plan.capabilities || {}).length} capabilities
Security Features: ${plan.security_features?.length || 0} features
Gaps: ${plan.gaps?.length || 0} gaps`;
  }

  // Default: return full plan
  return JSON.stringify(plan, null, 2);
}

function main() {
  const args = process.argv.slice(2);
  const componentName = args[0];
  const question = args.slice(1).join(' ') || 'summary';

  if (!componentName) {
    error('Usage: node compliance-qa.mjs <componentName> [question]');
    process.exit(1);
  }

  try {
    const plan = loadComponentPlan(componentName);
    const answer = answerQuestion(plan, question);

    console.log(answer);

  } catch (err) {
    error('Q&A failed:', err.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
