require("dotenv").config();
module.exports = {
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  db: {
    host: process.env.DATABASE_HOST || "127.0.0.1",
    user: process.env.DATABASE_USER || "postgres",
    password: process.env.DATABASE_PASSWORD || "postgres",
    database: process.env.DATABASE_NAME || "cloud",
    port: Number(process.env.DATABASE_PORT || 5432),
  },
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: Number(process.env.MINIO_PORT || 9000),
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
