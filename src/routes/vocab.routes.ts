/**
 * Vocabulary routes for CRUD operations on vocabulary entries
 * @module routes/vocab
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../services/db.service.js';
import { ApiResponse } from '../types/index.js';
import { createAutoBackup } from '../utils/auto-backup.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * Validates lesson identifier format (lesson01-lesson99)
 * @param lesson - String to validate
 * @returns True if lesson matches the pattern lessonXX where XX is 01-99
 */
function isValidLessonFormat(lesson: string): boolean {
  return /^lesson(0[1-9]|[1-9][0-9])$/.test(lesson);
}

/**
 * GET /api/vocab/:lesson
 * Retrieves all vocabulary entries for a specific lesson
 * 
 * @route GET /api/vocab/:lesson
 * @param {string} lesson.path.required - Lesson identifier (lesson01, lesson02, lesson03)
 * @returns {VocabEntry[]} 200 - Array of vocabulary entries
 * @returns {ApiResponse} 400 - Invalid lesson identifier
 * @returns {ApiResponse} 500 - Database error
 */
router.get('/:lesson', async (req: Request, res: Response) => {
  const lesson = req.params.lesson;

  if (!isValidLessonFormat(lesson)) {
    return res.status(400).json({ error: 'Ungültige Lesson' });
  }

  try {
    const rows = await dbService.getVocabByLesson(lesson);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Konnte Vokabeln nicht laden' });
  }
});

/**
 * POST /api/vocab/:lesson
 * Adds a new vocabulary entry to a specific lesson
 * 
 * @route POST /api/vocab/:lesson
 * @param {string} lesson.path.required - Lesson identifier
 * @param {string} de.body.required - German word (max 60 chars)
 * @param {string} en.body.required - English translation (max 60 chars)
 * @returns {ApiResponse} 200 - Success with new entry ID
 * @returns {ApiResponse} 400 - Invalid input or lesson
 * @returns {ApiResponse} 500 - Database error
 */
router.post('/:lesson', async (req: Request, res: Response<ApiResponse>) => {
  const { de, en } = req.body as { de: string; en: string };
  const lesson = req.params.lesson;

  if (!isValidLessonFormat(lesson)) {
    return res.status(400).json({ error: 'Ungültige Lesson' });
  }

  // Input Sanitization: Trimmen, Typ prüfen, Längenlimit
  if (typeof de !== 'string' || typeof en !== 'string') {
    return res.status(400).json({ error: 'de und en müssen Strings sein' });
  }

  const sanitizedDe = de.trim();
  const sanitizedEn = en.trim();

  if (!sanitizedDe || !sanitizedEn) {
    return res.status(400).json({ error: 'de und en dürfen nicht leer sein' });
  }

  if (sanitizedDe.length > 60 || sanitizedEn.length > 60) {
    return res.status(400).json({ error: 'Vokabeln dürfen maximal 60 Zeichen lang sein' });
  }

  try {
    const id = await dbService.addVocab(lesson, sanitizedDe, sanitizedEn);
    
    // Auto-backup after data modification
    createAutoBackup().catch(err => {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Log error but don't fail the request
      logger.error('Auto-backup failed', { error: errMsg });
    });
    
    res.json({ success: true, id });
  } catch {
    res.status(500).json({ error: 'Konnte Vokabel nicht speichern' });
  }
});

export default router;
