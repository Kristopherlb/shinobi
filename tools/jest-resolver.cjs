const jestDefaultResolver = require('jest-resolve').default;

const TS_FALLBACK_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];

module.exports = function customResolver(request, options) {
  const resolver = typeof options?.defaultResolver === 'function' ? options.defaultResolver : jestDefaultResolver;

  try {
    return resolver(request, options);
  } catch (error) {
    const errorCode = error?.code;
    const errorMessage = typeof error?.message === 'string' ? error.message : '';
    const shouldAttemptTsFallback =
      (errorCode === 'MODULE_NOT_FOUND' || errorCode === 'ERR_MODULE_NOT_FOUND' || errorMessage.includes('Cannot find module')) &&
      typeof request === 'string' &&
      request.endsWith('.js') &&
      !request.includes('node_modules');

    if (shouldAttemptTsFallback) {
      for (const extension of TS_FALLBACK_EXTENSIONS) {
        const tsRequest = request.slice(0, -3) + extension;
        const extensions = Array.isArray(options?.extensions)
          ? Array.from(new Set([...options.extensions, extension]))
          : [extension];
        const overriddenOptions = { ...options, extensions };
        try {
          return resolver(tsRequest, overriddenOptions);
        } catch (innerError) {
          const innerCode = innerError?.code;
          if (innerCode !== 'MODULE_NOT_FOUND' && innerCode !== 'ERR_MODULE_NOT_FOUND') {
            throw innerError;
          }
        }
      }
    }

    throw error;
  }
};
