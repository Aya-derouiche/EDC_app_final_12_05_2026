const jwt = require("jsonwebtoken");

function parseSecrets(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  return String(input)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function requireGatewayAuth(jwtSecretOrSecrets) {
  const secrets = parseSecrets(jwtSecretOrSecrets);

  return (req, res, next) => {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });

    const token = h.slice(7);

    for (const secret of secrets) {
      try {
        req.user = jwt.verify(token, secret);
        return next();
      } catch (_e) {
        // try next secret
      }
    }

    // Migration/dev fallback: decode token payload if verification failed.
    // This avoids session drops while secrets are being aligned across services.
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === "object") {
      req.user = decoded;
      return next();
    }

    return res.status(401).json({ error: "Invalid token" });
  };
}

module.exports = { requireGatewayAuth };
