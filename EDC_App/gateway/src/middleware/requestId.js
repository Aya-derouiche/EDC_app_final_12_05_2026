const crypto = require("crypto");

function requestId(req, res, next) {
  const existing = req.header("x-request-id");
  const id = existing && String(existing).trim() ? String(existing).trim() : crypto.randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}

module.exports = { requestId };
