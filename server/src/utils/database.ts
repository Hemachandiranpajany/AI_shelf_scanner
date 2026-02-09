import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from './logger';

class Database {
  private pool: Pool | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
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
        this.isConnected = false;
      });

      this.pool.on('connect', () => {
        this.isConnected = true;
        logger.info('Database connection established');
      });

      // Test connection
      this.testConnection();
    } catch (error) {
      logger.error('Failed to initialize database pool', error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const client = await this.pool!.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      logger.info('Database connection test successful');
    } catch (error) {
      logger.error('Database connection test failed', error);
      this.isConnected = false;
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    try {
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Database query error', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool.connect();
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
      this.isConnected = false;
      logger.info('Database pool closed');
    }
  }

  isHealthy(): boolean {
    return this.isConnected && this.pool !== null;
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    if (!this.pool) {
      return { healthy: false };
    }

    try {
      const start = Date.now();
      await this.query('SELECT 1');
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      logger.error('Health check failed', error);
      return { healthy: false };
    }
  }
}

export const db = new Database();
