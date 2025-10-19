/**
 * Admin routes for protected administrative operations
 * All routes require API key authentication via X-API-Key header
 * @module routes/admin
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../services/db.service.js';
import { requireApiKey } from '../middleware/auth.middleware.js';
import { ApiResponse } from '../types/index.js';

const router = Router();

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

  const { de, en } = req.body;

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
    res.json({ success: true, updated });
  } catch {
    res.status(500).json({ error: 'Konnte Vokabel nicht aktualisieren' });
  }
});

export default router;
