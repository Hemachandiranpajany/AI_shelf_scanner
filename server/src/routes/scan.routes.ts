import express, { Request, Response } from 'express';
import multer from 'multer';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { encryption } from '../utils/encryption';
import { geminiService } from '../services/gemini.service';
import { googleBooksService } from '../services/googleBooks.service';
import { AuthRequest } from '../types';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default (reduced for free tier speed)
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// POST /api/scan - Process bookshelf image (optimized for 10s Vercel free tier)
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const sessionToken = encryption.generateToken();
    const userId = (req as AuthRequest).userId;

    // Create scan session
    const sessionResult = await db.query(
      `INSERT INTO scan_sessions (session_token, user_id, status, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [sessionToken, userId || null, 'processing', JSON.stringify({ fileSize: file.size })]
    );

    const sessionId = sessionResult.rows[0].id;

    // Process synchronously — Vercel serverless requires we finish before response
    // The entire pipeline must complete within ~9 seconds
    try {
      await processImage(sessionId, file.buffer, userId);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Processing error';
      logger.error('Image processing error', { sessionId, error: errMsg });
      // Session is already marked failed inside processImage
    }

    // Return the sessionId — client will poll for results
    return res.json({
      sessionId,
      status: 'processing'
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Upload handler error', { error: errMsg });
    return res.status(500).json({ error: 'Failed to process upload' });
  }
});

// GET /api/scan/:sessionId - Get scan results
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Get session
    const sessionResult = await db.query(
      `SELECT * FROM scan_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    if (session.status === 'processing') {
      return res.json({
        sessionId,
        status: 'processing',
        message: 'Still processing image'
      });
    }

    if (session.status === 'failed') {
      return res.json({
        sessionId,
        status: 'failed',
        error: session.error_message
      });
    }

    // Get detected books
    const booksResult = await db.query(
      `SELECT * FROM detected_books 
       WHERE scan_session_id = $1 
       ORDER BY confidence_score DESC`,
      [sessionId]
    );

    // Get recommendations
    const recommendationsResult = await db.query(
      `SELECT r.*, 
              COALESCE(r.title, db.title) as title, 
              COALESCE(r.author, db.author) as author
       FROM recommendations r
       LEFT JOIN detected_books db ON r.detected_book_id = db.id
       WHERE r.scan_session_id = $1 
       ORDER BY r.rank ASC`,
      [sessionId]
    );

    return res.json({
      sessionId,
      status: 'completed',
      detectedBooks: booksResult.rows,
      recommendations: recommendationsResult.rows,
      createdAt: session.created_at
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Get scan results error', { error: errMsg });
    return res.status(500).json({ error: 'Failed to retrieve scan results' });
  }
});

// POST /api/scan/:sessionId/feedback - Submit user feedback
router.post('/:sessionId/feedback', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { detectedBookId, feedbackType, isCorrect, correctedTitle, correctedAuthor, comments } = req.body;
    const userId = (req as AuthRequest).userId;

    await db.query(
      `INSERT INTO user_feedback 
       (scan_session_id, detected_book_id, user_id, feedback_type, is_correct, corrected_title, corrected_author, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [sessionId, detectedBookId || null, userId || null, feedbackType, isCorrect, correctedTitle, correctedAuthor, comments]
    );

    return res.json({ message: 'Feedback submitted successfully' });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to submit feedback', { error: errMsg });
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Optimized image processing for 10-second budget
async function processImage(sessionId: string, imageBuffer: Buffer, userId?: string) {
  try {
    logger.info('Starting image processing', { sessionId });

    // Step 1: Detect books using Gemini (typically 2-4 seconds)
    const geminiResult = await geminiService.detectBooksFromImage(imageBuffer);

    if (!geminiResult.books || geminiResult.books.length === 0) {
      await db.query(
        `UPDATE scan_sessions SET status = $1, error_message = $2 WHERE id = $3`,
        ['failed', 'No books detected in image', sessionId]
      );
      return;
    }

    // Step 2: Save detected books FIRST (fast, ensures data is persisted)
    const detectedBookIds: string[] = [];

    for (const book of geminiResult.books) {
      const result = await db.query(
        `INSERT INTO detected_books 
         (scan_session_id, title, author, confidence_score, metadata, position_in_image)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          sessionId,
          book.title,
          book.author || null,
          book.confidence,
          '{}',  // Skip enrichment on insert, do it in parallel
          JSON.stringify(book.position || {})
        ]
      );
      detectedBookIds.push(result.rows[0].id);
    }

    // Step 3: Run enrichment + recommendations in parallel to save time
    const booksToRecommend = geminiResult.books.slice(0, 5);

    // Get user preferences (if user is logged in)
    let userPreferences = {};
    let readingHistory: unknown[] = [];
    if (userId) {
      const [prefsResult, historyResult] = await Promise.all([
        db.query(`SELECT preferences FROM users WHERE id = $1`, [userId]),
        db.query(`SELECT * FROM reading_history WHERE user_id = $1 ORDER BY added_at DESC LIMIT 10`, [userId])
      ]);
      userPreferences = prefsResult.rows?.[0]?.preferences || {};
      readingHistory = historyResult.rows || [];
    }

    // Run book enrichment and recommendation generation in parallel
    const [enrichedBooks, recommendations] = await Promise.all([
      googleBooksService.enrichBookData(
        geminiResult.books.map(b => ({ title: b.title, author: b.author }))
      ).catch(() => geminiResult.books.map(() => null)),

      geminiService.generateRecommendationsBatch(
        booksToRecommend,
        userPreferences,
        readingHistory as Array<{ book_title: string; book_author?: string; rating?: number }>
      ).catch(() => [])
    ]);

    // Step 4: Update detected books with enrichment data (batch update)
    for (let i = 0; i < detectedBookIds.length; i++) {
      const metadata = enrichedBooks[i];
      if (metadata) {
        await db.query(
          `UPDATE detected_books SET metadata = $1 WHERE id = $2`,
          [JSON.stringify(metadata), detectedBookIds[i]]
        );
      }
    }

    // Step 5: Save recommendations (skip enrichment for speed — do metadata inline)
    if (recommendations.length > 0) {
      // Quick enrichment for recommendations (parallel, with 3s timeout)
      let enrichedRecs: Array<unknown>;
      try {
        enrichedRecs = await Promise.race([
          googleBooksService.enrichBookData(
            recommendations.map(r => ({ title: r.title, author: r.author }))
          ),
          new Promise<Array<null>>((resolve) => setTimeout(() => resolve(recommendations.map(() => null)), 3000))
        ]);
      } catch {
        enrichedRecs = recommendations.map(() => null);
      }

      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i];
        const metadata = enrichedRecs[i] || {};

        await db.query(
          `INSERT INTO recommendations 
           (scan_session_id, detected_book_id, user_id, title, author, recommendation_score, reasoning, rank, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [sessionId, null, userId || null, rec.title, rec.author, rec.score, rec.reasoning, i + 1, JSON.stringify(metadata)]
        );
      }
    }

    // Step 6: Mark session as completed
    await db.query(
      `UPDATE scan_sessions SET status = $1 WHERE id = $2`,
      ['completed', sessionId]
    );

    logger.info('Image processing completed', { sessionId, booksDetected: geminiResult.books.length });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Internal processing error';
    logger.error('Critical image processing error', { sessionId, error: errMsg });

    await db.query(
      `UPDATE scan_sessions SET status = $1, error_message = $2 WHERE id = $3`,
      ['failed', errMsg, sessionId]
    ).catch(() => { /* best effort */ });
  }
}

export default router;
