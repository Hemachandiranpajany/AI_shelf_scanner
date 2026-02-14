import crypto from 'crypto';
import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

class EncryptionService {
  private key: Buffer | null = null;

  private ensureInitialized(): void {
    if (this.key) return;

    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }

    // Derive a key from the encryption key
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  encrypt(text: string): string {
    this.ensureInitialized();
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const salt = crypto.randomBytes(SALT_LENGTH);

      const cipher = crypto.createCipheriv(ALGORITHM, this.key!, iv);

      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
      ]);

      const tag = cipher.getAuthTag();

      return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
    } catch (error) {
      logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedText: string): string {
    this.ensureInitialized();
    try {
      const buffer = Buffer.from(encryptedText, 'base64');

      const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION);
      const tag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION);
      const encrypted = buffer.subarray(ENCRYPTED_POSITION);

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key!, iv);
      decipher.setAuthTag(tag);

      return decipher.update(encrypted) + decipher.final('utf8');
    } catch (error) {
      logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt data');
    }
  }

  hash(text: string): string {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');
  }

  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

export const encryption = new EncryptionService();
