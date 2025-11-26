# Flor Scribe API Endpoints

This document lists all available endpoints in the Flor Scribe backend API.

## Base URL

All API endpoints are prefixed with `/api` except for root and health check endpoints.

## Authentication

Most endpoints require authentication via Bearer token. Include the token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Root Endpoints

### GET /
Root endpoint that returns API information.

**Response:**
```json
{
  "message": "Flor Scribe API",
  "version": "1.0.0"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

---

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "is_active": true,
  "is_verified": false
}
```

**Errors:**
- `400 Bad Request`: Email already registered

---

### POST /api/auth/login
Login and receive access/refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**Errors:**
- `401 Unauthorized`: Incorrect email or password
- `403 Forbidden`: User account is inactive

---

### POST /api/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**Errors:**
- `401 Unauthorized`: Invalid refresh token

---

### GET /api/auth/me
Get current authenticated user information.

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "is_active": true,
  "is_verified": true
}
```

---

## Realtime Transcription Endpoints

### WebSocket /api/realtime/ws
WebSocket endpoint for real-time audio streaming and transcription.

**Query Parameters:**
- `token` (required): Access token for authentication
- `session_id` (optional): Existing session ID to resume
- `patient_id` (optional): Patient identifier
- `patient_name` (optional): Patient name

**Connection:**
```
ws://localhost:8000/api/realtime/ws?token=<access_token>&session_id=123&patient_id=P001&patient_name=John%20Doe
```

**Messages Sent to Client:**

1. **Session Started:**
```json
{
  "type": "session_started",
  "session_id": 123,
  "assemblyai_session_id": "abc123"
}
```

2. **Interim Transcript:**
```json
{
  "type": "interim_transcript",
  "text": "Hello, how are you today?",
  "speaker": "A"
}
```

3. **Final Transcript:**
```json
{
  "type": "final_transcript",
  "text": "Hello, how are you today?",
  "speaker": "A"
}
```

4. **Error:**
```json
{
  "type": "error",
  "message": "Error description"
}
```

**Messages Received from Client:**
- Binary audio data (raw audio bytes)

**Errors:**
- `1008 Policy Violation`: Missing or invalid token
- `1011 Internal Error`: Connection or processing error

---

## Clinical Extraction Endpoints

### POST /api/clinicalize
Extract clinical entities (problems, medications, orders, vitals) from transcript text.

**Authentication:** Required

**Request Body:**
```json
{
  "transcript_text": "Patient presents with chest pain...",
  "session_id": 123
}
```

**Note:** Either `transcript_text` or `session_id` must be provided. If `session_id` is provided, the transcript will be retrieved from the database.

**Response:** `200 OK`
```json
{
  "problems": [
    {
      "description": "Chest pain",
      "icd10_code": "R06.02",
      "confidence": 0.95
    }
  ],
  "medications": [
    {
      "name": "aspirin",
      "dosage": "81mg",
      "frequency": "daily",
      "route": "oral",
      "normalized_name": "Aspirin"
    }
  ],
  "orders": [
    {
      "type": "lab",
      "description": "Complete blood count",
      "cpt_code": "85025",
      "confidence": 0.90
    }
  ],
  "vitals": [
    {
      "type": "bp",
      "value": "120/80",
      "unit": "mmHg",
      "normalized_value": 120.0
    }
  ],
  "icd10_codes": [
    {
      "code": "R06.02",
      "description": "Shortness of breath",
      "confidence": 0.95
    }
  ],
  "cpt_codes": [
    {
      "code": "85025",
      "description": "Complete blood count",
      "confidence": 0.90
    }
  ],
  "created_at": "2024-01-01T12:00:00Z"
}
```

**Errors:**
- `404 Not Found`: Transcript not found (when using session_id)

---

## SOAP Note Composition Endpoints

### POST /api/compose
Generate SOAP note from clinical extraction data.

**Authentication:** Required

**Request Body:**
```json
{
  "extraction_id": 456,
  "clinical_extraction": {
    "problems": [...],
    "medications": [...],
    "orders": [...],
    "vitals": [...]
  },
  "transcript_text": "Optional transcript text..."
}
```

**Note:** Either `extraction_id` or `clinical_extraction` must be provided.

**Response:** `200 OK`
```json
{
  "soap_note_id": 789,
  "html_content": "<html>...</html>",
  "billing_codes": {
    "icd10": ["R06.02"],
    "cpt": ["85025"]
  },
  "created_at": "2024-01-01T12:00:00Z"
}
```

**Errors:**
- `400 Bad Request`: Neither extraction_id nor clinical_extraction provided
- `404 Not Found`: Clinical extraction not found

---

## EHR Export Endpoints

### POST /api/export
Export SOAP note to EHR system via FHIR.

**Authentication:** Required

**Request Body:**
```json
{
  "soap_note_id": 789,
  "ehr_provider": "epic",
  "patient_id": "P001",
  "practitioner_id": "PR001",
  "client_id": "optional_client_id",
  "client_secret": "optional_client_secret"
}
```

**EHR Providers:**
- `epic`
- `cerner`
- `office_ally`

**Response:** `200 OK`
```json
{
  "export_log_id": 101,
  "status": "success",
  "fhir_bundle": {
    "resourceType": "Bundle",
    "type": "transaction",
    "entry": [...]
  },
  "error_message": null,
  "created_at": "2024-01-01T12:00:00Z"
}
```

**Status Values:**
- `pending`: Export queued
- `retrying`: Retrying after failure
- `success`: Export successful
- `failed`: Export failed

**Errors:**
- `404 Not Found`: SOAP note or clinical extraction not found
- `500 Internal Server Error`: Export failed after retries

---

## Admin Endpoints

All admin endpoints require authentication. Admin role checks are currently TODO.

### GET /api/admin/sessions
List all transcription sessions.

**Authentication:** Required

**Query Parameters:**
- `skip` (optional, default: 0): Number of records to skip
- `limit` (optional, default: 100, max: 1000): Number of records to return
- `user_id` (optional): Filter by user ID

**Response:** `200 OK`
```json
{
  "sessions": [
    {
      "id": 123,
      "user_id": 1,
      "user_email": "user@example.com",
      "patient_id": "P001",
      "patient_name": "John Doe",
      "status": "active",
      "started_at": "2024-01-01T10:00:00Z",
      "ended_at": null,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /api/admin/notes
List all SOAP notes.

**Authentication:** Required

**Query Parameters:**
- `skip` (optional, default: 0): Number of records to skip
- `limit` (optional, default: 100, max: 1000): Number of records to return

**Response:** `200 OK`
```json
{
  "notes": [
    {
      "id": 789,
      "extraction_id": 456,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /api/admin/export-logs
List all export logs.

**Authentication:** Required

**Query Parameters:**
- `skip` (optional, default: 0): Number of records to skip
- `limit` (optional, default: 100, max: 1000): Number of records to return
- `status` (optional): Filter by status (pending, retrying, success, failed)

**Response:** `200 OK`
```json
{
  "logs": [
    {
      "id": 101,
      "soap_note_id": 789,
      "ehr_provider": "epic",
      "status": "success",
      "error_message": null,
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:01:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /api/admin/stats
Get system statistics.

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "total_sessions": 150,
  "total_notes": 75,
  "total_exports": 50,
  "successful_exports": 48,
  "export_success_rate": 96.0
}
```

---

## Error Responses

All endpoints may return standard HTTP error responses:

- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "detail": "Error message description"
}
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- WebSocket connections require authentication via query parameter
- Admin endpoints currently have TODO for role-based access control
- Export endpoint includes retry logic with exponential backoff (max 3 retries)

