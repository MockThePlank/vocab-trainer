import sqlite3 from 'sqlite3';
import { logger } from './logger.js';

/**
 * Safely close a sqlite3.Database handle.
 * Idempotent: resolves if db is null or already closed.
 */
export function safeCloseSqlite(db: sqlite3.Database | null): Promise<void> {
  return new Promise((resolve) => {
    if (!db) return resolve();

    try {
      db.close((err) => {
        if (err) {
          if (/SQLITE_MISUSE|closed/i.test(String(err.message))) {
            logger.warn('Database handle already closed', { error: err.message });
          } else {
            logger.error('Failed to close database', { error: err.message });
          }
        } else {
          logger.info('Database connection closed');
        }
        resolve();
      });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      logger.warn('Exception during database close', { error: errMsg });
      resolve();
    }
  });
}
