# HIPAA Compliance Setup Guide

This document outlines the HIPAA compliance features implemented in Flor Scribe and how to configure them.

## Features Implemented

### 1. Encryption at Rest
- **Patient Data**: Email, phone number, address, and national ID are encrypted
- **Transcripts**: All transcript text is encrypted in the database
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Implementation**: Automatic encryption/decryption via TypeORM transformers

### 2. Audit Logging
- **Automatic Logging**: All PHI access is automatically logged
- **Logged Actions**: VIEW, CREATE, UPDATE, DELETE, EXPORT, REDACT
- **Logged Resources**: PATIENT, TRANSCRIPT, SOAP_NOTE, CLINICAL_EXTRACTION, SESSION
- **Metadata Captured**: User ID, IP address, user agent, request path, timestamps

### 3. Redaction Service
- **Pattern-Based Redaction**: Removes SSNs, phone numbers, emails, dates
- **Patient Name Redaction**: Automatically redacts patient names from transcripts
- **Configurable**: Control what gets redacted via query parameters
- **Audit Trail**: All redactions are logged with metadata

## Environment Configuration

### Required Environment Variables

Add the following to your `.env` file:

```bash
# HIPAA Compliance - Encryption Key (REQUIRED)
# Generate a new key using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_64_character_hex_encoded_key_here
```

### Generating an Encryption Key

**Option 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option 3: Using Python**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

The key must be exactly 64 hexadecimal characters (32 bytes).

### Security Best Practices

1. **Never commit the encryption key to version control**
2. **Use different keys for development, staging, and production**
3. **Store production keys in a secure key management service (AWS KMS, HashiCorp Vault)**
4. **Rotate keys periodically** (requires data migration)
5. **Backup keys securely** (losing the key means losing access to encrypted data)

## Database Migration

### Important Notes

- **Existing Data**: Data stored before encryption was enabled will remain unencrypted
- **Migration**: To encrypt existing data, you'll need to write a migration script
- **Backward Compatibility**: The system can read both encrypted and unencrypted data

### Example Migration Script

```typescript
// backend/src/patients/patients.migration.ts (example)
// This would need to be implemented to encrypt existing patient data
```

## API Usage

### Redacted Transcript Endpoint

Get a redacted version of a transcript:

```bash
GET /api/transcripts/:id/redacted?redactNames=true&redactPhone=true&redactEmail=true&redactSSN=true
```

**Query Parameters:**
- `redactNames` (default: true) - Redact patient names
- `redactPhone` (default: true) - Redact phone numbers
- `redactEmail` (default: true) - Redact email addresses
- `redactSSN` (default: true) - Redact Social Security Numbers
- `redactDates` (default: false) - Redact dates (use with caution for medical dates)

**Response:**
```json
{
  "redactedText": "...",
  "redactedItemsCount": 5,
  "originalLength": 1234,
  "redactedLength": 1456
}
```

### Audit Log Queries

Query audit logs (requires admin access):

```bash
# Get all PHI access logs
GET /api/audit/phi-access?startDate=2024-01-01&endDate=2024-12-31

# Get logs for a specific patient
GET /api/audit/patient/:patientId

# Get logs for a specific user
GET /api/audit/user/:userId
```

## Compliance Checklist

- [x] Encryption at rest for PHI
- [x] Encryption in transit (HTTPS/TLS)
- [x] Audit logging for all PHI access
- [x] Access controls (JWT authentication)
- [x] Redaction capabilities
- [ ] Data retention policies (to be implemented)
- [ ] Automated backup encryption (database-level)
- [ ] Business Associate Agreements (BAAs) with third-party services

## Third-Party Services

Ensure you have Business Associate Agreements (BAAs) with:
- **OpenAI** (for GPT-4 clinical extraction)
- **AssemblyAI** (for transcription)
- **Cloud Provider** (AWS/GCP/Azure for hosting)
- **Database Provider** (if using managed database)

## Monitoring and Alerts

Set up monitoring for:
1. Failed encryption/decryption operations
2. Unusual access patterns (multiple failed logins, bulk exports)
3. Audit log storage capacity
4. Encryption key rotation schedule

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is required"

**Solution**: Add `ENCRYPTION_KEY` to your `.env` file with a valid 64-character hex key.

### Error: "Decryption failed"

**Possible Causes**:
1. Wrong encryption key
2. Data was encrypted with a different key
3. Data corruption

**Solution**: Verify the encryption key matches the one used to encrypt the data.

### Data appears encrypted in database but decrypted in application

This is expected behavior - the TypeORM transformers automatically decrypt data when reading from the database.

### Audit logs not being created

**Check**:
1. AuditModule is imported in AppModule
2. AuditLogInterceptor is registered as APP_INTERCEPTOR
3. Database table `audit_logs` exists
4. User is authenticated (JWT guard)

## Support

For questions or issues related to HIPAA compliance features, contact your system administrator or security team.



