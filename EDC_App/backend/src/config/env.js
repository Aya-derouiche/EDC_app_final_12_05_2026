require("dotenv").config();

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
    };
  }

  return {
    host: process.env.DATABASE_HOST || "127.0.0.1",
    user: process.env.DATABASE_USER || "postgres",
    password: process.env.DATABASE_PASSWORD || "postgres",
    database: process.env.DATABASE_NAME || "cloud",
    port: Number(process.env.DATABASE_PORT || 5432),
    ssl,
    options,
  };
}

module.exports = {
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  db: databaseConfig(),
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: Number(process.env.MINIO_PORT || (process.env.MINIO_USE_SSL === "true" ? 443 : 9000)),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    bucket: process.env.MINIO_BUCKET || "edc-documents",
  },
  extraction: {
    apiUrl: process.env.EXTRACTION_API_URL || "",
    apiKey: process.env.EXTRACTION_API_KEY || "",
  },
};
