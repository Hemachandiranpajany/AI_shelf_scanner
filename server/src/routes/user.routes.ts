import express, { Response } from 'express';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

const router = express.Router();

// GET /api/user/profile - Get user profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await db.query(
      `SELECT id, email, username, preferences, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(result.rows[0]);

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get user profile', { error: errMsg });
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { username, email } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await db.query(
      `UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING id, email, username, preferences`,
      [username, email, userId]
    );

    return res.json(result.rows[0]);

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to update profile', { error: errMsg });
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/user/preferences - Update user preferences
router.put('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const preferences = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await db.query(
      `UPDATE users SET preferences = $1 WHERE id = $2 RETURNING preferences`,
      [JSON.stringify(preferences), userId]
    );

    return res.json(result.rows[0]);

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to update preferences', { error: errMsg });
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// POST /api/user/reading-history - Add book to reading history
router.post('/reading-history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { bookTitle, bookAuthor, bookIsbn, rating, status } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await db.query(
      `INSERT INTO reading_history (user_id, book_title, book_author, book_isbn, rating, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, book_isbn) DO UPDATE
       SET rating = $5, status = $6
       RETURNING *`,
      [userId, bookTitle, bookAuthor, bookIsbn, rating, status]
    );

    return res.json(result.rows[0]);

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to add reading history', { error: errMsg });
    return res.status(500).json({ error: 'Failed to add to reading history' });
  }
});

// GET /api/user/reading-history - Get user's reading history
router.get('/reading-history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await db.query(
      `SELECT * FROM reading_history WHERE user_id = $1 ORDER BY added_at DESC`,
      [userId]
    );

    return res.json(result.rows);

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get reading history', { error: errMsg });
    return res.status(500).json({ error: 'Failed to retrieve reading history' });
  }
});

// DELETE /api/user/data - Delete all user data (GDPR compliance)
router.delete('/data', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Delete user (cascade will handle related data)
    await db.query(`DELETE FROM users WHERE id = $1`, [userId]);

    return res.json({ message: 'All user data deleted successfully' });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to delete user data', { error: errMsg });
    return res.status(500).json({ error: 'Failed to delete user data' });
  }
});

export default router;
