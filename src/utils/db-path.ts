import path from 'path';

/**
 * Resolve the database path. Prefer DB_PATH env var, otherwise default to
 * <project-root>/data/vocab.db using process.cwd() so compiled locations don't matter.
 */
export function getDbPath(): string {
  return process.env.DB_PATH || path.join(process.cwd(), 'data', 'vocab.db');
}
