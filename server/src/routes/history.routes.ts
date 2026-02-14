import express, { Response } from 'express';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

const router = express.Router();

// GET /api/history - Get user's scan history
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await db.query(
      `SELECT 
        ss.*,
        COUNT(DISTINCT db.id) as books_detected,
        COUNT(DISTINCT r.id) as recommendations_count
       FROM scan_sessions ss
       LEFT JOIN detected_books db ON ss.id = db.scan_session_id
       LEFT JOIN recommendations r ON ss.id = r.scan_session_id
       WHERE ss.user_id = $1
       GROUP BY ss.id
       ORDER BY ss.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return res.json(result.rows);

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get scan history', { error: errMsg });
    return res.status(500).json({ error: 'Failed to retrieve scan history' });
  }
});

// GET /api/history/:sessionId - Get specific scan session details
router.get('/:sessionId', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    // Get session
    const sessionResult = await db.query(
      `SELECT * FROM scan_sessions WHERE id = $1 ${userId ? 'AND user_id = $2' : ''}`,
      userId ? [sessionId, userId] : [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get detected books
    const booksResult = await db.query(
      `SELECT * FROM detected_books WHERE scan_session_id = $1 ORDER BY confidence_score DESC`,
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
      session: sessionResult.rows[0],
      detectedBooks: booksResult.rows,
      recommendations: recommendationsResult.rows
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get session details', { error: errMsg });
    return res.status(500).json({ error: 'Failed to retrieve session details' });
  }
});

// DELETE /api/history/:sessionId - Delete a scan session
router.delete('/:sessionId', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await db.query(
      `DELETE FROM scan_sessions WHERE id = $1 AND user_id = $2 RETURNING id`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json({ message: 'Session deleted successfully' });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to delete session', { error: errMsg });
    return res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
