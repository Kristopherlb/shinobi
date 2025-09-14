#!/usr/bin/env node
// scripts/audit-platform.mjs
// Shinobi Platform Governance — tiny audit runner for Cursor/CI.
// Usage:
//   node scripts/audit-platform.mjs .cursor/audit/platform-governance.yaml --base origin/main --format pretty
//   npm run audit:platform
import fs from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fg from 'fast-glob';
import YAML from 'yaml';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { strict: false, format: 'pretty', base: 'origin/main', changed: 'diff' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!args.config && !a.startsWith('-')) { args.config = a; continue; }
    if (a === '--strict') args.strict = true;
    else if (a === '--format') { args.format = argv[++i] || 'pretty'; }
    else if (a === '--base') { args.base = argv[++i] || 'origin/main'; }
    else if (a === '--changed') { args.changed = argv[++i] || 'diff'; } // diff|staged|none
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  if (!args.config) args.config = '.cursor/audit/platform-governance.yaml';
  return args;
}

function printHelp() {
  console.log(`audit-platform.mjs
  Usage: node scripts/audit-platform.mjs [config.yaml] [--base origin/main] [--strict] [--format pretty|json] [--changed diff|staged|none]
  `);
}

function ensureRg() {
  const r = spawnSync('rg', ['--version'], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('ERROR: ripgrep (rg) not found. Install it first.');
    process.exit(2);
  }
}

async function readYaml(file) {
  const raw = await fs.readFile(file, 'utf8');
  return YAML.parse(raw);
}

async function readText(file) {
  return fs.readFile(file, 'utf8').catch(() => '');
}

async function expandScopes(scope_glob) {
  if (!scope_glob) return [];
  const parts = scope_glob.split(',').map(s => s.trim()).filter(Boolean);
  const all = [];
  for (const p of parts) {
    const onlyDirs = p.endsWith('/');
    const matches = await fg(p, { onlyFiles: !onlyDirs, onlyDirectories: onlyDirs, dot: true });
    if (onlyDirs) {
      for (const d of matches) all.push({ kind: 'dir', path: path.normalize(d) });
    } else {
      for (const f of matches) all.push({ kind: 'file', path: path.normalize(f) });
    }
  }
  return all;
}

function rg(pattern, filesOrDirs = [], extraArgs = []) {
  const args = ['-n', '--hidden', '--ignore-case', ...extraArgs];
  if (typeof pattern === 'string') args.push('-e', pattern);
  else (pattern || []).forEach(p => args.push('-e', p));
  if (filesOrDirs.length) args.push('--', ...filesOrDirs);
  const r = spawnSync('rg', args, { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function listFilesUnder(dir) {
  const r = spawnSync('rg', ['--files', '--hidden', '--glob', `${dir}/**/*`, '--', dir], { encoding: 'utf8' });
  if (r.status !== 0) return [];
  return r.stdout.split('\n').filter(Boolean);
}

function getChangedFiles(mode, baseRef) {
  if (mode === 'none') return new Set();
  let args;
  if (mode === 'staged') {
    args = ['diff', '--name-only', '--cached'];
  } else {
    args = ['diff', '--name-only', `${baseRef}...HEAD`];
  }
  const r = spawnSync('git', args, { encoding: 'utf8' });
  if (r.status !== 0) return new Set();
  return new Set(r.stdout.split('\n').filter(Boolean).map(p => path.normalize(p)));
}

function rel(p) { return path.relative(process.cwd(), p) || p; }

function addFinding(findings, rule, severity, file, message, extra = {}) {
  findings.push({
    rule: rule.id, severity,
    title: rule.title,
    file: file ? rel(file) : undefined,
    message: message || rule.message,
    ...extra
  });
}

async function runMustExist(rule, scopes, findings) {
  if (!rule.must_exist) return;
  for (const s of scopes) {
    if (s.kind !== 'dir') continue;
    for (const need of rule.must_exist) {
      const f = path.join(s.path, need);
      if (!existsSync(f)) {
        addFinding(findings, rule, rule.severity, s.path, `Missing required file: ${need}`);
      }
    }
  }
}

async function runMustMatch(rule, scopes, findings) {
  if (!rule.must_match) return;
  for (const m of rule.must_match) {
    const patt = m.pattern;
    for (const s of scopes) {
      if (m.file && s.kind === 'dir') {
        const target = path.join(s.path, m.file);
        const content = await readText(target);
        if (!content) {
          addFinding(findings, rule, rule.severity, target, `File missing or unreadable: ${m.file}`);
        } else {
          const re = new RegExp(patt, 'im');
          if (!re.test(content)) {
            addFinding(findings, rule, rule.severity, target, `Pattern not found: ${patt}`);
          }
        }
      } else if (!m.file && s.kind === 'file') {
        const content = await readText(s.path);
        const re = new RegExp(patt, 'im');
        if (!re.test(content)) {
          addFinding(findings, rule, rule.severity, s.path, `Pattern not found in file: ${patt}`);
        }
      }
    }
  }
}

async function runMustMatchAny(rule, scopes, findings) {
  const list = rule.must_match_any;
  if (!list || !list.length) return;
  // Evaluate at repo-level for the given scopes: if none of the patterns match anywhere, flag once.
  const paths = scopes.map(s => s.path);
  const patterns = list.map(x => x.pattern || x);
  const r = rg(patterns, paths);
  if (!r.stdout.trim()) {
    addFinding(findings, rule, rule.severity, undefined, `No occurrences of any required patterns: ${patterns.join(' | ')}`);
  }
}

async function runMustNotMatch(rule, scopes, findings) {
  const list = rule.must_not_match;
  if (!list || !list.length) return;
  const paths = scopes.map(s => s.path);
  for (const entry of list) {
    const patt = entry.pattern || entry;
    const r = rg(patt, paths);
    if (r.stdout.trim()) {
      const lines = r.stdout.trim().split('\n').slice(0, 50); // cap noise
      for (const ln of lines) {
        const [file, line, col, ...rest] = ln.split(':');
        addFinding(findings, rule, rule.severity, file, `Forbidden pattern found: ${patt}`, { line: Number(line) || undefined, sample: rest.join(':').trim() });
      }
    }
  }
}

async function runConditionalFilter(rule, scopes) {
  if (!rule.conditional || !rule.conditional.requires_pattern) return scopes;
  const patt = rule.conditional.requires_pattern;
  const out = [];
  for (const s of scopes) {
    const targets = s.kind === 'dir' ? listFilesUnder(s.path) : [s.path];
    const r = rg(patt, targets);
    if (r.stdout.trim()) out.push(s);
  }
  return out;
}

function groupByComponentDir(files) {
  // group by packages/components/<name>/
  const map = new Map();
  for (const f of files) {
    const parts = f.split(path.sep);
    const idx = parts.indexOf('packages');
    const compIdx = (idx >= 0 && parts[idx + 1] === 'components') ? idx + 2 : -1;
    if (compIdx < 0) continue;
    const root = path.join(...parts.slice(0, compIdx + 1)); // packages/components/<name>
    if (!map.has(root)) map.set(root, []);
    map.get(root).push(f);
  }
  return map;
}

async function runCount(rule, scopes, findings) {
  if (!rule.count || !rule.count.primary_constructs) return;
  const pat = rule.count.primary_constructs.pattern;
  const maxPer = rule.count.primary_constructs.max_per_component_dir ?? 1;

  // Collect all files under scope (files only)
  const files = [];
  for (const s of scopes) {
    if (s.kind === 'file') files.push(s.path);
    else if (s.kind === 'dir') files.push(...listFilesUnder(s.path));
  }
  const groups = groupByComponentDir(files);
  for (const [root, fileList] of groups) {
    const r = rg(pat, fileList);
    const count = r.stdout ? r.stdout.split('\n').filter(Boolean).length : 0;
    if (count > maxPer) {
      addFinding(findings, rule, rule.severity, root, `Primary resource count ${count} exceeds max ${maxPer} (pattern: ${pat})`);
    }
  }
}

async function runDiffChecks(rule, findings, changedFiles) {
  if (!rule.diff_checks) return;
  const anyChanged = (rule.diff_checks.changed_files_match_any || []).some(mask => {
    // match by file suffix inside path
    const re = new RegExp(mask.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
    return [...changedFiles].some(f => re.test(f));
  });
  if (!anyChanged) return;

  // Now enforce required file patterns (lightweight)
  const req = rule.diff_checks.require_files_match || [];
  for (const entry of req) {
    // entry is like: "schema.ts: 'SCHEMA_VERSION|schemaVersion'"
    const [file, pattRaw] = Object.entries(entry)[0] || [];
    if (!file || !pattRaw) continue;
    // Find all changed schema.ts files
    const targets = [...changedFiles].filter(f => f.endsWith(path.normalize('/' + file)) || path.basename(f) === file);
    if (targets.length === 0) {
      addFinding(findings, rule, rule.severity, file, `Changed contracts detected; ${file} must be present & updated (pattern: ${pattRaw})`);
      continue;
    }
    const re = new RegExp(String(pattRaw), 'im');
    for (const t of targets) {
      const content = await readText(t);
      if (!re.test(content)) {
        addFinding(findings, rule, rule.severity, t, `Required pattern not found in ${file}: ${pattRaw}`);
      }
    }
  }
}

async function runRule(rule, findings, changedFiles) {
  const allScopes = await expandScopes(rule.scope_glob);
  const scopes = await runConditionalFilter(rule, allScopes);

  // Evaluate rule phases
  await runMustExist(rule, scopes, findings);
  await runMustMatch(rule, scopes, findings);
  await runMustMatchAny(rule, scopes, findings);
  await runMustNotMatch(rule, scopes, findings);
  await runCount(rule, scopes, findings);
  await runDiffChecks(rule, findings, changedFiles);
}

function printSummary(findings, format = 'pretty', strict = false) {
  const errors = findings.filter(f => f.severity === 'error' || (strict && f.severity === 'warn'));
  const warns = findings.filter(f => f.severity === 'warn' && !strict);

  if (format === 'json') {
    console.log(JSON.stringify({ errors, warnings: warns, totalErrors: errors.length, totalWarnings: warns.length }, null, 2));
    return { exitCode: errors.length ? 1 : 0 };
  }

  // pretty
  const red = s => `\x1b[31m${s}\x1b[0m`;
  const yellow = s => `\x1b[33m${s}\x1b[0m`;
  const dim = s => `\x1b[2m${s}\x1b[0m`;

  if (errors.length) {
    console.log(red(`\n✖ ${errors.length} error(s)`));
    for (const e of errors) {
      console.log(`  [${e.rule}] ${e.title}`);
      console.log(`    ${e.message}`);
      if (e.file) console.log(dim(`    at ${e.file}${e.line ? `:${e.line}` : ''}`));
      if (e.sample) console.log(dim(`    → ${e.sample}`));
    }
  }
  if (warns.length) {
    console.log(yellow(`\n⚠ ${warns.length} warning(s)`));
    for (const w of warns) {
      console.log(`  [${w.rule}] ${w.title}`);
      console.log(`    ${w.message}`);
      if (w.file) console.log(dim(`    at ${w.file}${w.line ? `:${w.line}` : ''}`));
      if (w.sample) console.log(dim(`    → ${w.sample}`));
    }
  }
  if (!errors.length && !warns.length) {
    console.log('\n✓ Clean. Your platform repo smells like refactors and victory.');
  }
  return { exitCode: errors.length ? 1 : 0 };
}

async function main() {
  const args = parseArgs(process.argv);
  ensureRg();
  const cfg = await readYaml(args.config);
  const changedFiles = getChangedFiles(args.changed, args.base);

  const findings = [];
  for (const rule of cfg.rules || []) {
    try {
      await runRule(rule, findings, changedFiles);
    } catch (err) {
      addFinding(findings, { id: rule.id, title: rule.title, severity: 'error' }, 'error', undefined, `Rule crashed: ${err.message}`);
    }
  }
  const { exitCode } = printSummary(findings, args.format, args.strict);
  process.exit(exitCode);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
