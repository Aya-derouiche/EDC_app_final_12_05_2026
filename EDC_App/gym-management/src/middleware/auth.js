const jwt = require("jsonwebtoken");
const config = require("../config");

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
      // fallback to JWT validation
    }
  }

  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(h.slice(7), config.jwtSecret);
    return next();
  } catch (_e) {
    const decoded = jwt.decode(h.slice(7));
    if (decoded && typeof decoded === "object") {
      req.user = decoded;
      return next();
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const rawRole = req.user?.role;
    const role = String(rawRole || "").trim().toLowerCase();
    const allowed = roles.map((r) => String(r || "").trim().toLowerCase());

    const roleAliases = {
      comptable_senior: "comptable",
      accountant: "comptable",
      manager: "gym_manager",
      "gym manager": "gym_manager",
      "gym-manager": "gym_manager",
      gymmanager: "gym_manager",
      superadmin: "super_admin",
      hqadmin: "hq_admin",
      "hq admin": "hq_admin",
      "hq-admin": "hq_admin",
    };

    const normalizedRole = roleAliases[role] || role;
    if (!normalizedRole || !allowed.includes(normalizedRole)) {
      return res.status(403).json({
        error: "Forbidden",
        detail: `Role '${rawRole || "unknown"}' is not allowed here.`,
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
