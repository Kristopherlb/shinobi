# CLI Typo Handling and UX Improvement

**Status:** 🔴 Open  
**Priority:** P2 - Medium  
**Component:** `@shinobi/cli`  
**Created:** 2025-01-06  
**Reporter:** User via terminal error

## Summary

When users make typos in CLI flags (e.g., `--inclue-experimental` instead of `--include-experimental`), Commander.js does suggest the correct option, but the error message is buried in verbose output and could be more prominent. The UX could be improved to make typos more obvious and actionable.

## Current Behavior

### Error Output

```
error: unknown option '--inclue-experimental'
(Did you mean --include-experimental?)
```

**Issues:**
1. Error message appears after experimental loader warnings (noise)
2. Suggestion is in parentheses (easy to miss)
3. No visual emphasis (colors, formatting)
4. No auto-correction option
5. Exit code 1 with full stack trace context makes it look more severe than it is

### Example Command

```bash
pnpm shinobi up --file /path/to/service.yml --env dev --inclue-experimental --yes
```

**Typo:** `--inclue-experimental` (missing 'd' in 'include')

## Desired Behavior

### Improved Error Message

1. **Prominent display** - Make the typo and suggestion more visible:
   ```
   ❌ Unknown option: --inclue-experimental
   
   💡 Did you mean: --include-experimental?
   
   Run with --help to see all available options.
   ```

2. **Visual emphasis** - Use colors/formatting to highlight:
   - The typo in red/strikethrough
   - The suggestion in green/bold
   - Clear separation from other output

3. **Context-aware suggestions** - Show:
   - All similar options (fuzzy matching)
   - Common typo patterns (e.g., transpositions, missing letters)
   - Related options grouped together

4. **Auto-correction prompt** (optional):
   ```
   ❌ Unknown option: --inclue-experimental
   💡 Did you mean: --include-experimental?
   
   Would you like to use --include-experimental instead? (y/n)
   ```

5. **Help integration** - Link to relevant help section:
   ```
   ❌ Unknown option: --inclue-experimental
   💡 Did you mean: --include-experimental?
   
   See 'shinobi up --help' for all available options.
   ```

## Root Cause

Commander.js provides basic typo detection via `unknownOption()` handler, but:
- Default error formatting is minimal
- Suggestions are subtle (parentheses)
- No customization of error display
- No fuzzy matching beyond basic Levenshtein distance
- Error appears mixed with other output

## Proposed Solutions

### Solution 1: Custom Error Handler (Recommended)

Override Commander.js's `unknownOption()` handler to provide better UX:

**File:** `apps/svc/src/cli/cli.ts` or command-specific files

```typescript
import { Command } from 'commander';
import chalk from 'chalk'; // or use console colors

function createCommandWithTypoHandling(name: string): Command {
  const command = new Command(name);
  
  // Override unknown option handler
  command.on('option:unknown', (option: string) => {
    const program = command.parent || command;
    const suggestions = findSimilarOptions(option, program);
    
    // Clear, prominent error display
    console.error(chalk.red(`\n❌ Unknown option: ${chalk.bold(option)}\n`));
    
    if (suggestions.length > 0) {
      console.error(chalk.yellow(`💡 Did you mean: ${chalk.green(suggestions[0])}?\n`));
      if (suggestions.length > 1) {
        console.error('Other similar options:');
        suggestions.slice(1).forEach(suggestion => {
          console.error(`  - ${suggestion}`);
        });
      }
    }
    
    console.error(`Run 'shinobi ${command.name()} --help' for all available options.\n`);
    process.exit(1);
  });
  
  return command;
}

function findSimilarOptions(typo: string, program: Command): string[] {
  // Get all registered options
  const allOptions = getAllOptions(program);
  
  // Simple Levenshtein distance matching
  const distances = allOptions.map(opt => ({
    option: opt,
    distance: levenshteinDistance(typo, opt)
  }));
  
  // Return options with distance <= 3, sorted by distance
  return distances
    .filter(d => d.distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .map(d => d.option);
}
```

### Solution 2: Enhanced Commander.js Configuration

Configure Commander.js with better error handling:

```typescript
program
  .configureOutput({
    writeErr: (str) => {
      // Custom error formatting
      if (str.includes('unknown option')) {
        // Parse and enhance the error message
        const enhanced = enhanceTypoError(str);
        process.stderr.write(enhanced);
      } else {
        process.stderr.write(str);
      }
    }
  });
```

### Solution 3: Pre-parse Validation

Validate options before Commander.js processes them:

```typescript
function validateOptions(args: string[], command: Command): void {
  const validOptions = getAllOptions(command);
  const providedOptions = extractOptions(args);
  
  for (const provided of providedOptions) {
    if (!validOptions.includes(provided)) {
      const suggestions = findSimilarOptions(provided, command);
      displayTypoError(provided, suggestions);
      process.exit(1);
    }
  }
}
```

### Solution 4: Fuzzy Matching Library

Use a dedicated fuzzy matching library for better suggestions:

```typescript
import * as Fuse from 'fuse.js';

function findSimilarOptions(typo: string, program: Command): string[] {
  const allOptions = getAllOptions(program);
  const fuse = new Fuse(allOptions, {
    threshold: 0.4, // 40% similarity threshold
    includeScore: true
  });
  
  const results = fuse.search(typo);
  return results.map(r => r.item);
}
```

## Implementation Plan

### Phase 1: Basic Enhancement (Quick Win)
1. Add custom `unknownOption` handler to main CLI program
2. Improve error message formatting with emojis/colors
3. Make suggestion more prominent
4. Add help link

### Phase 2: Fuzzy Matching
1. Implement Levenshtein distance or Fuse.js integration
2. Show multiple suggestions if available
3. Group related options

### Phase 3: Auto-correction (Optional)
1. Add interactive prompt for auto-correction
2. Only prompt in interactive terminals (not CI)
3. Log the correction for audit

## Common Typo Patterns to Handle

1. **Missing letters:** `--inclue-experimental` → `--include-experimental`
2. **Extra letters:** `--includee-experimental` → `--include-experimental`
3. **Transpositions:** `--iclude-experimental` → `--include-experimental`
4. **Wrong letters:** `--enclude-experimental` → `--include-experimental`
5. **Hyphen placement:** `--includeexperimental` → `--include-experimental`
6. **Case sensitivity:** `--Include-Experimental` → `--include-experimental` (if we want case-insensitive)

## Related Commands

This improvement should be applied to all CLI commands:
- `shinobi up`
- `shinobi validate`
- `shinobi plan`
- `shinobi synth`
- `shinobi diff`
- `shinobi destroy`
- `shinobi catalog`
- `shinobi inventory`

## Dependencies

Consider adding:
- `chalk` or `kleur` for colored output
- `fuse.js` or `fast-levenshtein` for fuzzy matching
- `inquirer` (already used) for auto-correction prompts

## Testing

### Test Cases

1. **Single typo with clear match:**
   ```bash
   shinobi up --inclue-experimental
   ```
   **Expected:** Clear error with `--include-experimental` suggestion

2. **Multiple similar options:**
   ```bash
   shinobi up --filee
   ```
   **Expected:** Suggest `--file` and possibly other file-related options

3. **No close match:**
   ```bash
   shinobi up --xyz123
   ```
   **Expected:** Show all available options or help link

4. **Case sensitivity:**
   ```bash
   shinobi up --YES
   ```
   **Expected:** Suggest `--yes` (if we want case-insensitive)

5. **Hyphen variations:**
   ```bash
   shinobi up --includeexperimental
   ```
   **Expected:** Suggest `--include-experimental`

## Notes

- Commander.js already provides basic typo detection, we just need to enhance the UX
- Error should be user-friendly, not developer-focused
- Consider accessibility (screen readers, color-blind users)
- Don't break existing error handling for legitimate unknown options
- Consider logging typos for analytics (common mistakes)

## References

- [Commander.js Unknown Option Handling](https://github.com/tj/commander.js#custom-processing)
- [Fuzzy String Matching Libraries](https://www.npmjs.com/search?q=keywords:fuzzy%20matching)
- [CLI UX Best Practices](https://clig.dev/)


