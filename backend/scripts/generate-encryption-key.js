#!/usr/bin/env node

/**
 * Script to generate a secure encryption key for HIPAA compliance
 * Usage: node scripts/generate-encryption-key.js
 */

const crypto = require('crypto');

// Generate a 32-byte (256-bit) key
const key = crypto.randomBytes(32).toString('hex');

console.log('\n========================================');
console.log('HIPAA Encryption Key Generator');
console.log('========================================\n');
console.log('Generated Encryption Key (64 hex characters):');
console.log(key);
console.log('\nAdd this to your .env file as:');
console.log(`ENCRYPTION_KEY=${key}`);
console.log('\n⚠️  IMPORTANT:');
console.log('  - Never commit this key to version control');
console.log('  - Store it securely');
console.log('  - Use different keys for dev/staging/production');
console.log('  - Backup the key securely (losing it means losing access to encrypted data)');
console.log('\n========================================\n');



