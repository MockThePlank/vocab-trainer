/**
 * Structured logging utility using Winston
 * Provides different log formats for development and production environments
 * @module utils/logger
 */

import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Custom format for development (colorized and readable)
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${String(timestamp)}] ${String(level)}: ${String(message)} ${metaStr}`;
  })
);

// JSON format for production (structured and parseable)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Main logger instance
 * Configured for colorized console output in development
 * and JSON console logging in production (suitable for cloud platforms like Render.com)
 * 
 * @example
 * logger.info('User logged in', { userId: 123 });
 * logger.error('Database error', { error: err.message });
 */
export const logger = winston.createLogger({
  // In production we keep 'info'. In test runs we raise to 'warn' to reduce noise.
  level: isProduction ? 'info' : isTest ? 'warn' : 'debug',
  format: isProduction ? prodFormat : devFormat,
  defaultMeta: { service: 'vocab-trainer' },
  transports: [
    // Console output (works in all environments including Render.com)
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

/**
 * Logs a database operation at debug level
 * @param operation - Name of the database operation
 * @param details - Optional additional context
 */
export const logDbOperation = (operation: string, details?: Record<string, unknown>) => {
  logger.debug(`Database operation: ${operation}`, details);
};

/**
 * Logs a database error with stack trace
 * @param operation - Name of the failed database operation
 * @param error - The error object
 */
export const logDbError = (operation: string, error: Error) => {
  // Treat constraint violations as warnings (they are often expected, e.g., duplicate inserts)
  const isConstraint = typeof error.message === 'string' && error.message.includes('SQLITE_CONSTRAINT');
  if (isConstraint) {
    logger.warn(`Database constraint during ${operation}`, { error: error.message });
  } else {
    logger.error(`Database error during ${operation}`, { error: error.message, stack: error.stack });
  }
};

/**
 * Logs an API request at info level
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - API endpoint path
 * @param statusCode - Optional HTTP status code
 */
export const logApiRequest = (method: string, path: string, statusCode?: number) => {
  logger.info(`${method} ${path}`, { statusCode });
};

/**
 * Logs an API error with full context
 * @param method - HTTP method
 * @param path - API endpoint path
 * @param error - The error object
 * @param statusCode - Optional HTTP status code
 */
export const logApiError = (method: string, path: string, error: Error, statusCode?: number) => {
  logger.error(`API error: ${method} ${path}`, {
    statusCode,
    error: error.message,
    stack: error.stack,
  });
};
