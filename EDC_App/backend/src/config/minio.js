const Minio = require("minio");
const env = require("./env");

function normalizeEndpoint(endpoint) {
  const rawEndpoint = String(endpoint || "localhost").trim();

  try {
    if (rawEndpoint.includes("://")) {
      return new URL(rawEndpoint).hostname;
    }
  } catch (_err) {
    return rawEndpoint.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }

  return rawEndpoint.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

const minioClient = new Minio.Client({
  endPoint: normalizeEndpoint(env.minio.endPoint),
  port: env.minio.port,
  useSSL: env.minio.useSSL,
  accessKey: env.minio.accessKey,
  secretKey: env.minio.secretKey,
});

async function ensureBucket() {
  const exists = await minioClient.bucketExists(env.minio.bucket);
  if (!exists) await minioClient.makeBucket(env.minio.bucket, "");
}

module.exports = { minioClient, ensureBucket, bucket: env.minio.bucket };
