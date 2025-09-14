#!/usr/bin/env node
// NinjaOne — Composite audit runner for Cursor-style YAML rules.
// Supports: multiple rule files, ${defaults.*} interpolation, sidecar_required,
// filename_must_match, must_not_match_combo, allow_if_metadata_includes,
// must_exist_any, must_match_any (multiple groups), diff_checks, count.primary_constructs.
//
// Usage examples:
//   node scripts/audit-suite.mjs --rules ".cursor/audit/platform-governance.yaml,.cursor/audit/platform-testing.yaml,.cursor/audit/platform-observability.yaml" --base origin/main --format pretty
//   npm run audit:all

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import fg from 'fast-glob';
import YAML from 'yaml';

const DEFAULT_SIDECARS = ['.meta.json', '.meta.yaml', '.meta.yml'];

function parseArgs(argv) {
  const args = { rules: [], strict: false, format: 'pretty', base: 'origin/main', changed: 'diff' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--rules') args.rules = (argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--strict') args.strict = true;
    else if (a === '--format') args.format = argv[++i] || 'pretty';
    else if (a === '--base') args.base = argv[++i] || 'origin/main';
    else if (a === '--changed') args.changed = argv[++i] || 'diff'; // diff|staged|none
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  if (!args.rules.length) {
    // Sensible default to the three standards
    args.rules = [
      '.cursor/audit/platform-governance.yaml',
      '.cursor/audit/platform-testing.yaml',
      '.cursor/audit/platform-observability.yaml'
    ];
  }
  return args;
}

function printHelp() {
  console.log(`audit-suite.mjs
  --rules "<file1.yaml,file2.yaml,...>"   Comma-separated list (defaults to gov+test+otel)
  --base origin/main                      Base ref for changed-file checks
  --changed diff|staged|none              Which file set to consider for diff checks (default: diff)
  --strict                                Treat warnings as errors
  --format pretty|json                    Output format
  `);
}

function ensureRg() {
  const r = spawnSync('rg', ['--version'], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('ERROR: ripgrep (rg) not found. Install it first.');
    process.exit(2);
  }
}

async function loadYaml(file) {
  const raw = await fs.readFile(file, 'utf8');
  const doc = YAML.parse(raw);
  return interpolate(doc, doc); // expand ${defaults.*}
}

function interpolate(obj, ctx) {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(v => interpolate(v, ctx));
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = interpolate(v, ctx);
    return out;
  }
  if (typeof obj === 'string') {
    const m = obj.match(/^\$\{([^}]+)\}$/); // whole-string var
    if (m) {
      const pathStr = m[1].split('.'); // e.g., defaults.test_globs
      let cur = ctx;
      for (const p of pathStr) cur = cur?.[p];
      return cur ?? obj;
    }
    return obj;
  }
  return obj;
}

function rg(patterns, filesOrDirs = [], extraArgs = []) {
  const args = ['-n', '--hidden', '--ignore-case', ...extraArgs];
  const pats = Array.isArray(patterns) ? patterns : [patterns];
  for (const p of pats) args.push('-e', p);
  if (filesOrDirs.length) args.push('--', ...filesOrDirs);
  const r = spawnSync('rg', args, { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function listFilesUnder(globOrPath) {
  if (!globOrPath) return [];
  const isDir = existsSync(globOrPath) && !globOrPath.includes('*') && !globOrPath.includes('?');
  if (isDir) return fg.sync(`${globOrPath.replace(/\/+$/, '')}/**/*`, { dot: true, onlyFiles: true });
  return fg.sync(globOrPath, { dot: true, onlyFiles: true });
}

function expandScopes(scope_glob) {
  if (!scope_glob) return [];
  const inputs = Array.isArray(scope_glob) ? scope_glob : String(scope_glob).split(',').map(s => s.trim()).filter(Boolean);
  const files = new Set();
  const dirs = new Set();
  for (const g of inputs) {
    // if ends with '/', treat as directory
    if (g.endsWith('/')) {
      for (const d of fg.sync(g, { dot: true, onlyDirectories: true })) dirs.add(path.normalize(d));
    } else {
      for (const f of listFilesUnder(g)) files.add(path.normalize(f));
    }
  }
  return [
    ...[...dirs].map(d => ({ kind: 'dir', path: d })),
    ...[...files].map(f => ({ kind: 'file', path: f }))
  ];
}

function getChangedFiles(mode, baseRef) {
  if (mode === 'none') return new Set();
  const args = mode === 'staged'
    ? ['diff', '--name-only', '--cached']
    : ['diff', '--name-only', `${baseRef}...HEAD`];
  const r = spawnSync('git', args, { encoding: 'utf8' });
  if (r.status !== 0) return new Set();
  return new Set(r.stdout.split('\n').filter(Boolean).map(p => path.normalize(p)));
}

function rel(p) { return p ? path.relative(process.cwd(), p) || p : undefined; }

function addFinding(findings, rule, severity, file, message, extra = {}) {
  findings.push({ rule: rule.id, severity, title: rule.title, file: rel(file), message: message || rule.message, ...extra });
}

async function readText(file) {
  return fs.readFile(file, 'utf8').catch(() => '');
}

async function parseMaybeYamlOrJson(file) {
  const text = await readText(file);
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  try { return YAML.parse(text); } catch {}
  return null;
}

function ruleGroups(rule, prefix) {
  return Object.entries(rule).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v).filter(Boolean);
}

// ---------- Rule evaluators ----------
async function runMustExist(rule, scopes, findings) {
  if (!rule.must_exist && !rule.must_exist_any) return;
  const wantAny = !!rule.must_exist_any;
  const entries = (rule.must_exist || rule.must_exist_any || []);
  let anyFound = false;

  for (const s of scopes) {
    if (s.kind === 'dir') {
      for (const need of entries) {
        const f = path.join(s.path, need);
        const ok = existsSync(f);
        if (wantAny) anyFound = anyFound || ok;
        else if (!ok) addFinding(findings, rule, rule.severity, s.path, `Missing required file: ${need}`);
      }
    }
  }

  // Special case: scope is file globs and we just require "any" match
  if (wantAny && scopes.filter(x => x.kind === 'file').length > 0) {
    anyFound = anyFound || scopes.length > 0;
  }

  if (wantAny && !anyFound) {
    addFinding(findings, rule, rule.severity, undefined, 'No required files found in scope.');
  }
}

async function runMustMatch(rule, scopes, findings) {
  if (!rule.must_match) return;
  for (const m of rule.must_match) {
    const patt = m.pattern || m;
    const re = new RegExp(patt, 'im');

    for (const s of scopes) {
      if (m.file && s.kind === 'dir') {
        const target = path.join(s.path, m.file);
        const content = await readText(target);
        if (!content) addFinding(findings, rule, rule.severity, target, `File missing or unreadable: ${m.file}`);
        else if (!re.test(content)) addFinding(findings, rule, rule.severity, target, `Pattern not found: ${patt}`);
        else if (m.implies) {
          for (const ip of m.implies) {
            const ire = new RegExp(ip.pattern || ip, 'im');
            if (!ire.test(content)) addFinding(findings, rule, rule.severity, target, `Implied pattern missing: ${ip.pattern || ip}`);
          }
        }
      } else if (!m.file && s.kind === 'file') {
        const content = await readText(s.path);
        if (!re.test(content)) addFinding(findings, rule, rule.severity, s.path, `Pattern not found in file: ${patt}`);
        else if (m.implies) {
          for (const ip of m.implies) {
            const ire = new RegExp(ip.pattern || ip, 'im');
            if (!ire.test(content)) addFinding(findings, rule, rule.severity, s.path, `Implied pattern missing: ${ip.pattern || ip}`);
          }
        }
      }
    }
  }
}

async function runMustMatchAnyGroups(rule, scopes, findings) {
  const groups = ruleGroups(rule, 'must_match_any');
  if (!groups.length) return;
  const paths = scopes.map(s => s.path);
  for (const group of groups) {
    const patterns = (group || []).map(x => x.pattern || x);
    if (!patterns.length) continue;
    const r = rg(patterns, paths);
    if (!r.stdout.trim()) {
      addFinding(findings, rule, rule.severity, undefined, `None of the required patterns matched: ${patterns.join(' | ')}`);
    }
  }
}

async function runMustNotMatch(rule, scopes, findings, options = {}) {
  const list = rule.must_not_match;
  if (!list || !list.length) return;
  const paths = scopes.map(s => s.path);
  for (const entry of list) {
    const patt = entry.pattern || entry;
    const r = rg(patt, paths);
    if (r.stdout.trim()) {
      const lines = r.stdout.trim().split('\n').slice(0, 200);
      for (const ln of lines) {
        const [file, line, col, ...rest] = ln.split(':');
        // allowlist: check metadata sidecar for exemptions
        if (options.allowMeta) {
          const allow = await isAllowedByMetadata(file, options.allowMeta);
          if (allow) continue;
        }
        addFinding(findings, rule, rule.severity, file, `Forbidden pattern found: ${patt}`, {
          line: Number(line) || undefined,
          sample: rest.join(':').trim()
        });
      }
    }
  }
}

async function isAllowedByMetadata(codeFile, allowMeta) {
  const { key, any: allowedValues = [], suffixes = DEFAULT_SIDECARS } = allowMeta || {};
  const base = codeFile.replace(/\.[^.]+$/, ''); // strip extension
  const candidates = suffixes.map(sfx => `${base}${sfx}`);
  for (const cand of candidates) {
    if (!existsSync(cand)) continue;
    const data = await parseMaybeYamlOrJson(cand);
    if (!data) continue;
    const val = data?.[key];
    if (Array.isArray(val)) {
      for (const item of val) if (allowedValues.includes(item)) return true;
    } else if (typeof val === 'string') {
      if (allowedValues.includes(val)) return true;
    }
  }
  return false;
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

async function runCount(rule, scopes, findings) {
  if (!rule.count || !rule.count.primary_constructs) return;
  const pat = rule.count.primary_constructs.pattern;
  const maxPer = rule.count.primary_constructs.max_per_component_dir ?? 1;

  const files = [];
  for (const s of scopes) {
    if (s.kind === 'file') files.push(s.path);
    else if (s.kind === 'dir') files.push(...listFilesUnder(s.path));
  }
  const groups = new Map();
  for (const f of files) {
    const parts = f.split(path.sep);
    const idx = parts.indexOf('packages');
    const compIdx = (idx >= 0 && parts[idx + 1] === 'components') ? idx + 2 : -1;
    if (compIdx < 0) continue;
    const root = path.join(...parts.slice(0, compIdx + 1));
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(f);
  }
  for (const [root, fileList] of groups) {
    const r = rg(pat, fileList);
    const count = r.stdout ? r.stdout.split('\n').filter(Boolean).length : 0;
    if (count > maxPer) {
      addFinding(findings, rule, rule.severity, root, `Primary resource count ${count} exceeds max ${maxPer} (pattern: ${pat})`);
    }
  }
}

async function runFilenameMustMatch(rule, scopes, findings) {
  if (!rule.filename_must_match) return;
  const re = new RegExp(rule.filename_must_match, 'i');
  for (const s of scopes) {
    if (s.kind !== 'file') continue;
    const fn = path.basename(s.path);
    if (!re.test(fn)) addFinding(findings, rule, rule.severity, s.path, `Filename fails pattern: ${rule.filename_must_match}`);
  }
}

async function runSidecarRequired(rule, scopes, findings) {
  if (!rule.sidecar_required) return;
  const suffixes = rule.sidecar_required.suffixes || DEFAULT_SIDECARS;
  for (const s of scopes) {
    if (s.kind !== 'file') continue;
    const base = s.path.replace(/\.[^.]+$/, '');
    const found = suffixes.some(sfx => existsSync(`${base}${sfx}`));
    if (!found) addFinding(findings, rule, rule.severity, s.path, `Missing metadata sidecar (${suffixes.join(', ')})`);
  }
}

async function runMustNotMatchCombo(rule, scopes, findings) {
  const combos = rule.must_not_match_combo;
  if (!combos || !combos.length) return;
  for (const s of scopes) {
    if (s.kind !== 'file') continue;
    const content = await readText(s.path);
    for (const [a, b] of combos) {
      const ra = new RegExp(a, 'im'); const rb = new RegExp(b, 'im');
      if (ra.test(content) && rb.test(content)) {
        addFinding(findings, rule, rule.severity, s.path, `Both forbidden patterns present in same file: [${a}] + [${b}]`);
      }
    }
  }
}

async function runDiffChecks(rule, findings, changedFiles) {
  if (!rule.diff_checks) return;
  const anyChanged = (rule.diff_checks.changed_files_match_any || []).some(mask => {
    const re = new RegExp(mask.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return [...changedFiles].some(f => re.test(f));
  });
  if (!anyChanged) return;

  const req = rule.diff_checks.require_files_match || [];
  for (const entry of req) {
    const [file, pattRaw] = Object.entries(entry)[0] || [];
    if (!file || !pattRaw) continue;
    const targets = [...changedFiles].filter(f => f.endsWith(path.normalize('/' + file)) || path.basename(f) === file);
    if (targets.length === 0) {
      addFinding(findings, rule, rule.severity, file, `Changes detected; ${file} must be present & updated (pattern: ${pattRaw})`);
      continue;
    }
    const re = new RegExp(String(pattRaw), 'im');
    for (const t of targets) {
      const content = await readText(t);
      if (!re.test(content)) addFinding(findings, rule, rule.severity, t, `Required pattern not found in ${file}: ${pattRaw}`);
    }
  }
}

// ---------- Orchestration ----------
function mergeRuleSets(files) {
  // Load and concatenate rule arrays; each file keeps its own defaults (expanded)
  return files;
}

function summarize(findings, format, strict) {
  const errors = findings.filter(f => f.severity === 'error' || (strict && f.severity === 'warn'));
  const warns  = findings.filter(f => f.severity === 'warn' && !strict);

  if (format === 'json') {
    console.log(JSON.stringify({ errors, warnings: warns, totalErrors: errors.length, totalWarnings: warns.length }, null, 2));
    return errors.length ? 1 : 0;
  }
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
  if (!errors.length && !warns.length) console.log('\n✓ All audits passed. No drama, no pager.');
  return errors.length ? 1 : 0;
}

async function runRulesFromFile(file, changedFiles, findings) {
  const cfg = await loadYaml(file);
  const rules = cfg.rules || [];
  const sideloadDefaults = cfg.defaults || {};
  const sidecarSuffixes = sideloadDefaults.meta_sidecar_suffixes || DEFAULT_SIDECARS;

  for (const rule of rules) {
    // Expand scopes and apply conditional narrowing
    let scopes = expandScopes(rule.scope_glob);
    scopes = await runConditionalFilter(rule, scopes);

    // Evaluate
    await runMustExist(rule, scopes, findings);
    await runMustMatch(rule, scopes, findings);
    await runMustMatchAnyGroups(rule, scopes, findings);
    await runFilenameMustMatch(rule, scopes, findings);
    await runSidecarRequired(rule, scopes, findings);
    await runMustNotMatchCombo(rule, scopes, findings);

    // allow_if_metadata_includes support on must_not_match
    const allowMeta = rule.allow_if_metadata_includes
      ? { ...rule.allow_if_metadata_includes, suffixes: sidecarSuffixes }
      : null;
    await runMustNotMatch(rule, scopes, findings, { allowMeta });

    await runCount(rule, scopes, findings);
    await runDiffChecks(rule, findings, changedFiles);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  ensureRg();

  const changedFiles = getChangedFiles(args.changed, args.base);
  const files = mergeRuleSets(args.rules);

  const findings = [];
  for (const f of files) {
    if (!existsSync(f)) {
      findings.push({ rule: 'LOAD', severity: 'error', title: 'Rules file missing', file: f, message: `Rules file not found: ${f}` });
      continue;
    }
    await runRulesFromFile(f, changedFiles, findings);
  }
  const exitCode = summarize(findings, args.format, args.strict);
  process.exit(exitCode);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
