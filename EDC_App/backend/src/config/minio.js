const Minio = require("minio");
const env = require("./env");
let minioClientInstance = null;

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

function isMinioUnavailableError(error) {
  const code = String(error?.code || error?.name || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return (
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

function getMinioClient() {
  if (!minioClientInstance) {
    minioClientInstance = new Minio.Client({
      endPoint: normalizeEndpoint(env.minio.endPoint),
      port: env.minio.port,
      useSSL: env.minio.useSSL,
      accessKey: env.minio.accessKey,
      secretKey: env.minio.secretKey,
      region: env.minio.region,
    });
  }

  return minioClientInstance;
}

async function ensureBucket() {
  const client = getMinioClient();
  const exists = await client.bucketExists(env.minio.bucket);
  if (!exists) await client.makeBucket(env.minio.bucket, "");
}

const minioClient = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getMinioClient();
      const value = client[prop];
      if (typeof value !== "function") return value;

      return (...args) =>
        Promise.resolve()
          .then(() => value.apply(client, args))
          .catch((error) => {
            if (isMinioUnavailableError(error)) {
              const wrapped = new Error("Document storage service is temporarily unavailable");
              wrapped.status = 503;
              wrapped.code = "MINIO_UNAVAILABLE";
              wrapped.cause = error;
              throw wrapped;
            }
            throw error;
          });
    },
  }
);

module.exports = { getMinioClient, isMinioUnavailableError, minioClient, ensureBucket, bucket: env.minio.bucket };
