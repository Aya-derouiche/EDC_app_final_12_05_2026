const { Pool } = require("pg");
const config = require("./config");
const { performance } = require("perf_hooks");

const pool = new Pool(config.db);
const schema = config.dbSchema;
const slowQueryThresholdMs = Number(process.env.GYM_SLOW_QUERY_MS || 250);

const query = async (text, params = []) => {
  const client = await pool.connect();
  const startedAt = performance.now();

  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO ${schema}, public`);
    const result = await client.query(text, params);
    await client.query("COMMIT");
    const durationMs = performance.now() - startedAt;
    if (durationMs >= slowQueryThresholdMs) {
      const preview = String(text || "").replace(/\s+/g, " ").trim().slice(0, 220);
      console.warn(`[gym-slow-query] ${durationMs.toFixed(1)}ms | ${preview}`);
    }
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_rollbackErr) {}
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query };
