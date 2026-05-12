const { query } = require("../config/db");

async function requireTenant(req, res, next) {
  try {
    const rawTenant =
      req.user?.entrepriseId ||
      req.user?.entreprise_id ||
      req.headers["x-tenant-id"] ||
      req.headers["x-tenant-code"] ||
      req.query?.code_entreprise;

    if (!rawTenant) return res.status(400).json({ error: "Tenant missing" });

    const asNumber = Number(rawTenant);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      req.tenantId = asNumber;
      return next();
    }

    const code = String(rawTenant).trim();
    const { rows } = await query(
      "SELECT id FROM entreprises WHERE code_entreprise = $1 LIMIT 1",
      [code]
    );

    if (!rows.length) return res.status(400).json({ error: "Invalid tenant" });

    req.tenantId = Number(rows[0].id);
    return next();
  } catch (e) {
    return next(e);
  }
}

module.exports = { requireTenant };
