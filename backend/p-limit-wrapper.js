/**
 * P-limit wrapper to handle ESM compatibility issues
 */
async function createLimiter(concurrency) {
  try {
    // Dynamic import for ESM compatibility
    const pLimit = await import('p-limit');
    return pLimit.default(concurrency);
  } catch (error) {
    console.error('Error importing p-limit:', error);
    // Fallback implementation of a simple concurrency limiter
    return function limit(fn) {
      return async function(...args) {
        return fn(...args);
      };
    };
  }
}

module.exports = createLimiter;
