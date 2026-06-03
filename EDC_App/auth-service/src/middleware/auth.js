const { verifyToken } = require("../config/jwt");

function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    req.user = verifyToken(h.slice(7));
    return next();
  } catch (_e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { requireAuth };
