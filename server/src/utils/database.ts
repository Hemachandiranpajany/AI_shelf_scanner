import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from './logger';

class Database {
  private pool: Pool | null = null;

  constructor() {
    // Lazy initialization — do NOT connect in constructor for serverless
  }

  private getPool(): Pool {
    if (this.pool) return this.pool;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    logger.info('Initializing database pool...');
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : undefined,
      max: 5, // Keep low for serverless (free tier connection limits)
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error', { message: err.message });
    });

    return this.pool;
  }

  async query<T extends QueryResult = QueryResult>(text: string, params?: unknown[]): Promise<T> {
    const pool = this.getPool();
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
      return res as T;
    } catch (error) {
      logger.error('Database query error', { text: text.substring(0, 80), error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    const pool = this.getPool();
    return await pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    try {
      const pool = this.getPool();
      const start = Date.now();
      await pool.query('SELECT 1');
      return {
        healthy: true,
        latency: Date.now() - start
      };
    } catch {
      return { healthy: false };
    }
  }
}

export const db = new Database();
