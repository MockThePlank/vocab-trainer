/**
 * Admin routes for protected administrative operations
 * All routes require API key authentication via X-API-Key header
 * @module routes/admin
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../services/db.service.js';
import { requireApiKey } from '../middleware/auth.middleware.js';
import { ApiResponse } from '../types/index.js';
import sqlite3 from 'sqlite3';
import { getDbPath } from '../utils/db-path.js';
import { logger } from '../utils/logger.js';
import multer from 'multer';
import fs from 'fs/promises';
import { createAutoBackup } from '../utils/auto-backup.js';

const router = Router();
const upload = multer({ dest: 'tmp/' });

/**
 * DELETE /api/admin/vocab/:id
 * Deletes a vocabulary entry by ID (protected with API key)
 * 
 * @route DELETE /api/admin/vocab/:id
 * @param {number} id.path.required - Vocabulary entry ID
 * @header {string} X-API-Key.required - Admin API key
 * @returns {ApiResponse} 200 - Success with deleted count
 * @returns {ApiResponse} 400 - Invalid ID
 * @returns {ApiResponse} 401 - Unauthorized (invalid API key)
 * @returns {ApiResponse} 404 - Vocabulary entry not found
 * @returns {ApiResponse} 500 - Database error
 */
router.delete('/vocab/:id', requireApiKey, async (req: Request, res: Response<ApiResponse>) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Ungültige ID' });
  }

  try {
    const deleted = await dbService.deleteVocab(id);
    if (deleted === 0) {
      return res.status(404).json({ error: 'Vokabel nicht gefunden' });
    }
    
    // Auto-backup after data modification
    createAutoBackup().catch(err => {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('Auto-backup failed after delete', { error: errMsg });
    });
    
    res.json({ success: true, deleted });
  } catch {
    res.status(500).json({ error: 'Konnte Vokabel nicht löschen' });
  }
});

/**
 * PUT /api/admin/vocab/:id
 * Updates a vocabulary entry by ID (protected with API key)
 * 
 * @route PUT /api/admin/vocab/:id
 * @param {number} id.path.required - Vocabulary entry ID
 * @param {string} de.body.required - German word (max 60 characters)
 * @param {string} en.body.required - English word (max 60 characters)
 * @header {string} X-API-Key.required - Admin API key
 * @returns {ApiResponse} 200 - Success with updated count
 * @returns {ApiResponse} 400 - Invalid ID or input validation failed
 * @returns {ApiResponse} 401 - Unauthorized (invalid API key)
 * @returns {ApiResponse} 404 - Vocabulary entry not found
 * @returns {ApiResponse} 500 - Database error
 */
router.put('/vocab/:id', requireApiKey, async (req: Request, res: Response<ApiResponse>) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Ungültige ID' });
  }

  const { de, en } = req.body as { de?: unknown; en?: unknown };

  // Validate input
  if (typeof de !== 'string' || typeof en !== 'string') {
    return res.status(400).json({ error: 'Fehlende oder ungültige Felder' });
  }

  if (!de.trim() || !en.trim()) {
    return res.status(400).json({ error: 'Felder dürfen nicht leer sein' });
  }

  if (de.length > 60 || en.length > 60) {
    return res.status(400).json({ error: 'Felder dürfen maximal 60 Zeichen lang sein' });
  }

  try {
    const updated = await dbService.updateVocab(id, de.trim(), en.trim());
    if (updated === 0) {
      return res.status(404).json({ error: 'Vokabel nicht gefunden' });
    }
    
    // Auto-backup after data modification
    createAutoBackup().catch(err => {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('Auto-backup failed after update', { error: errMsg });
    });
    
    res.json({ success: true, updated });
  } catch {
    res.status(500).json({ error: 'Konnte Vokabel nicht aktualisieren' });
  }
});

/**
 * GET /api/admin/export
 * Exports all lessons and vocabulary as JSON backup
 * 
 * @route GET /api/admin/export
 * @header {string} X-API-Key.required - Admin API key
 * @returns {Object} 200 - JSON backup file with lessons, vocabulary, and stats
 * @returns {ApiResponse} 401 - Unauthorized (invalid API key)
 * @returns {ApiResponse} 500 - Export failed
 */
router.get('/export', requireApiKey, async (req: Request, res: Response) => {
  const DB_PATH = getDbPath();
  const db = new sqlite3.Database(DB_PATH);

  try {
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

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      lessons,
      vocabulary,
      stats: {
        lessonsCount: lessons.length,
        vocabularyCount: vocabulary.length
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="vocab-trainer-backup-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);

    logger.info('Database exported', { 
      lessonsCount: lessons.length, 
      vocabularyCount: vocabulary.length 
    });
  } catch (error) {
    db.close();
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('Export failed', { error: errMsg });
    res.status(500).json({ error: 'Export fehlgeschlagen' });
  }
});

/**
 * POST /api/admin/import
 * Imports lessons and vocabulary from JSON backup file
 * 
 * @route POST /api/admin/import
 * @header {string} X-API-Key.required - Admin API key
 * @param {File} file.body.required - JSON backup file
 * @returns {ApiResponse} 200 - Success with import statistics
 * @returns {ApiResponse} 400 - No file uploaded or invalid format
 * @returns {ApiResponse} 401 - Unauthorized (invalid API key)
 * @returns {ApiResponse} 500 - Import failed
 */
router.post('/import', requireApiKey, upload.single('file'), async (req: Request, res: Response) => {
  const DB_PATH = getDbPath();
  const db = new sqlite3.Database(DB_PATH);

  try {
    if (!(req as any).file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const fileContent = await fs.readFile((req as any).file.path, 'utf-8');
    const importData = JSON.parse(fileContent);

    // Validation
    if (!importData.lessons || !importData.vocabulary) {
      await fs.unlink((req as any).file.path);
      db.close();
      return res.status(400).json({ error: 'Ungültiges Backup-Format' });
    }

    let importedLessons = 0;
    let importedVocabulary = 0;

    // Import lessons
    for (const lesson of importData.lessons) {
      await new Promise<void>((resolve, reject) => {
        db.run(
          'INSERT OR REPLACE INTO lessons (slug, title, description, entry_count, created_at) VALUES (?, ?, ?, ?, ?)',
          [lesson.slug, lesson.title, lesson.description, lesson.entry_count, lesson.created_at],
          (err: Error | null) => {
            if (err) return reject(err);
            importedLessons++;
            resolve();
          }
        );
      });
    }

    // Import vocabulary
    for (const vocab of importData.vocabulary) {
      await new Promise<void>((resolve, reject) => {
        db.run(
          'INSERT OR IGNORE INTO vocabulary (lesson, de, en) VALUES (?, ?, ?)',
          [vocab.lesson, vocab.de, vocab.en],
          (err: Error | null) => {
            if (err) return reject(err);
            importedVocabulary++;
            resolve();
          }
        );
      });
    }

    // Clean up temp file
    await fs.unlink((req as any).file.path);

    db.close();

    // Auto-backup after import
    createAutoBackup().catch(err => {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('Auto-backup failed after import', { error: errMsg });
    });

    logger.info('Database imported', { importedLessons, importedVocabulary });
    res.json({
      success: true,
      imported: {
        lessons: importedLessons,
        vocabulary: importedVocabulary
      }
    });
  } catch (error) {
    db.close();
    if ((req as any).file) {
      await fs.unlink((req as any).file.path).catch(() => {});
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('Import failed', { error: errMsg });
    res.status(500).json({ error: 'Import fehlgeschlagen' });
  }
});

export default router;
