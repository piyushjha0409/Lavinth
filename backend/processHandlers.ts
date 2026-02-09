/**
 * Global process error handlers.
 * Import this module early to ensure unhandled errors are caught.
 */

import logger from './logger';

process.on('unhandledRejection', (reason: unknown) => {
  logger.error({ err: reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal({ err: error }, 'Uncaught Exception');
  process.exit(1);
});
