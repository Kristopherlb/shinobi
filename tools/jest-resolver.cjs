const jestDefaultResolver = require('jest-resolve').default;

const TS_FALLBACK_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];

module.exports = function customResolver(request, options) {
  const resolver = typeof options?.defaultResolver === 'function' ? options.defaultResolver : jestDefaultResolver;

  try {
    return resolver(request, options);
  } catch (error) {
    const shouldAttemptTsFallback =
      error?.code === 'MODULE_NOT_FOUND' &&
      typeof request === 'string' &&
      request.endsWith('.js') &&
      !request.includes('node_modules');

    if (shouldAttemptTsFallback) {
      for (const extension of TS_FALLBACK_EXTENSIONS) {
        const tsRequest = request.slice(0, -3) + extension;
        try {
          return resolver(tsRequest, options);
        } catch (innerError) {
          if (innerError?.code !== 'MODULE_NOT_FOUND') {
            throw innerError;
          }
        }
      }
    }

    throw error;
  }
};
