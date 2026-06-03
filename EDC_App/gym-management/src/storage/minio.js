const crypto = require("crypto");
const path = require("path");
const Minio = require("minio");

const bucket = process.env.MINIO_BUCKET || "edc-documents";

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

function safeName(name = "file") {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureBucket() {
  const exists = await minioClient.bucketExists(bucket);
  if (!exists) await minioClient.makeBucket(bucket, "");
}

async function uploadGymFile({ tenantCode, category, entityType, entityId, file }) {
  await ensureBucket();
  const ext = path.extname(file.originalname || "");
  const objectKey = [
    "gym",
    safeName(tenantCode),
    safeName(entityType || "general"),
    entityId || "unlinked",
    `${Date.now()}-${crypto.randomUUID()}-${safeName(file.originalname || `upload${ext}`)}`,
  ].join("/");

  await minioClient.putObject(bucket, objectKey, file.buffer, file.size, {
    "Content-Type": file.mimetype || "application/octet-stream",
    "x-amz-meta-category": safeName(category || "document"),
  });

  return { bucket, objectKey };
}

async function uploadGymBuffer({ tenantCode, category, entityType, entityId, filename, buffer, mimeType }) {
  await ensureBucket();
  const objectKey = [
    "gym",
    safeName(tenantCode),
    safeName(entityType || "general"),
    entityId || "unlinked",
    `${Date.now()}-${crypto.randomUUID()}-${safeName(filename || "file")}`,
  ].join("/");

  await minioClient.putObject(bucket, objectKey, buffer, buffer.length, {
    "Content-Type": mimeType || "application/octet-stream",
    "x-amz-meta-category": safeName(category || "document"),
  });

  return { bucket, objectKey };
}

async function objectStream(objectKey) {
  return minioClient.getObject(bucket, objectKey);
}

async function presignedUrl(objectKey) {
  return minioClient.presignedGetObject(bucket, objectKey, 7 * 24 * 60 * 60);
}

module.exports = { bucket, minioClient, uploadGymFile, uploadGymBuffer, objectStream, presignedUrl };
