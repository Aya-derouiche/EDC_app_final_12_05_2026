const router = require("express").Router();
const { query } = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");

const MODULE_CATALOG = [
  { key: "core", name: "Core ERP", description: "Users, roles, auth, tenant basics" },
  { key: "documents", name: "Documents", description: "Document workflows (compta/direction)" },
  { key: "accounting", name: "Accounting", description: "Accounting entries and finance workflows" },
  { key: "gym", name: "Gym Management", description: "Gyms, memberships, classes, trainers" },
];

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS tenant_modules (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) NOT NULL,
      module_key VARCHAR(80) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (code_entreprise, module_key)
    )
  `);
}

function getTenantCode(req) {
  return (
    req.user?.code_entreprise ||
    req.user?.entrepriseId ||
    req.user?.entreprise_id ||
    req.headers["x-tenant-code"] ||
    req.query?.code_entreprise ||
    null
  );
}

router.get("/catalog", requireAuth, async (_req, res, next) => {
  try {
    res.json(MODULE_CATALOG);
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    await ensureTable();

    const codeEntreprise = getTenantCode(req);
    if (!codeEntreprise) return res.status(400).json({ error: "Tenant code missing" });

    const r = await query(
      `SELECT module_key, enabled, updated_at
       FROM tenant_modules
       WHERE code_entreprise = $1
       ORDER BY module_key`,
      [String(codeEntreprise)]
    );

    // bootstrap default modules if empty
    if (!r.rows.length) {
      const defaults = ["core", "documents", "accounting"];
      for (const mk of defaults) {
        await query(
          `INSERT INTO tenant_modules (code_entreprise, module_key, enabled)
           VALUES ($1,$2,TRUE)
           ON CONFLICT (code_entreprise, module_key)
           DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
          [String(codeEntreprise), mk]
        );
      }

      const r2 = await query(
        `SELECT module_key, enabled, updated_at
         FROM tenant_modules
         WHERE code_entreprise = $1
         ORDER BY module_key`,
        [String(codeEntreprise)]
      );

      return res.json({ code_entreprise: String(codeEntreprise), modules: r2.rows });
    }

    return res.json({ code_entreprise: String(codeEntreprise), modules: r.rows });
  } catch (e) {
    next(e);
  }
});

router.get("/tenant/:codeEntreprise", requireAuth, requireRole("admin", "comptable"), async (req, res, next) => {
  try {
    await ensureTable();
    const codeEntreprise = String(req.params.codeEntreprise || "").trim();
    if (!codeEntreprise) return res.status(400).json({ error: "Invalid code_entreprise" });

    const r = await query(
      `SELECT module_key, enabled, updated_at
       FROM tenant_modules
       WHERE code_entreprise = $1
       ORDER BY module_key`,
      [codeEntreprise]
    );

    res.json({ code_entreprise: codeEntreprise, modules: r.rows });
  } catch (e) {
    next(e);
  }
});

router.put("/tenant/:codeEntreprise", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await ensureTable();
    const codeEntreprise = String(req.params.codeEntreprise || "").trim();
    if (!codeEntreprise) return res.status(400).json({ error: "Invalid code_entreprise" });

    const modules = Array.isArray(req.body?.modules) ? req.body.modules : null;
    if (!modules) return res.status(400).json({ error: "modules[] is required" });

    const validKeys = new Set(MODULE_CATALOG.map((m) => m.key));
    for (const m of modules) {
      if (!m || !validKeys.has(String(m.module_key || ""))) {
        return res.status(400).json({ error: `Invalid module_key: ${m?.module_key}` });
      }
    }

    for (const m of modules) {
      await query(
        `INSERT INTO tenant_modules (code_entreprise, module_key, enabled)
         VALUES ($1,$2,$3)
         ON CONFLICT (code_entreprise, module_key)
         DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
        [codeEntreprise, String(m.module_key), Boolean(m.enabled)]
      );
    }

    const r = await query(
      `SELECT module_key, enabled, updated_at
       FROM tenant_modules
       WHERE code_entreprise = $1
       ORDER BY module_key`,
      [codeEntreprise]
    );

    res.json({ message: "Tenant modules updated", code_entreprise: codeEntreprise, modules: r.rows });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
