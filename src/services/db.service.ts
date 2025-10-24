/**
 * Database service for managing vocabulary entries
 * Provides a singleton instance for database operations
 * @module services/db
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbPath } from '../utils/db-path.js';
import { VocabEntry, Lesson } from '../types/index.js';
import { logger, logDbError } from '../utils/logger.js';
import { safeCloseSqlite } from '../utils/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service class for database operations
 * Implements CRUD operations for vocabulary entries
 */
class DatabaseService {
  private db: sqlite3.Database | null = null;
  private closing = false;

  /**
   * Creates a new DatabaseService instance and establishes SQLite connection
   * Exits process if connection fails
   */
  constructor() {
    // Resolve DB path consistently
    const DB_PATH = getDbPath();
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error('Failed to open database', { error: err.message, path: DB_PATH });
        process.exit(1);
      }
      logger.info('SQLite database connected', { path: DB_PATH });
    });
  }

  /**
   * Retrieves all vocabulary entries for a specific lesson
   * @param lesson - The lesson identifier (e.g., 'lesson01')
   * @returns Promise resolving to array of vocabulary entries
   * @throws Database error if query fails
   */
  getVocabByLesson(lesson: string): Promise<VocabEntry[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        const msg = 'Database is closed';
        logDbError('getVocabByLesson', new Error(msg));
        return reject(new Error(msg));
      }
      this.db.all(
        'SELECT id, lesson, de, en, created_at FROM vocabulary WHERE lesson = ? ORDER BY created_at ASC',
        [lesson],
        (err, rows: VocabEntry[]) => {
          if (err) {
            logDbError('getVocabByLesson', err);
            reject(err);
          } else {
            logger.debug('Fetched vocabulary', { lesson, count: rows.length });
            resolve(rows);
          }
        }
      );
    });
  }

  /**
   * Adds a new vocabulary entry to the database
   * @param lesson - The lesson identifier
   * @param de - German word or phrase
   * @param en - English translation
   * @returns Promise resolving to the ID of the newly created entry
   * @throws Database error if insert fails
   */
  addVocab(lesson: string, de: string, en: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database is closed'));
      this.db.run(
        'INSERT INTO vocabulary (lesson, de, en) VALUES (?, ?, ?)',
        [lesson, de, en],
        function (err) {
          if (err) {
            logDbError('addVocab', err);
            reject(err);
          } else {
            logger.info('Vocabulary added', { lesson, de, en, id: this.lastID });
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Deletes a vocabulary entry by ID (admin operation)
   * @param id - The unique identifier of the vocabulary entry
   * @returns Promise resolving to number of deleted rows (0 if not found, 1 if deleted)
   * @throws Database error if delete fails
   */
  deleteVocab(id: number): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database is closed'));
      this.db.run('DELETE FROM vocabulary WHERE id = ?', [id], function (err) {
        if (err) {
          logDbError('deleteVocab', err);
          reject(err);
        } else {
          logger.info('Vocabulary deleted', { id, deleted: this.changes });
          resolve(this.changes);
        }
      });
    });
  }

  /**
   * Updates an existing vocabulary entry (admin operation)
   * @param id - The unique identifier of the vocabulary entry
   * @param de - Updated German word or phrase
   * @param en - Updated English translation
   * @returns Promise resolving to number of updated rows (0 if not found, 1 if updated)
   * @throws Database error if update fails
   */
  updateVocab(id: number, de: string, en: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database is closed'));
      this.db.run(
        'UPDATE vocabulary SET de = ?, en = ? WHERE id = ?',
        [de, en, id],
        function (err) {
          if (err) {
            logDbError('updateVocab', err);
            reject(err);
          } else {
            logger.info('Vocabulary updated', { id, de, en, updated: this.changes });
            resolve(this.changes);
          }
        }
      );
    });
  }

  /**
   * Closes the database connection gracefully
   * Should be called during application shutdown
   * @returns Promise resolving when connection is closed
   * @throws Database error if close fails
   */
  close(): Promise<void> {
    // Use centralized safe close helper
    if (this.closing) return Promise.resolve();
    this.closing = true;
    return safeCloseSqlite(this.db)
      .catch((err) => {
        // safeCloseSqlite already logs; swallow to ensure shutdown continues
        logger.warn('Error while closing database (ignored during shutdown)', { error: err instanceof Error ? err.message : String(err) });
      })
      .then(() => {
        this.db = null;
        this.closing = false;
      });
  }
}

/**
 * Singleton instance of DatabaseService
 * Use this instance for all database operations
 * @example
 * import { dbService } from './services/db.service.js';
 * const vocab = await dbService.getVocabByLesson('lesson01');
 */
export const dbService = new DatabaseService();
