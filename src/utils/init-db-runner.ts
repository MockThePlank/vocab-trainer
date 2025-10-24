import sqlite3 from 'sqlite3';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
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
    // Create all tables
    await createTables(db);

    // Check if database already has data
    const hasData = await checkIfHasData(db);
    
    if (hasData) {
      logger.info('Database already contains data, skipping initialization');
      return;
    }

    // Try to restore from auto-backup first
    const backupRestored = await tryRestoreFromBackup(db, root);
    
    if (backupRestored) {
      logger.info('Database initialized from auto-backup');
      return;
    }

    // Fallback: Import from seed files
    await importSeedFiles(db, root, DB_DIR);
    logger.info('Database initialized from seed files');

  } finally {
    await safeCloseSqlite(db);
  }
}

async function createTables(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Vocabulary table
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

      // Index on lesson column
      db.run(`CREATE INDEX IF NOT EXISTS idx_lesson ON vocabulary(lesson)`, (err) => {
        if (err) logger.error('Failed to create index', { error: err.message });
        else logger.info('Index created on lesson column');
      });

      // Lessons table
      db.run(`
        CREATE TABLE IF NOT EXISTS lessons (
          slug TEXT PRIMARY KEY,
          title TEXT,
          description TEXT,
          entry_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);
        logger.info('Lessons table created');
      });

      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          display_name TEXT,
          is_admin INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);
        logger.info('Users table created');
      });

      // Remove duplicates
      db.run(`
        DELETE FROM vocabulary
        WHERE id NOT IN (
          SELECT MIN(id) FROM vocabulary GROUP BY lesson, de, en
        )
      `, function(err) {
        if (err) logger.error('Failed to remove duplicates', { error: err.message });
        else logger.info('Duplicates removed', { rowsAffected: this.changes || 0 });
        resolve();
      });
    });
  });
}

async function checkIfHasData(db: sqlite3.Database): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM vocabulary', (err, row: { count: number } | undefined) => {
      if (err) return reject(err);
      resolve((row?.count || 0) > 0);
    });
  });
}

async function tryRestoreFromBackup(db: sqlite3.Database, root: string): Promise<boolean> {
  try {
    const backupPath = path.join(root, 'data', 'backups', 'auto-backup.json');
    
    // Check if backup exists
    try {
      await fsPromises.access(backupPath);
    } catch {
      logger.info('No auto-backup found, will use seed files');
      return false;
    }

    // Load backup
    const backupContent = await fsPromises.readFile(backupPath, 'utf-8');
    const backupData = JSON.parse(backupContent);

    if (!backupData.lessons || !backupData.vocabulary) {
      logger.warn('Invalid backup format, falling back to seed files');
      return false;
    }

    logger.info('Restoring from auto-backup', { 
      lessons: backupData.lessons.length,
      vocabulary: backupData.vocabulary.length 
    });

    // Import lessons
    for (const lesson of backupData.lessons) {
      await new Promise<void>((resolve, reject) => {
        db.run(
          'INSERT OR REPLACE INTO lessons (slug, title, description, entry_count, created_at) VALUES (?, ?, ?, ?, ?)',
          [lesson.slug, lesson.title, lesson.description, lesson.entry_count, lesson.created_at],
          (err) => err ? reject(err) : resolve()
        );
      });
    }

    // Import vocabulary
    for (const vocab of backupData.vocabulary) {
      await new Promise<void>((resolve, reject) => {
        db.run(
          'INSERT OR IGNORE INTO vocabulary (lesson, de, en) VALUES (?, ?, ?)',
          [vocab.lesson, vocab.de, vocab.en],
          (err) => err ? reject(err) : resolve()
        );
      });
    }

    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    // Log as warning because a malformed or absent backup is an expected recoverable condition
    logger.warn('Backup restore failed (falling back to seed files)', { error: errMsg });
    return false;
  }
}

async function importSeedFiles(db: sqlite3.Database, root: string, DB_DIR: string): Promise<void> {
  const lessons: string[] = ['lesson01', 'lesson02', 'lesson03', 'lesson04', 'lesson05'];
  const stmt = db.prepare('INSERT OR IGNORE INTO vocabulary (lesson, de, en) VALUES (?, ?, ?)');

  for (const lesson of lessons) {
    // Prefer JSON files next to DB dir, otherwise project data/
    const jsonPathCandidates = [
      path.join(DB_DIR, `vocab-${lesson}.json`),
      path.join(root, 'data', `vocab-${lesson}.json`),
    ];
    const jsonPath = jsonPathCandidates.find(p => fs.existsSync(p));
    
    if (jsonPath && fs.existsSync(jsonPath)) {
      const rawData = fs.readFileSync(jsonPath, 'utf-8');
      try {
        const data = JSON.parse(rawData) as Array<{de: string; en: string}>;
        let importedCount = 0;
        
        for (const pair of data) {
          await new Promise<void>((resolve, reject) => {
            stmt.run(lesson, pair.de, pair.en, (err: Error | null) => {
              if (err) {
                logger.error('Migration error', { lesson, error: err.message });
                reject(err);
              } else {
                importedCount++;
                resolve();
              }
            });
          });
        }

        // Update lessons metadata
        const lessonNumber = lesson.replace('lesson', '');
        const title = `Lektion ${lessonNumber.padStart(2, '0')}`;
        
        await new Promise<void>((resolve, reject) => {
          db.run(
            'INSERT OR REPLACE INTO lessons (slug, title, entry_count) VALUES (?, ?, ?)',
            [lesson, title, importedCount],
            (err) => err ? reject(err) : resolve()
          );
        });

        logger.info('Seed file imported', { lesson, pairCount: importedCount });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('Failed to parse lesson JSON', { lesson, error: msg });
      }
    } else {
      // During tests we don't want noisy warnings for missing seed files in ephemeral temp folders.
      if (process.env.NODE_ENV === 'test') {
        logger.debug('Seed file not found (test mode)', { lesson, candidates: jsonPathCandidates });
      } else {
        logger.warn('Seed file not found', { lesson, candidates: jsonPathCandidates });
      }
    }
  }

  await new Promise<void>((resolve, reject) => {
    stmt.finalize((err) => {
      if (err) reject(err);
      else {
        db.get('SELECT COUNT(*) as count FROM vocabulary', (err, row: { count: number } | undefined) => {
          if (err) logger.error('Failed to count vocabulary entries', { error: err.message });
          else logger.info('Seed import completed', { totalVocabulary: row?.count || 0 });
          resolve();
        });
      }
    });
  });
}
