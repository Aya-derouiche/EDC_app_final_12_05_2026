const { Pool } = require("pg");

function readBool(value) {
  return ["1", "true", "yes", "require"].includes(String(value || "").toLowerCase());
}

function readSchema(value, fallback) {
  const schema = String(value || fallback).trim();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema) ? schema : fallback;
}

function databaseConfig() {
  const schema = readSchema(process.env.DATABASE_SCHEMA, "cloud");
  const ssl = readBool(process.env.DATABASE_SSL || process.env.PGSSLMODE)
    ? { rejectUnauthorized: false }
    : undefined;
  const options = `-c search_path=${schema},public`;

  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl,
      options,
      max: 10,
    };
  }

  return {
    host: process.env.DATABASE_HOST || "127.0.0.1",
    user: process.env.DATABASE_USER || "postgres",
    password: process.env.DATABASE_PASSWORD || "aya",
    database: process.env.DATABASE_NAME || "cloud",
    port: Number(process.env.DATABASE_PORT || 5432),
    ssl,
    options,
    max: 10,
  };
}

const db = new Pool(databaseConfig());

db.connect((err, client, release) => {
  if (err) {
    console.error("PostgreSQL connection error:", err);
    return;
  }
  console.log("Connected to PostgreSQL");
  release();
});

const dbQuery = (sql, params = [], callback) => {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }

  if (typeof callback === "function") {
    db.query(sql, params, (err, result) => {
      if (err) return callback(err, null);
      callback(null, result.rows);
    });
    return;
  }

  return db.query(sql, params).then((result) => result.rows);
};

module.exports = { db, dbQuery };
