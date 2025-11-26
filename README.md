# Flor Scribe

A HIPAA-compliant medical transcription system that converts real-time audio to structured clinical notes with EHR export capabilities.

## Architecture

- **Backend**: FastAPI (Python)
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: PostgreSQL
- **Cache/Queue**: Redis + Celery
- **Real-time Transcription**: AssemblyAI
- **NLP**: OpenAI GPT-4
- **EHR Integration**: FHIR (Epic, Cerner, Office Ally)

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

### Docker

```bash
cd backend
docker-compose up -d
```

## Features

- Real-time audio transcription via WebSocket
- Clinical entity extraction (problems, medications, orders, vitals)
- SOAP note generation
- ICD-10 and CPT code mapping
- FHIR export to EHR systems
- HIPAA-compliant audit logging
- PHI encryption at rest

## Documentation

- Backend API: http://localhost:8000/docs
- Frontend: http://localhost:5173

## License

Proprietary

