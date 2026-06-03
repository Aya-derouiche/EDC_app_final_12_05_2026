# Gym Management Microservice (Step 3)

## Run

```bash
cd gym-management
copy .env.example .env
npm install
npm run dev
```

## Base URL
- Direct: `http://localhost:5002/api/v1/gym`
- Via Gateway: `http://localhost:8080/api/v1/gym`

## Core endpoints
- `POST /bootstrap`
- `GET/POST /branches`
- `GET/POST/PUT/DELETE /members`
- `GET/POST /subscriptions`
- `PATCH /subscriptions/:id/workflow`
- `POST /subscriptions/batch/process`
- `GET /subscriptions/:id/authorization-form`
- `POST /payments/process-month`
- `POST /payments/:id/attempt`
- `POST /payments/batch/xml`
- `GET /dashboard`
