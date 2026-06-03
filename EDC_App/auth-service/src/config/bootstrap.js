const { query } = require("../config/db");

async function ensureAuthTables() {
  await query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS gym_branch_id BIGINT`);

  await query(`
    CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      refresh_token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS auth_user_module_access (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      module_key VARCHAR(60) NOT NULL,
      is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, module_key)
    )
  `);
}

module.exports = { ensureAuthTables };
