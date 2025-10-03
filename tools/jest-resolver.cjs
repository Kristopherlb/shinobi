const fs = require('node:fs');

/**
 * Custom Jest resolver that prefers TypeScript sources when a module request ends with `.js`.
 * This keeps the workspace running against ESM TypeScript sources while published bundles can remain `.js`.
 */
module.exports = (request, options) => {
  const { defaultResolver } = options;
  const candidates = [];

  if (request.endsWith('.js')) {
    const tsCandidate = request.replace(/\.js$/i, '.ts');
    candidates.push(tsCandidate, request);
  } else {
    candidates.push(request);
  }

  let lastError;

  for (const candidate of candidates) {
    try {
      const resolved = defaultResolver(candidate, options);

      if (!resolved) {
        continue;
      }

      if (resolved.endsWith('.js')) {
        const tsPath = resolved.replace(/\.js$/i, '.ts');

        if (fs.existsSync(tsPath)) {
          return tsPath;
        }
      }

      return resolved;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};
