# SaaS V2 Implementation (Applied)

## Added in this iteration

- New microservice: `bank-service` (batch XML generation + bank result import)
- New microservice: `notification-service` (centralized notification API)
- New microservice: `reporting-service` (financial overview API)
- Gateway routing extended:
  - `/api/v1/gym` -> `GYM_SERVICE_URL`
  - `/api/v1/bank` -> `BANK_SERVICE_URL`
  - `/api/v1/notifications` -> `NOTIFICATION_SERVICE_URL`
  - `/api/v1/reporting` -> `REPORTING_SERVICE_URL`
- SQL foundation file: `gym-management/db/saas_v2.sql`
  - tenants / licenses / contracts / HQ validation queue / payment attempts

## Start commands

Open 7 terminals:

1. `auth-service`: `C:\nvm4w\nodejs\npm.cmd run dev`
2. `backend`: `C:\nvm4w\nodejs\npm.cmd run dev`
3. `gym-management`: `C:\nvm4w\nodejs\npm.cmd run dev`
4. `bank-service`: `C:\nvm4w\nodejs\npm.cmd install && C:\nvm4w\nodejs\npm.cmd run dev`
5. `notification-service`: `C:\nvm4w\nodejs\npm.cmd install && C:\nvm4w\nodejs\npm.cmd run dev`
6. `reporting-service`: `C:\nvm4w\nodejs\npm.cmd install && C:\nvm4w\nodejs\npm.cmd run dev`
7. `gateway`: `C:\nvm4w\nodejs\npm.cmd run dev`
8. `frontend`: `C:\nvm4w\nodejs\npm.cmd run dev`

## Health checks

- `http://localhost:5002/health`
- `http://localhost:5003/health`
- `http://localhost:5004/health`
- `http://localhost:5005/health`
- `http://localhost:8081/health`

## Next implementation steps to reach full scenario

- Contract PDF generation + MinIO storage + signature workflow
- HQ approval UI in frontend
- Automated scheduler for retry and month-end batch creation
- Bank-specific XML mapping templates (BIAT/STB/Amen/Attijari)
- Notification channels integration (SMTP/SMS/WhatsApp API)
- Super Admin screens for licenses/tenants/subdomains
