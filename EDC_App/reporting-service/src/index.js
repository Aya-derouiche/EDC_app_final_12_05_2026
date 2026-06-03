require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));

const pool = new Pool({
  host: process.env.REPORT_DB_HOST || process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.REPORT_DB_PORT || process.env.DB_PORT || 5432),
  user: process.env.REPORT_DB_USER || process.env.DB_USER || "postgres",
  password: process.env.REPORT_DB_PASSWORD || process.env.DB_PASSWORD || "aya",
  database: process.env.REPORT_DB_NAME || process.env.DB_NAME || "cloud",
});

async function q(text, params = []) {
  return pool.query(text, params);
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "reporting-service" }));

app.get("/api/v1/reporting/finance/overview", async (req, res, next) => {
  try {
    const tenantCode = String(req.query.tenant_code || "ENT001");

    const revenue = await q(
      `SELECT COALESCE(SUM(amount),0) AS value
       FROM gym_payments p
       JOIN gym_subscriptions s ON s.id=p.subscription_id
       WHERE s.code_entreprise=$1 AND p.status='success'`,
      [tenantCode]
    );

    const failed = await q(
      `SELECT COUNT(*)::int AS value
       FROM gym_payments p
       JOIN gym_subscriptions s ON s.id=p.subscription_id
       WHERE s.code_entreprise=$1 AND p.status IN ('failed','insufficient_funds')`,
      [tenantCode]
    );

    const active = await q(
      `SELECT COUNT(*)::int AS value
       FROM gym_subscriptions
       WHERE code_entreprise=$1 AND workflow_status='processed'`,
      [tenantCode]
    );

    res.json({
      tenant_code: tenantCode,
      revenue: Number(revenue.rows[0]?.value || 0),
      failed_payments: Number(failed.rows[0]?.value || 0),
      active_subscriptions: Number(active.rows[0]?.value || 0),
    });
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error("[reporting-service]", err);
  res.status(err.status || 500).json({ error: err.message || "Internal error", code: err.code || null });
});

const port = Number(process.env.REPORTING_PORT || 5005);
app.listen(port, () => console.log(`Reporting service running on ${port}`));
