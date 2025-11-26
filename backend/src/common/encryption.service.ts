import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    // Get encryption key from environment (32 bytes for AES-256)
    const keyString = this.configService.get<string>('ENCRYPTION_KEY');
    if (!keyString) {
      throw new Error('ENCRYPTION_KEY environment variable is required for HIPAA compliance');
    }
    
    // Support both hex string (64 chars) and base64 encoded keys
    if (keyString.length === 64) {
      // Hex encoded key
      this.key = Buffer.from(keyString, 'hex');
    } else {
      // Base64 encoded key (44 chars)
      this.key = Buffer.from(keyString, 'base64');
    }

    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)');
    }
  }

  /**
   * Encrypts a string value
   * Returns format: iv:authTag:encryptedData (all hex encoded)
   */
  encrypt(text: string | null | undefined): string | null {
    if (!text) return text;
    
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Return IV + authTag + encrypted data (all hex encoded)
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts an encrypted string value
   * Expects format: iv:authTag:encryptedData (all hex encoded)
   */
  decrypt(encryptedData: string | null | undefined): string | null {
    if (!encryptedData) return encryptedData;
    
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a new encryption key (for setup purposes)
   * Returns a hex-encoded 32-byte key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}


