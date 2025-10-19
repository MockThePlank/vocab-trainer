import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production (dist/), we need to go up one level to reach the project root
const projectRoot = path.join(__dirname, '..');
const DB_DIR = path.join(projectRoot, 'data');
const DB_PATH = path.join(DB_DIR, 'vocab.db');

// Sicherstellen, dass data-Ordner existiert
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  logger.info('Data directory created', { path: DB_DIR });
}

// Erstelle Datenbank-Verbindung
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    logger.error('Failed to open database for initialization', { error: err.message, path: DB_PATH });
    process.exit(1);
  }
  logger.info('Database connected for initialization', { path: DB_PATH });
});

// Interface für Vokabel-Daten
interface VocabPair {
  de: string;
  en: string;
}

// Erstelle Tabelle mit UNIQUE-Constraint
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
    if (err) {
      logger.error('Failed to create vocabulary table', { error: err.message });
      process.exit(1);
    }
    logger.info('Vocabulary table created with UNIQUE constraint');
  });

  // Index für schnellere Lesson-Queries
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_lesson ON vocabulary(lesson)
  `, (err) => {
    if (err) {
      logger.error('Failed to create index', { error: err.message });
    } else {
      logger.info('Index created on lesson column');
    }
  });

  // Entferne vorhandene Duplikate: behalte die niedrigste id pro (lesson,de,en)
  db.run(`
    DELETE FROM vocabulary
    WHERE id NOT IN (
      SELECT MIN(id) FROM vocabulary GROUP BY lesson, de, en
    )
  `, function(err) {
    if (err) {
      logger.error('Failed to remove duplicates', { error: err.message });
    } else {
      logger.info('Duplicates removed', { rowsAffected: this.changes || 0 });
    }

    // Stelle sicher, dass ein UNIQUE-Index existiert (verhindert neue Duplikate)
    db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_vocabulary_lesson_de_en ON vocabulary(lesson, de, en)
    `, (err) => {
      if (err) {
        logger.error('Failed to create unique index', { error: err.message });
      } else {
        logger.info('Unique index created/verified');
      }

      // Prüfe, ob die Tabelle bereits Einträge hat; falls ja, überspringe Migration
      db.get('SELECT COUNT(*) as count FROM vocabulary', (err, row: { count: number } | undefined) => {
        if (err) {
          logger.error('Failed to check table contents', { error: err.message });
          db.close(() => logger.info('Database connection closed'));
          return;
        }

        if (row && row.count > 0) {
          logger.info('Migration skipped - table already contains data', { rowCount: row.count });
          db.close(() => logger.info('Database connection closed'));
          return;
        }

        // Migriere bestehende JSON-Daten (INSERT OR IGNORE verhindert Duplikate)
        const lessons: string[] = ['lesson01', 'lesson02', 'lesson03', 'lesson04'];
        const stmt = db.prepare('INSERT OR IGNORE INTO vocabulary (lesson, de, en) VALUES (?, ?, ?)');

        lessons.forEach((lesson: string) => {
          const jsonPath = path.join(projectRoot, 'data', `vocab-${lesson}.json`);
          
          // Füge mehr Logging hinzu, um Fehler besser zu verstehen
          logger.info('Checking for lesson file', { lesson, path: jsonPath });
          
          if (fs.existsSync(jsonPath)) {
            const rawData = fs.readFileSync(jsonPath, 'utf-8');
            const data = JSON.parse(rawData) as VocabPair[];
            data.forEach(pair => {
              stmt.run(lesson, pair.de, pair.en, (err: Error | null) => {
                if (err) logger.error('Migration error', { lesson, error: err.message });
              });
            });
            logger.info('Lesson migration completed', { lesson, pairCount: data.length });
          } else {
            logger.warn('Lesson JSON file not found', { path: jsonPath });
          }
        });        stmt.finalize(() => {
          // Zeige finale Statistik
          db.get('SELECT COUNT(*) as count FROM vocabulary', (err, row: { count: number } | undefined) => {
            if (err) {
              logger.error('Failed to count vocabulary entries', { error: err.message });
            } else {
              logger.info('Migration completed', { totalVocabulary: row?.count || 0 });
            }
            db.close((err) => {
              if (err) {
                logger.error('Failed to close database', { error: err.message });
              } else {
                logger.info('Database connection closed');
              }
            });
          });
        });
      });
    });
  });
});