// backend/config/minio.js
const Minio = require('minio');

function readMinioEndpoint() {
  const rawEndpoint = String(process.env.MINIO_ENDPOINT || 'localhost').trim();
  let parsedUrl = null;

  try {
    parsedUrl = rawEndpoint.includes('://') ? new URL(rawEndpoint) : null;
  } catch (_err) {
    parsedUrl = null;
  }

  const useSSL = process.env.MINIO_USE_SSL
    ? process.env.MINIO_USE_SSL === 'true'
    : parsedUrl?.protocol === 'https:';

  return {
    endPoint: parsedUrl?.hostname || rawEndpoint.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
    port: parseInt(process.env.MINIO_PORT || parsedUrl?.port, 10) || (useSSL ? 443 : 9000),
    useSSL,
  };
}

const endpoint = readMinioEndpoint();

const minioClient = new Minio.Client({
  endPoint: endpoint.endPoint,
  port: endpoint.port,
  useSSL: endpoint.useSSL,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  region: process.env.MINIO_REGION || undefined,
});

const MINIO_BUCKET = process.env.MINIO_BUCKET || 'edc-documents';

module.exports = { minioClient, MINIO_BUCKET };
