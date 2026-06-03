require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));

const pool = new Pool({
  host: process.env.BANK_DB_HOST || process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.BANK_DB_PORT || process.env.DB_PORT || 5432),
  user: process.env.BANK_DB_USER || process.env.DB_USER || "postgres",
  password: process.env.BANK_DB_PASSWORD || process.env.DB_PASSWORD || "aya",
  database: process.env.BANK_DB_NAME || process.env.DB_NAME || "cloud",
});

async function q(text, params = []) {
  return pool.query(text, params);
}

async function ensureBankSchema() {
  await q(`
    CREATE TABLE IF NOT EXISTS bank_batch_files (
      id BIGSERIAL PRIMARY KEY,
      tenant_code VARCHAR(80) NOT NULL,
      bank_code VARCHAR(40) NOT NULL,
      month_ref DATE NOT NULL,
      xml_content TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'generated',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS bank_batch_results (
      id BIGSERIAL PRIMARY KEY,
      batch_file_id BIGINT NOT NULL REFERENCES bank_batch_files(id) ON DELETE CASCADE,
      payment_reference VARCHAR(120),
      result_status VARCHAR(40) NOT NULL,
      failure_reason TEXT,
      processed_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "bank-service" }));

app.post("/api/v1/bank/bootstrap", async (_req, res, next) => {
  try {
    await ensureBankSchema();
    res.json({ message: "Bank schema ready" });
  } catch (e) { next(e); }
});

app.post("/api/v1/bank/batch/generate", async (req, res, next) => {
  try {
    await ensureBankSchema();
    const tenantCode = String(req.body?.tenant_code || "ENT001");
    const bankCode = String(req.body?.bank_code || "BIAT");
    const monthRef = String(req.body?.month_ref || "").trim();
    const payments = Array.isArray(req.body?.payments) ? req.body.payments : [];

    if (!monthRef) return res.status(400).json({ error: "month_ref is required" });

    const rows = payments.map((p) =>
      `  <Payment><Reference>${String(p.reference || "")}</Reference><Account>${String(p.account || "")}</Account><Amount>${Number(p.amount || 0).toFixed(3)}</Amount><DueDate>${String(p.due_date || monthRef)}</DueDate></Payment>`
    ).join("\n");

    const xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<BankBatch tenant=\"${tenantCode}\" bank=\"${bankCode}\" month=\"${monthRef}\">\n${rows}\n</BankBatch>`;
    const fileName = `bank_batch_${bankCode}_${tenantCode}_${monthRef}.xml`;

    const saved = await q(
      `INSERT INTO bank_batch_files (tenant_code, bank_code, month_ref, xml_content, file_name, status)
       VALUES ($1,$2,$3,$4,$5,'generated') RETURNING *`,
      [tenantCode, bankCode, monthRef, xml, fileName]
    );

    res.status(201).json(saved.rows[0]);
  } catch (e) { next(e); }
});

app.post("/api/v1/bank/batch/:id/import-result", async (req, res, next) => {
  try {
    await ensureBankSchema();
    const id = Number(req.params.id);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    for (const item of items) {
      await q(
        `INSERT INTO bank_batch_results (batch_file_id, payment_reference, result_status, failure_reason)
         VALUES ($1,$2,$3,$4)`,
        [id, item.payment_reference || null, item.result_status || "failed", item.failure_reason || null]
      );
    }

    await q(`UPDATE bank_batch_files SET status='result_imported' WHERE id=$1`, [id]);
    res.json({ message: "Bank result imported", count: items.length });
  } catch (e) { next(e); }
});

app.get("/api/v1/bank/batch", async (req, res, next) => {
  try {
    await ensureBankSchema();
    const tenantCode = String(req.query.tenant_code || "ENT001");
    const out = await q(`SELECT * FROM bank_batch_files WHERE tenant_code=$1 ORDER BY id DESC`, [tenantCode]);
    res.json(out.rows);
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error("[bank-service]", err);
  res.status(err.status || 500).json({ error: err.message || "Internal error", code: err.code || null });
});

const port = Number(process.env.BANK_PORT || 5003);
app.listen(port, () => console.log(`Bank service running on ${port}`));
