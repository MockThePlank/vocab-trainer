import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import { safeCloseSqlite } from './db.js';
import { getDbPath } from './db-path.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function ensureDbInitialized(projectRoot?: string): Promise<void> {
  // projectRoot optional for tests; default to repo root
  // When compiled to dist, this file lives in dist/src/utils.
  // To reach the repository root from dist/src/utils we need three '..' (dist/src/utils -> dist/src -> dist -> projectRoot)
  const root = projectRoot || path.join(__dirname, '..', '..', '..');
  const DB_PATH = process.env.DB_PATH || getDbPath();
  const DB_DIR = path.dirname(DB_PATH);

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    logger.info('Data directory created', { path: DB_DIR });
  }

  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      logger.error('Failed to open database for initialization', { error: err.message, path: DB_PATH });
      throw err;
    }
    logger.info('Database connected for initialization', { path: DB_PATH });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS vocabulary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lesson TEXT NOT NULL,
            de TEXT NOT NULL,
            en TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(lesson, de, en)
          )
        `, (err) => {
          if (err) return reject(err);
          logger.info('Vocabulary table created with UNIQUE constraint');
        });

        db.run(`CREATE INDEX IF NOT EXISTS idx_lesson ON vocabulary(lesson)`, (err) => {
          if (err) logger.error('Failed to create index', { error: err.message });
          else logger.info('Index created on lesson column');
        });

        db.run(`
          DELETE FROM vocabulary
          WHERE id NOT IN (
            SELECT MIN(id) FROM vocabulary GROUP BY lesson, de, en
          )
        `, function(err) {
          if (err) logger.error('Failed to remove duplicates', { error: err.message });
          else logger.info('Duplicates removed', { rowsAffected: this.changes || 0 });
        });

        db.get('SELECT COUNT(*) as count FROM vocabulary', (err, row: { count: number } | undefined) => {
          if (err) return reject(err);

          if (row && row.count > 0) {
            logger.info('Migration skipped - table already contains data', { rowCount: row.count });
            return resolve();
          }

          // Migrate from JSON files (look relative to DB dir or project data folder)
          const lessons: string[] = ['lesson01', 'lesson02', 'lesson03', 'lesson04'];
          const stmt = db.prepare('INSERT OR IGNORE INTO vocabulary (lesson, de, en) VALUES (?, ?, ?)');

          lessons.forEach((lesson: string) => {
            // Prefer JSON files next to DB dir, otherwise project data/
            const jsonPathCandidates = [
              path.join(DB_DIR, `vocab-${lesson}.json`),
              path.join(root, 'data', `vocab-${lesson}.json`),
            ];
            const jsonPath = jsonPathCandidates.find(p => fs.existsSync(p));
            logger.info('Checking for lesson file', { lesson, path: jsonPath });
            if (jsonPath && fs.existsSync(jsonPath)) {
              const rawData = fs.readFileSync(jsonPath, 'utf-8');
              try {
                const data = JSON.parse(rawData) as Array<{de: string; en: string}>;
                data.forEach(pair => {
                  stmt.run(lesson, pair.de, pair.en, (err: Error | null) => {
                    if (err) logger.error('Migration error', { lesson, error: err.message });
                  });
                });
                logger.info('Lesson migration completed', { lesson, pairCount: data.length });
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                logger.error('Failed to parse lesson JSON', { lesson, error: msg });
              }
            } else {
              logger.warn('Lesson JSON file not found', { path: jsonPath });
            }
          });

          stmt.finalize(() => {
            db.get('SELECT COUNT(*) as count FROM vocabulary', (err, row: { count: number } | undefined) => {
              if (err) logger.error('Failed to count vocabulary entries', { error: err.message });
              else logger.info('Migration completed', { totalVocabulary: row?.count || 0 });
              resolve();
            });
          });
        });
      });
    });
  } finally {
    await safeCloseSqlite(db);
  }
}
