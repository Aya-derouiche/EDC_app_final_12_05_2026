const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool(config.db);
const schema = config.dbSchema;

const query = async (text, params = []) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO ${schema}, public`);
    const result = await client.query(text, params);
    await client.query("COMMIT");
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
