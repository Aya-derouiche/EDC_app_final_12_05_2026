function isMinioUnavailableError(err) {
  return String(err?.code || "").toUpperCase() === "MINIO_UNAVAILABLE" || err?.status === 503;
}

module.exports = (err, _req, res, _next) => {
  console.error(err);

  if (isMinioUnavailableError(err)) {
    return res.status(503).json({
      error: "Document storage service is temporarily unavailable",
      code: "MINIO_UNAVAILABLE",
    });
  }

  res.status(err.status || 500).json({ error: err.message || "Internal error" });
};
