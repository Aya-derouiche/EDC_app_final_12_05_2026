# EDC Application — Node 24 + Vite + React 19 + PostgreSQL + MinIO

## Stack
- **Frontend**: React 19 + Vite 7 (port 5173)
- **Backend**: Node.js 24 / Express (port 5000)
- **Database**: PostgreSQL 15 (port 5432)
- **Storage**: MinIO S3-compatible (port 9000, console 9001)

## Quick Start (Local — sans Docker)

### 1. Base de données PostgreSQL
```bash
psql -U postgres
CREATE DATABASE cloud;
\c cloud
\i cloud.sql
\q
```

### 2. MinIO
```bash
# Windows: minio.exe server C:\minio\data --console-address ":9001"
# Linux/Mac: minio server ./minio-data --console-address ":9001"
```

### 3. Backend
```bash
cd backend
npm install
# .env est déjà configuré
node server.js
# → Server running on port 5000
# → Connected to PostgreSQL
# → MinIO bucket "edc-documents" ready
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Docker (tout en une commande)
```bash
docker-compose up --build
# Frontend  → http://localhost:80
# Backend   → http://localhost:5000
# MinIO UI  → http://localhost:9001 (minioadmin/minioadmin)
```

## Variables d'environnement (backend/.env)
| Variable | Défaut |
|----------|--------|
| PORT | 5000 |
| DATABASE_HOST | localhost |
| DATABASE_USER | postgres |
| DATABASE_PASSWORD | postgres |
| DATABASE_NAME | cloud |
| MINIO_ENDPOINT | localhost |
| MINIO_ACCESS_KEY | minioadmin |
| MINIO_SECRET_KEY | minioadmin |
