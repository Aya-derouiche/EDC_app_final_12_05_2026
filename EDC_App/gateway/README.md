# API Gateway (Step 1)

This service is the first ERP microservices step:
- Single entry point for `/api/*`
- JWT validation at the edge
- Request correlation via `x-request-id`
- Proxy to current core backend

## Run

```bash
cd gateway
npm install
npm run dev
```

## Env
Copy `.env.example` to `.env` and adjust values.

## Current routing
- Gateway receives: `http://localhost:8080/api/*`
- Proxies to core service: `http://localhost:5000/api/*`

Use this gradually by pointing frontend API base URL to gateway.
