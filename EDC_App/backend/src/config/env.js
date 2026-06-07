require("dotenv").config();

function readBool(value) {
  return ["1", "true", "yes", "require"].includes(String(value || "").toLowerCase());
}

function readSchema(value, fallback) {
  const schema = String(value || fallback).trim();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema) ? schema : fallback;
}

function minioConfig() {
  const rawEndpoint = String(process.env.MINIO_ENDPOINT || "localhost").trim();
  let parsedUrl = null;

  try {
    parsedUrl = rawEndpoint.includes("://") ? new URL(rawEndpoint) : null;
  } catch (_err) {
    parsedUrl = null;
  }

  const useSSL = process.env.MINIO_USE_SSL
    ? process.env.MINIO_USE_SSL === "true"
    : parsedUrl?.protocol === "https:";

  return {
    endPoint: parsedUrl?.hostname || rawEndpoint.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
    port: Number(process.env.MINIO_PORT || parsedUrl?.port || (useSSL ? 443 : 9000)),
    useSSL,
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    bucket: process.env.MINIO_BUCKET || "edc-documents",
    region: process.env.MINIO_REGION || undefined,
  };
}

function databaseConfig() {
  const schema = readSchema(process.env.DATABASE_SCHEMA, "cloud");
  const ssl = readBool(process.env.DATABASE_SSL || process.env.PGSSLMODE)
    ? { rejectUnauthorized: false }
    : undefined;

  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl,
    };
  }

  return {
    host: process.env.DATABASE_HOST || "127.0.0.1",
    user: process.env.DATABASE_USER || "postgres",
    password: process.env.DATABASE_PASSWORD || "postgres",
    database: process.env.DATABASE_NAME || "cloud",
    port: Number(process.env.DATABASE_PORT || 5432),
    ssl,
  };
}

module.exports = {
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  dbSchema: readSchema(process.env.DATABASE_SCHEMA, "cloud"),
  db: databaseConfig(),
  minio: minioConfig(),
  extraction: {
    apiUrl: process.env.EXTRACTION_API_URL || "",
    apiKey: process.env.EXTRACTION_API_KEY || "",
  },
};
