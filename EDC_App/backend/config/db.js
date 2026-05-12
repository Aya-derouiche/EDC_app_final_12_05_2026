const { Pool } = require("pg");

const db = new Pool({
  host: process.env.DATABASE_HOST || "127.0.0.1",
  user: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "aya",
  database: process.env.DATABASE_NAME || "cloud",
  port: Number(process.env.DATABASE_PORT || 5432),
  max: 10,
});

db.connect((err, client, release) => {
  if (err) {
    console.error("PostgreSQL connection error:", err);
    return;
  }
  console.log("Connected to PostgreSQL");
  release();
});

// PostgreSQL query helper (behaves like mysql callback style)
const dbQuery = (sql, params = [], callback) => {
  // Support both signatures: dbQuery(sql, callback) and dbQuery(sql, params, callback)
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
