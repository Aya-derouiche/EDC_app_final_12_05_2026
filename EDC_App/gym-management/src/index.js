const express = require("express");
const cors = require("cors");
const config = require("./config");
const gymRoutes = require("./routes/gymRoutes");

const app = express();

function corsOrigin(origin, callback) {
  if (config.corsOrigin === "*") return callback(null, true);
  if (!origin) return callback(null, true);

  const allowedOrigins = String(config.corsOrigin)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return callback(null, allowedOrigins.includes(origin));
}

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'gym-management' }));
app.use('/api/v1/gym', gymRoutes);

app.use((err, _req, res, _next) => {
  console.error('[gym-management error]', err);

  if (err?.code === '23505') {
    return res.status(409).json({
      error: 'Enregistrement deja existant (cle unique).',
      code: err.code,
      detail: err.detail || null,
    });
  }

  if (err?.code === '23503') {
    return res.status(400).json({
      error: 'Reference invalide (foreign key).',
      code: err.code,
      detail: err.detail || null,
    });
  }

  if (err?.code === '22P02') {
    return res.status(400).json({
      error: 'Format de donnee invalide.',
      code: err.code,
      detail: err.detail || null,
    });
  }

  const code = err.status || 500;
  return res.status(code).json({
    error: err.message || 'Internal error',
    code: err.code || null,
    detail: err.detail || null,
  });
});

app.listen(config.port, () => {
  console.log(`Gym Management service running on ${config.port}`);
  if (typeof gymRoutes.warmup === "function") {
    gymRoutes.warmup().catch((err) => {
      console.warn("[gym-management warmup skipped]", err?.message || err);
    });
  }
});
