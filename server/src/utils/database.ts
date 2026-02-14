import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from './logger';

class Database {
  private pool: Pool | null = null;

  constructor() {
    // Lazy initialization
  }

  private async ensureInitialized(): Promise<void> {
    if (this.pool) return;

    try {
      logger.info('Initializing database pool...');
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      this.pool.on('error', (err) => {
        logger.error('Unexpected database error', err);
      });

      this.pool.on('connect', () => {
        logger.info('Database connection established');
      });

      await this.testConnection();
    } catch (error) {
      logger.error('Failed to initialize database pool', error);
      throw error;
    }
  }

  async query<T extends QueryResult = QueryResult>(text: string, params?: any[]): Promise<T> {
    await this.ensureInitialized();
    const start = Date.now();
    try {
      const res = await this.pool!.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res as T;
    } catch (error) {
      logger.error('Database query error', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    await this.ensureInitialized();
    return await this.pool!.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    await this.ensureInitialized();
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

  async testConnection(): Promise<boolean> {
    try {
      const res = await this.pool!.query('SELECT NOW()');
      return !!res.rows[0];
    } catch (error) {
      logger.error('Database connection test failed', error);
      return false;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    if (!this.pool) {
      return { healthy: false };
    }

    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      return {
        healthy: true,
        latency: Date.now() - start
      };
    } catch (error) {
      return { healthy: false };
    }
  }
}

export const db = new Database();
