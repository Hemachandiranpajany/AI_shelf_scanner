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
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// POST /api/scan - Process bookshelf image
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

    // Start async processing
    processImage(sessionId, file.buffer, userId).catch(error => {
      logger.error('Image processing failed', { sessionId, error });
    });

    res.status(202).json({
      sessionId,
      sessionToken,
      status: 'processing',
      message: 'Image is being processed. Poll /api/scan/:sessionId for results.'
    });

  } catch (error) {
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

    res.json({
      sessionId,
      status: 'completed',
      detectedBooks: booksResult.rows,
      recommendations: recommendationsResult.rows,
      createdAt: session.created_at
    });

  } catch (error) {
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

    res.json({ message: 'Feedback submitted successfully' });

  } catch (error) {
    logger.error('Failed to submit feedback', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Async image processing function
async function processImage(sessionId: string, imageBuffer: Buffer, userId?: string) {
  try {
    logger.info('Starting image processing', { sessionId });

    // Step 1: Detect books using Gemini
    const geminiResult = await geminiService.detectBooksFromImage(imageBuffer);

    if (!geminiResult.books || geminiResult.books.length === 0) {
      await db.query(
        `UPDATE scan_sessions SET status = $1, error_message = $2 WHERE id = $3`,
        ['failed', 'No books detected in image', sessionId]
      );
      return;
    }

    // Step 2: Enrich book data with Google Books API
    const enrichedBooks = await googleBooksService.enrichBookData(
      geminiResult.books.map(b => ({ title: b.title, author: b.author }))
    );

    // Step 3: Save detected books
    const detectedBookIds: string[] = [];

    for (let i = 0; i < geminiResult.books.length; i++) {
      const book = geminiResult.books[i];
      const metadata = enrichedBooks[i] || {};

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
          JSON.stringify(metadata),
          JSON.stringify(book.position)
        ]
      );

      detectedBookIds.push(result.rows[0].id);
    }

    // Step 4: Generate recommendations (Batch)
    const userPrefsResult = userId ? await db.query(
      `SELECT preferences FROM users WHERE id = $1`,
      [userId]
    ) : { rows: [] };

    const readingHistoryResult = userId ? await db.query(
      `SELECT * FROM reading_history WHERE user_id = $1 ORDER BY added_at DESC LIMIT 10`,
      [userId]
    ) : { rows: [] };

    const userPreferences = userPrefsResult.rows?.[0]?.preferences || {};
    const readingHistory = readingHistoryResult.rows || [];

    const booksToRecommend = geminiResult.books.slice(0, 5);
    logger.info(`Generating batch recommendations for ${booksToRecommend.length} books`, { sessionId, userId });

    try {
      const recommendations = await geminiService.generateRecommendationsBatch(
        booksToRecommend,
        userPreferences,
        readingHistory
      );

      // Enrich recommendations with Google Books metadata
      const enrichedRecs = await googleBooksService.enrichBookData(
        recommendations.map(r => ({ title: r.title, author: r.author }))
      );

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
      logger.info('Batch recommendations completed with enrichment', { sessionId });
    } catch (batchError: any) {
      logger.error('Failed to generate or enrich batch recommendations', { sessionId, error: batchError.message });
    }

    // Step 5: Update session status
    await db.query(
      `UPDATE scan_sessions SET status = $1 WHERE id = $2`,
      ['completed', sessionId]
    );

    logger.info('Image processing completed successfully', { sessionId, booksDetected: geminiResult.books.length });

  } catch (error: any) {
    logger.error('Critical image processing error', {
      sessionId,
      message: error.message,
      stack: error.stack
    });

    await db.query(
      `UPDATE scan_sessions SET status = $1, error_message = $2 WHERE id = $3`,
      ['failed', error.message || 'Internal processing error', sessionId]
    );
  }
}

export default router;
