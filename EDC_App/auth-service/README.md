# Auth Service

Central identity service for EDC SaaS.

## Run

1. Copy `.env.example` to `.env` and set DB/JWT values.
2. Install deps: `npm install`
3. Start: `npm run dev`

## Endpoints

- `POST /api/login`
- `POST /api/register`
- `POST /api/refresh-token`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh-token`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/modules`
