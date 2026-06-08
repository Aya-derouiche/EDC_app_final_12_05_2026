const jwt = require("jsonwebtoken");
const env = require("../config/env");
function requireAuth(req, res, next) {
  const forwardedUser = req.headers["x-gateway-user"];
  if (forwardedUser) {
    try {
      const decoded = JSON.parse(Buffer.from(String(forwardedUser), "base64").toString("utf8"));
      if (decoded && typeof decoded === "object") {
        req.user = decoded;
        return next();
      }
    } catch (_e) {
      // Continue with Bearer token validation.
    }
  }

  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });
  try { req.user = jwt.verify(h.slice(7), env.jwtSecret); next(); } catch (_e) { res.status(401).json({ error: "Invalid token" }); }
}
function requireRole(...roles) {
  return (req, res, next) => (!req.user || !roles.includes(req.user.role)) ? res.status(403).json({ error: "Forbidden" }) : next();
}
module.exports = { requireAuth, requireRole };
