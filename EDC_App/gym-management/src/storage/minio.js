const crypto = require("crypto");
const path = require("path");
const Minio = require("minio");

const bucket = process.env.MINIO_BUCKET || "edc-documents";
let minioClient = null;

function readMinioEndpoint() {
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
  };
}

function getMinioClient() {
  if (!minioClient) {
    const endpoint = readMinioEndpoint();
    minioClient = new Minio.Client({
      endPoint: endpoint.endPoint,
      port: endpoint.port,
      useSSL: endpoint.useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
      region: process.env.MINIO_REGION || undefined,
    });
  }

  return minioClient;
}

function safeName(name = "file") {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isMinioUnavailableError(error) {
  const code = String(error?.code || error?.name || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "MINIO_UNAVAILABLE" ||
    [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "EHOSTUNREACH",
      "ENETUNREACH",
      "EAI_AGAIN",
      "ENOTFOUND",
      "ESOCKETTIMEDOUT",
    ].includes(code) ||
    message.includes("connect") ||
    message.includes("timeout") ||
    message.includes("socket hang up") ||
    message.includes("network")
  );
}

function storageUnavailableError(operation, error) {
  const wrapped = new Error("Document storage service is temporarily unavailable");
  wrapped.status = 503;
  wrapped.code = "MINIO_UNAVAILABLE";
  wrapped.detail = `${operation} failed`;
  wrapped.cause = error;
  return wrapped;
}

async function withMinioOperation(operation, handler) {
  const client = getMinioClient();

  try {
    return await handler(client);
  } catch (error) {
    if (isMinioUnavailableError(error)) {
      console.warn(`[minio] ${operation} unavailable:`, error?.message || error);
      throw storageUnavailableError(operation, error);
    }
    throw error;
  }
}

async function ensureBucket(client) {
  const exists = await client.bucketExists(bucket);
  if (!exists) await client.makeBucket(bucket, "");
}

async function uploadGymFile({ tenantCode, category, entityType, entityId, file }) {
  return withMinioOperation("upload file", async (client) => {
    await ensureBucket(client);
    const ext = path.extname(file.originalname || "");
    const objectKey = [
      "gym",
      safeName(tenantCode),
      safeName(entityType || "general"),
      entityId || "unlinked",
      `${Date.now()}-${crypto.randomUUID()}-${safeName(file.originalname || `upload${ext}`)}`,
    ].join("/");

    await client.putObject(bucket, objectKey, file.buffer, file.size, {
      "Content-Type": file.mimetype || "application/octet-stream",
      "x-amz-meta-category": safeName(category || "document"),
    });

    return { bucket, objectKey };
  });
}

async function uploadGymBuffer({ tenantCode, category, entityType, entityId, filename, buffer, mimeType }) {
  return withMinioOperation("upload buffer", async (client) => {
    await ensureBucket(client);
    const objectKey = [
      "gym",
      safeName(tenantCode),
      safeName(entityType || "general"),
      entityId || "unlinked",
      `${Date.now()}-${crypto.randomUUID()}-${safeName(filename || "file")}`,
    ].join("/");

    await client.putObject(bucket, objectKey, buffer, buffer.length, {
      "Content-Type": mimeType || "application/octet-stream",
      "x-amz-meta-category": safeName(category || "document"),
    });

    return { bucket, objectKey };
  });
}

async function objectStream(objectKey) {
  return withMinioOperation("download object", async (client) => client.getObject(bucket, objectKey));
}

async function presignedUrl(objectKey) {
  return withMinioOperation("presigned url", async (client) =>
    client.presignedGetObject(bucket, objectKey, 7 * 24 * 60 * 60)
  );
}

async function removeObject(objectKey) {
  return withMinioOperation("delete object", async (client) => client.removeObject(bucket, objectKey));
}

module.exports = {
  bucket,
  getMinioClient,
  isMinioUnavailableError,
  uploadGymFile,
  uploadGymBuffer,
  objectStream,
  presignedUrl,
  removeObject,
};
