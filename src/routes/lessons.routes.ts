/**
 * Lessons routes for managing lessons
 * @module routes/lessons
 */

import { Router, Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import { logger } from '../utils/logger.js';
import { getDbPath } from '../utils/db-path.js';
import multer from 'multer';
import fs from 'fs';

const router = Router();
const upload = multer({ dest: 'tmp/' });

interface LessonData {
  slug: string;
  title?: string;
  description?: string;
  entry_count: number;
}

interface VocabPair {
  de: string;
  en: string;
}

/**
 * Formats a lesson slug to a display title with leading zero
 * @param slug - Lesson slug (e.g., 'lesson01', 'lesson06')
 * @returns Formatted title (e.g., 'Lektion 01', 'Lektion 06')
 */
function formatLessonTitle(slug: string): string {
  const match = slug.match(/^lesson(\d+)$/);
  if (match) {
    return `Lektion ${match[1]}`;
  }
  return slug;
}

/**
 * GET /api/lessons
 * Retrieves all available lessons
 */
router.get('/', async (req: Request, res: Response) => {
  const DB_PATH = getDbPath();
  const db = new sqlite3.Database(DB_PATH);

  // Try to read from lessons table first, fall back to vocabulary table
  db.all('SELECT slug, title, description, entry_count FROM lessons ORDER BY slug', 
    (err, rows: LessonData[]) => {
      if (err || !rows || rows.length === 0) {
        // Fallback: read from vocabulary table
        db.all('SELECT lesson as slug, COUNT(*) as entry_count FROM vocabulary GROUP BY lesson ORDER BY lesson', 
          (err2, rows2: LessonData[]) => {
            if (err2) {
              logger.error('Failed to fetch lessons', { error: err2.message });
              db.close();
              return res.status(500).json({ error: 'Konnte Lessons nicht laden' });
            }

            const lessons = rows2.map(row => ({
              slug: row.slug,
              title: formatLessonTitle(row.slug),
              entry_count: row.entry_count
            }));

            db.close();
            res.json(lessons);
          }
        );
      } else {
        // Use lessons table data
        const lessons = rows.map(row => ({
          slug: row.slug,
          title: row.title || formatLessonTitle(row.slug),
          description: row.description,
          entry_count: row.entry_count
        }));

        db.close();
        res.json(lessons);
      }
    }
  );
});

/**
 * POST /api/lessons
 * Creates a new lesson with optional vocabulary JSON upload
 * 
 * Request body or file should contain:
 * - Optional: JSON array of { de, en } pairs
 * 
 * The lesson number is auto-incremented (lesson01-lesson99)
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  const DB_PATH = getDbPath();
  const db = new sqlite3.Database(DB_PATH);

  try {
    // Find the next available lesson number from lessons table
    const existingLessons = await new Promise<string[]>((resolve, reject) => {
      db.all(
        'SELECT slug FROM lessons ORDER BY slug',
        (err, rows: { slug: string }[]) => {
          if (err) return reject(err);
          resolve(rows.map(r => r.slug));
        }
      );
    });

    // Extract lesson numbers and find the next one
    const lessonNumbers = existingLessons
      .map(l => {
        const match = l.match(/^lesson(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);

    const nextNumber = lessonNumbers.length === 0 
      ? 1 
      : Math.max(...lessonNumbers) + 1;

    if (nextNumber > 99) {
      db.close();
      return res.status(400).json({ 
        error: 'Maximale Anzahl an Lessons (99) erreicht' 
      });
    }

    const newSlug = `lesson${String(nextNumber).padStart(2, '0')}`;

    // Parse vocabulary pairs from file or body
    let vocabPairs: VocabPair[] = [];
    
    if ((req as any).file) {
      // Read from uploaded file
      const fileContent = fs.readFileSync((req as any).file.path, 'utf-8');
      const parsed = JSON.parse(fileContent);
      vocabPairs = Array.isArray(parsed) ? parsed : [];
      
      // Clean up uploaded file
      fs.unlinkSync((req as any).file.path);
    } else if (req.body.vocabulary) {
      // Read from request body
      vocabPairs = Array.isArray(req.body.vocabulary) ? req.body.vocabulary : [];
    }

    // Validate vocabulary pairs
    const validPairs = vocabPairs.filter(pair => 
      pair.de && 
      pair.en && 
      typeof pair.de === 'string' && 
      typeof pair.en === 'string' &&
      pair.de.trim().length > 0 &&
      pair.en.trim().length > 0 &&
      pair.de.length <= 60 &&
      pair.en.length <= 60
    );

    // Insert vocabulary pairs
    if (validPairs.length > 0) {
      const stmt = db.prepare('INSERT OR IGNORE INTO vocabulary (lesson, de, en) VALUES (?, ?, ?)');
      
      for (const pair of validPairs) {
        await new Promise<void>((resolve, reject) => {
          stmt.run(newSlug, pair.de.trim(), pair.en.trim(), (err: Error | null) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }

      stmt.finalize();
    }

    // Get the actual entry count
    const entryCount = await new Promise<number>((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM vocabulary WHERE lesson = ?',
        [newSlug],
        (err, row: { count: number } | undefined) => {
          if (err) return reject(err);
          resolve(row?.count || 0);
        }
      );
    });

    // Update lessons metadata table
    const formattedTitle = formatLessonTitle(newSlug);
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO lessons (slug, title, description, entry_count, created_at) 
         VALUES (?, ?, NULL, ?, datetime('now'))
         ON CONFLICT(slug) DO UPDATE SET entry_count = ?, title = ?`,
        [newSlug, formattedTitle, entryCount, entryCount, formattedTitle],
        (err: Error | null) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    db.close();

    logger.info('New lesson created', { 
      slug: newSlug, 
      entryCount,
      uploadedPairs: vocabPairs.length,
      validPairs: validPairs.length
    });

    res.json({ 
      success: true, 
      lesson: {
        slug: newSlug,
        title: formattedTitle,
        entry_count: entryCount
      }
    });

  } catch (error) {
    db.close();
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to create lesson', { error: errMsg });
    res.status(500).json({ error: 'Konnte Lesson nicht erstellen' });
  }
});

export default router;
