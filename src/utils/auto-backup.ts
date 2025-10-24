/**
 * Auto-backup utility for creating automatic database backups
 * Triggered after any data modification (POST, PUT, DELETE operations)
 * @module utils/auto-backup
 */

import sqlite3 from 'sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { getDbPath } from './db-path.js';
import { logger } from './logger.js';

/**
 * Creates an automatic backup of all lessons and vocabulary
 * Saves to data/backups/auto-backup.json (git-ignored)
 */
export async function createAutoBackup(destDir?: string): Promise<void> {
  const DB_PATH = getDbPath();
  const db = new sqlite3.Database(DB_PATH);

  try {
    // Determine backup directory: explicit destDir -> AUTO_BACKUP_DIR env -> default project data/backups
    const backupDir = destDir
      || process.env.AUTO_BACKUP_DIR
      || path.join(process.cwd(), 'data', 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    // Export all lessons
    const lessons = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT * FROM lessons ORDER BY slug', (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    // Export all vocabulary
    const vocabulary = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT * FROM vocabulary ORDER BY lesson, id', (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    db.close();

    const backupData = {
      backupDate: new Date().toISOString(),
      version: '1.0',
      type: 'auto',
      lessons,
      vocabulary,
      stats: {
        lessonsCount: lessons.length,
        vocabularyCount: vocabulary.length
      }
    };

    // Save backup file
  const backupPath = path.join(backupDir, 'auto-backup.json');
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');

    logger.info('Auto-backup created successfully', { 
      path: backupPath,
      lessons: lessons.length, 
      vocabulary: vocabulary.length 
    });
  } catch (error) {
    db.close();
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('Auto-backup failed', { error: errMsg });
  }
}
