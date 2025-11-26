import { ValueTransformer } from 'typeorm';

// Singleton to hold encryption service instance
let encryptionServiceInstance: any = null;

export function setEncryptionService(service: any) {
  encryptionServiceInstance = service;
}

export function getEncryptionService() {
  return encryptionServiceInstance;
}

/**
 * Creates a transformer for encrypting/decrypting database columns
 * Note: The encryption service must be set using setEncryptionService() before entities are loaded
 */
export function createEncryptTransformer(): ValueTransformer {
  return {
    to: (value: string | null | undefined) => {
      if (!value || value === null || value === undefined) return value;
      
      const encryptionService = getEncryptionService();
      if (!encryptionService) {
        // If encryption service not available, return as-is (for migrations/initial setup)
        console.warn('EncryptionService not available, storing plain text');
        return value;
      }
      
      try {
        return encryptionService.encrypt(value);
      } catch (error) {
        console.error('Encryption failed:', error);
        throw error;
      }
    },
    from: (value: string | null | undefined) => {
      if (!value || value === null || value === undefined) return value;
      
      const encryptionService = getEncryptionService();
      if (!encryptionService) {
        // If encryption service not available, assume plain text (for migrations)
        return value;
      }
      
      // Check if value is already encrypted (format: iv:authTag:encryptedData)
      if (typeof value === 'string' && value.includes(':') && value.split(':').length === 3) {
        try {
          return encryptionService.decrypt(value);
        } catch (error) {
          // If decryption fails, might be plain text from before encryption was enabled
          console.warn('Decryption failed, returning as-is:', error.message);
          return value;
        }
      }
      
      // Not encrypted, return as-is
      return value;
    },
  };
}

