import express, { Request, Response } from 'express';
import multer from 'multer';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { encryption } from '../utils/encryption';
import { geminiService } from '../services/gemini.service';
import { AuthRequest } from '../types';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5242880 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// POST /api/scan - Only handles Detection (Phase 1)
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image file provided' });

    const sessionToken = encryption.generateToken();
    const userId = (req as AuthRequest).userId;

    const sessionResult = await db.query(
      `INSERT INTO scan_sessions (session_token, user_id, status, metadata)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [sessionToken, userId || null, 'processing', JSON.stringify({ fileSize: file.size })]
    );

    const sessionId = sessionResult.rows[0].id;

    // Run Phased Processing
    try {
      // Step 1: Detect books (Fast: 3-5s)
      const geminiResult = await geminiService.detectBooksFromImage(file.buffer);

      if (!geminiResult.books || geminiResult.books.length === 0) {
        await db.query(`UPDATE scan_sessions SET status = 'failed', error_message = 'No books detected' WHERE id = $1`, [sessionId]);
        return res.json({ sessionId, status: 'failed', error: 'No books detected' });
      }

      // Step 2: Save books and mark Phase 1 as completed
      for (const book of geminiResult.books) {
        await db.query(
          `INSERT INTO detected_books (scan_session_id, title, author, confidence_score, position_in_image)
           VALUES ($1, $2, $3, $4, $5)`,
          [sessionId, book.title, book.author || null, book.confidence, JSON.stringify(book.position || {})]
        );
      }

      await db.query(`UPDATE scan_sessions SET status = 'completed_detection' WHERE id = $1`, [sessionId]);

      return res.json({
        sessionId,
        status: 'completed_detection',
        booksDetected: geminiResult.books.length
      });

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Processing error';
      await db.query(`UPDATE scan_sessions SET status = 'failed', error_message = $1 WHERE id = $2`, [errMsg, sessionId]);
      return res.status(500).json({ error: errMsg });
    }
  } catch (error: unknown) {
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /api/scan/:sessionId/recommendations - Handles AI Recommendations (Phase 2)
router.get('/:sessionId/recommendations', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as AuthRequest).userId;

    // Get detected books
    const booksResult = await db.query(`SELECT title, author FROM detected_books WHERE scan_session_id = $1`, [sessionId]);
    if (booksResult.rows.length === 0) return res.status(404).json({ error: 'No books found' });

    // Parallel Enrichment and Recommendations (Phase 2 Window: 10s)
    const [recommendations] = await Promise.all([
      geminiService.generateRecommendationsBatch(booksResult.rows.slice(0, 5), {}, [])
    ]);

    // Save recommendations
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      await db.query(
        `INSERT INTO recommendations (scan_session_id, user_id, title, author, recommendation_score, reasoning, rank)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sessionId, userId || null, rec.title, rec.author, rec.score, rec.reasoning, i + 1]
      );
    }

    await db.query(`UPDATE scan_sessions SET status = 'completed' WHERE id = $1`, [sessionId]);

    // Fetch the saved recommendations to return them with correct IDs and field names
    const finalRecommendations = await db.query(
      `SELECT id, scan_session_id, title, author, recommendation_score, reasoning, rank 
       FROM recommendations WHERE scan_session_id = $1 ORDER BY rank ASC`,
      [sessionId]
    );

    return res.json(finalRecommendations.rows);

  } catch (error) {
    logger.error('Phase 2 Recommendations Error', { error });
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Full session status getter
router.get('/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = (await db.query(`SELECT * FROM scan_sessions WHERE id = $1`, [sessionId])).rows[0];
  if (!session) return res.status(404).json({ error: 'Not found' });

  const books = (await db.query(`SELECT * FROM detected_books WHERE scan_session_id = $1`, [sessionId])).rows;
  const recs = (await db.query(`SELECT * FROM recommendations WHERE scan_session_id = $1`, [sessionId])).rows;

  return res.json({ sessionId, status: session.status, detectedBooks: books, recommendations: recs });
});

export default router;
