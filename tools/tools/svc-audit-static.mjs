#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SYNTH_CMD = process.env.SYNTH_CMD || "npx cdk synth --all";
const CFN_GUARD_RULES = process.env.CFN_GUARD_RULES || "rules/compliance.guard";
const CONFTEST_TARGET = process.env.CONFTEST_PATH || "packages/components";
const REGOPATH = process.env.REGOPATH || "policy:.";

function run(cmd) {
  console.log("$", cmd);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, REGOPATH } });
}

let exitCode = 0;
try { run(SYNTH_CMD); } catch (e) { console.error("[synth] failed"); process.exit(1); }

// cdk-nag (optional report)
try {
  const report = "audit/nag-report.json";
  if (fs.existsSync(report)) {
    const findings = JSON.parse(fs.readFileSync(report, 'utf-8'));
    const failures = findings.filter(f => (f.level||"error") !== 'info');
    if (failures.length) { console.error(`[nag] ${failures.length} findings`); exitCode = 1; }
    else { console.log("[nag] no findings reported"); }
  } else {
    console.log("[nag] audit/nag-report.json not found.");
  }
} catch (e) { console.warn("[nag] skipped:", e.message); }

// CFN Guard (optional)
try {
  if (fs.existsSync(CFN_GUARD_RULES)) {
    const outDir = "cdk.out";
    const files = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter(f => f.endsWith(".template.json")) : [];
    for (const f of files) run(`cfn-guard validate --rules ${CFN_GUARD_RULES} --data ${path.join(outDir, f)}`);
  } else {
    console.log("[guard] rules not found:", CFN_GUARD_RULES);
  }
} catch (e) { console.error("[guard] failed"); exitCode = 1; }

// conftest (optional)
try {
  if (fs.existsSync(CONFTEST_TARGET)) run(`conftest test ${CONFTEST_TARGET}`);
  else console.log("[conftest] path not found:", CONFTEST_TARGET);
} catch (e) { console.error("[conftest] failed"); exitCode = 1; }

process.exit(exitCode);
